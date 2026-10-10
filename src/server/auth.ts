/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side authentication for the V-ERP portal.
 *
 * Security model:
 *  - Credentials live ONLY on the server (`.data/auth-users.json`, hashed with
 *    scrypt). The browser never sees a password, a hash or a session token.
 *  - The session is an opaque random token stored in an httpOnly, SameSite=Strict
 *    cookie; only its SHA-256 digest is kept server-side.
 *  - Every state-changing request must carry the session CSRF token
 *    (double-submit) and a same-origin Origin/Referer.
 *  - Login attempts are rate limited per account and per client address with
 *    escalating lockouts.
 */

import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { Express, NextFunction, Request, Response } from 'express';
import { clientIp, isSecureTransport } from './security.js';
import { DEFAULT_USERS } from '../utils/rbac';
import { getPasswordStrength } from '../utils/password';

export const SESSION_COOKIE = 'erp_session';
const CSRF_HEADER = 'x-csrf-token';

const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes without activity
const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000; // 12 hours maximum
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 60 * 1000;
const LOGIN_LOCK_MAX_MS = 30 * 60 * 1000;

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

const GENERIC_LOGIN_ERROR = 'Tên đăng nhập hoặc mật khẩu không chính xác.';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface StoredUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  status: 'ACTIVE' | 'LOCKED';
  passwordHash: string;
  mustChangePassword: boolean;
  passwordUpdatedAt: string;
  createdAt: string;
  lastLogin: string;
}

/** User payload handed to the browser: never contains credential material. */
export interface PublicUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  status: 'ACTIVE' | 'LOCKED';
  avatarUrl?: string;
  createdAt: string;
  lastLogin: string;
  mustChangePassword: boolean;
}

interface SessionRecord {
  id: string;
  tokenDigest: string;
  csrfToken: string;
  userId: string;
  createdAt: number;
  lastSeen: number;
  expiresAt: number;
}

interface AttemptRecord {
  count: number;
  lockUntil: number;
}

/* ------------------------------------------------------------------ *
 * Password hashing (scrypt, with transparent legacy upgrades)
 * ------------------------------------------------------------------ */

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      keylen,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 },
      (err, derived) => (err ? reject(err) : resolve(derived))
    );
  });
}

export async function hashServerPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(plain, salt, SCRYPT_KEYLEN);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function digestOf(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

/** Length-safe constant-time comparison. */
function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(digestOf(a), digestOf(b));
}

interface VerifyOutcome {
  valid: boolean;
  needsRehash: boolean;
}

async function verifyServerPassword(plain: string, stored: string): Promise<VerifyOutcome> {
  if (typeof stored !== 'string' || stored.length === 0) return { valid: false, needsRehash: false };

  const parts = stored.split('$');

  if (parts[0] === 'scrypt' && parts.length === 6) {
    const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    if (salt.length === 0 || expected.length === 0) return { valid: false, needsRehash: true };
    const derived = await scryptAsync(plain, salt, expected.length);
    const valid = crypto.timingSafeEqual(derived, expected);
    const paramsChanged = Number(nRaw) !== SCRYPT_N || Number(rRaw) !== SCRYPT_R || Number(pRaw) !== SCRYPT_P;
    return { valid, needsRehash: valid && paramsChanged };
  }

  // Legacy client-side PBKDF2 hash: accepted, then upgraded to scrypt.
  if (parts[0] === 'pbkdf2-sha256' && parts.length === 4) {
    const [, iterationsRaw, saltHex, hashHex] = parts;
    const iterations = Number(iterationsRaw);
    if (!Number.isFinite(iterations) || iterations <= 0) return { valid: false, needsRehash: true };
    const derived = crypto.pbkdf2Sync(plain, Buffer.from(saltHex, 'hex'), iterations, 32, 'sha256');
    return { valid: safeEqual(derived.toString('hex'), hashHex.toLowerCase()), needsRehash: true };
  }

  // Legacy plain-text value: accepted only to migrate, then replaced.
  return { valid: safeEqual(plain, stored), needsRehash: true };
}

export function generateTemporaryPassword(length = 12): string {
  const size = Math.max(12, length);
  const symbols = '!@#$%&*?';
  const groups = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', symbols];
  const all = groups.join('');
  const chars: string[] = [];
  for (const group of groups) {
    chars.push(group[crypto.randomInt(group.length)]);
  }
  while (chars.length < size) {
    chars.push(all[crypto.randomInt(all.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/* ------------------------------------------------------------------ *
 * Credential store (server-side, file backed)
 * ------------------------------------------------------------------ */

export class AuthStore {
  private filePath: string;
  private users: StoredUser[] = [];
  private loaded = false;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(baseDir: string) {
    this.filePath = path.join(baseDir, '.data', 'auth-users.json');
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fsp.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.users = Array.isArray(parsed?.users) ? (parsed.users as StoredUser[]) : [];
    } catch {
      this.users = [];
    }
    this.loaded = true;

    if (this.users.length === 0) {
      await this.seedBootstrapAdmin();
    }
  }

  private async seedBootstrapAdmin(): Promise<void> {
    const now = new Date().toISOString();
    const seeded: StoredUser[] = [];
    for (const template of DEFAULT_USERS) {
      seeded.push({
        id: template.id,
        username: template.username,
        fullName: template.fullName,
        email: template.email || '',
        phone: template.phone || '',
        roleId: template.roleId,
        status: 'ACTIVE',
        // Bootstrap credential, hashed immediately and flagged for mandatory change
        passwordHash: await hashServerPassword(template.password || '123'),
        mustChangePassword: true,
        passwordUpdatedAt: now,
        createdAt: template.createdAt || now,
        lastLogin: 'Chưa đăng nhập',
      });
    }
    this.users = seeded;
    await this.persist();
    console.log('[auth] Đã khởi tạo tài khoản quản trị mặc định (bắt buộc đổi mật khẩu ở lần đăng nhập đầu).');
  }

  private async persist(): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.tmp`;
      await fsp.writeFile(tmp, JSON.stringify({ version: 1, users: this.users }, null, 2), 'utf8');
      await fsp.rename(tmp, this.filePath);
    });
    await this.writeChain;
  }

  async list(): Promise<StoredUser[]> {
    await this.load();
    return this.users.map((u) => ({ ...u }));
  }

  async findByUsername(username: string): Promise<StoredUser | null> {
    await this.load();
    const target = (username || '').trim().toLowerCase();
    const found = this.users.find((u) => u.username.trim().toLowerCase() === target);
    return found ? { ...found } : null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    await this.load();
    const found = this.users.find((u) => u.id === id);
    return found ? { ...found } : null;
  }

  private async updateRecord(id: string, patch: Partial<StoredUser>): Promise<StoredUser | null> {
    await this.load();
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...patch };
    await this.persist();
    return { ...this.users[index] };
  }

  setPassword(id: string, passwordHash: string, requireChange: boolean): Promise<StoredUser | null> {
    return this.updateRecord(id, {
      passwordHash,
      mustChangePassword: requireChange,
      passwordUpdatedAt: new Date().toISOString(),
    });
  }

  markLogin(id: string): Promise<StoredUser | null> {
    return this.updateRecord(id, { lastLogin: new Date().toISOString() });
  }

  async create(input: {
    username: string;
    fullName: string;
    email?: string;
    phone?: string;
    roleId: string;
    status?: 'ACTIVE' | 'LOCKED';
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<StoredUser> {
    await this.load();
    const now = new Date().toISOString();
    const record: StoredUser = {
      id: `u-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
      username: input.username.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      email: input.email?.trim() || '',
      phone: input.phone?.trim() || '',
      roleId: input.roleId,
      status: input.status || 'ACTIVE',
      passwordHash: input.passwordHash,
      mustChangePassword: input.mustChangePassword,
      passwordUpdatedAt: now,
      createdAt: now,
      lastLogin: 'Chưa đăng nhập',
    };
    this.users.push(record);
    await this.persist();
    return { ...record };
  }

  async update(
    id: string,
    patch: Partial<Pick<StoredUser, 'fullName' | 'email' | 'phone' | 'roleId' | 'status'>>
  ): Promise<StoredUser | null> {
    return this.updateRecord(id, patch);
  }

  async remove(id: string): Promise<boolean> {
    await this.load();
    const before = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    if (this.users.length === before) return false;
    await this.persist();
    return true;
  }

  /** Drops the credential file and re-seeds the bootstrap admin (full app reset). */
  async reset(): Promise<void> {
    this.users = [];
    this.loaded = true;
    await this.seedBootstrapAdmin();
  }
}

/* ------------------------------------------------------------------ *
 * Session management
 * ------------------------------------------------------------------ */

class SessionManager {
  private sessions = new Map<string, SessionRecord>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sweepTimer = setInterval(() => this.sweep(), 5 * 60 * 1000);
    this.sweepTimer.unref?.();
  }

  private sweep(now = Date.now()) {
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now || now - session.lastSeen > SESSION_IDLE_MS) {
        this.sessions.delete(id);
      }
    }
  }

  create(userId: string): { token: string; session: SessionRecord } {
    this.sweep();
    const token = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      tokenDigest: digestOf(token).toString('hex'),
      csrfToken: crypto.randomBytes(24).toString('base64url'),
      userId,
      createdAt: now,
      lastSeen: now,
      expiresAt: now + SESSION_ABSOLUTE_MS,
    };
    this.sessions.set(session.id, session);
    return { token, session };
  }

  resolve(token: string | undefined): SessionRecord | null {
    if (!token) return null;
    this.sweep();
    const digest = digestOf(token).toString('hex');
    for (const session of this.sessions.values()) {
      if (safeEqual(session.tokenDigest, digest)) {
        if (session.expiresAt <= Date.now()) {
          this.sessions.delete(session.id);
          return null;
        }
        return session;
      }
    }
    return null;
  }

  touch(session: SessionRecord) {
    session.lastSeen = Date.now();
  }

  destroy(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  /** Invalidates every session of a user (used when locking an account). */
  destroyForUser(userId: string) {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) this.sessions.delete(id);
    }
  }

  count(): number {
    return this.sessions.size;
  }
}

/* ------------------------------------------------------------------ *
 * Brute-force protection
 * ------------------------------------------------------------------ */

class LoginThrottle {
  private attempts = new Map<string, AttemptRecord>();

  lockRemaining(key: string): number {
    const entry = this.attempts.get(key);
    if (!entry || entry.lockUntil <= Date.now()) return 0;
    return Math.ceil((entry.lockUntil - Date.now()) / 1000);
  }

  registerFailure(key: string): { locked: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const entry = this.attempts.get(key) || { count: 0, lockUntil: 0 };
    entry.count += 1;
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
      const windowIndex = Math.floor((entry.count - LOGIN_MAX_ATTEMPTS) / LOGIN_MAX_ATTEMPTS);
      entry.lockUntil = now + Math.min(LOGIN_LOCK_MS * 2 ** windowIndex, LOGIN_LOCK_MAX_MS);
      entry.count = 0;
    }
    this.attempts.set(key, entry);
    return {
      locked: entry.lockUntil > now,
      retryAfterSeconds: entry.lockUntil > now ? Math.ceil((entry.lockUntil - now) / 1000) : 0,
    };
  }

  clear(key: string) {
    this.attempts.delete(key);
  }

  clearUser(username: string) {
    this.clear(`user:${username.trim().toLowerCase()}`);
  }
}

/* ------------------------------------------------------------------ *
 * Cookie helpers
 * ------------------------------------------------------------------ */

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    const raw = part.slice(index + 1).trim();
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

function isSecureRequest(req: Request): boolean {
  return isSecureTransport(req);
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_IDLE_MS / 1000)}`,
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response) {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (isSecureRequest(req)) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function clientAddress(req: Request): string {
  // Only the server-side resolver may derive the client address;
  // X-Forwarded-For is honored solely when TRUST_PROXY=true.
  return clientIp(req);
}

/* ------------------------------------------------------------------ *
 * Public helpers
 * ------------------------------------------------------------------ */

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    roleId: user.roleId,
    status: user.status,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin) {
    // Non-browser clients (scripts, same-origin fetch without Origin) rely on the
    // CSRF token header instead, so an absent Origin is not fatal here.
    return true;
  }
  try {
    const url = new URL(origin);
    if (host) return url.host === host;
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Route registration
 * ------------------------------------------------------------------ */

export interface AuthRuntime {
  store: AuthStore;
  sessions: SessionManager;
  throttle: LoginThrottle;
  /** True when the browser must authenticate through the server. */
  enabled: boolean;
}

let runtime: AuthRuntime | null = null;

export function getAuthRuntime(): AuthRuntime | null {
  return runtime;
}

export function registerAuthRoutes(app: Express, baseDir: string) {
  const store = new AuthStore(baseDir);
  const sessions = new SessionManager();
  const throttle = new LoginThrottle();
  runtime = { store, sessions, throttle, enabled: true };

  const attachSession = (req: Request, _res: Response, next: NextFunction) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const session = sessions.resolve(token);
    if (session) {
      sessions.touch(session);
      (req as Request & { authSession?: SessionRecord; authUser?: StoredUser }).authSession = session;
    }
    next();
  };

  const requireSession = async (req: Request, res: Response, next: NextFunction) => {
    const session = (req as Request & { authSession?: SessionRecord }).authSession;
    if (!session) {
      return res.status(401).json({ authenticated: false, error: 'Phiên làm việc không hợp lệ hoặc đã hết hạn.' });
    }
    const user = await store.findById(session.userId);
    if (!user || user.status === 'LOCKED') {
      sessions.destroy(session.id);
      clearSessionCookie(req, res);
      return res.status(401).json({ authenticated: false, error: 'Tài khoản không còn quyền truy cập.' });
    }
    (req as Request & { authUser?: StoredUser }).authUser = user;
    next();
  };

  const requireCsrf = (req: Request, res: Response, next: NextFunction) => {
    if (!sameOrigin(req)) {
      return res.status(403).json({ success: false, error: 'Nguồn yêu cầu không hợp lệ.' });
    }
    const session = (req as Request & { authSession?: SessionRecord }).authSession;
    const provided = String(req.headers[CSRF_HEADER] || '');
    if (!session || !provided || !safeEqual(session.csrfToken, provided)) {
      return res.status(403).json({ success: false, error: 'Thiếu hoặc sai mã bảo mật CSRF.' });
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { authUser?: StoredUser }).authUser;
    // Role-based only: a username must never grant administrative rights.
    if (String(user?.roleId || '').toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên được phép quản lý tài khoản.' });
    }
    next();
  };

  // --- Capability probe (lets the SPA fall back to local auth when absent) ---
  app.get('/api/auth/config', async (_req, res) => {
    try {
      await store.list();
      res.json({
        success: true,
        authMode: 'server',
        passwordPolicy: { minLength: 8, recommendedLength: 12 },
        sessionIdleMinutes: Math.floor(SESSION_IDLE_MS / 60000),
        sessionAbsoluteHours: Math.floor(SESSION_ABSOLUTE_MS / 3600000),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Auth store unavailable' });
    }
  });

  // --- Session bootstrap ---
  app.get('/api/auth/session', attachSession, async (req, res) => {
    const session = (req as Request & { authSession?: SessionRecord }).authSession;
    if (!session) {
      return res.status(401).json({ authenticated: false });
    }
    const user = await store.findById(session.userId);
    if (!user || user.status === 'LOCKED') {
      sessions.destroy(session.id);
      clearSessionCookie(req, res);
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, user: toPublicUser(user), csrfToken: session.csrfToken });
  });

  // --- Login ---
  app.post('/api/auth/login', attachSession, async (req, res) => {
    if (!sameOrigin(req)) {
      return res.status(403).json({ success: false, message: 'Nguồn yêu cầu không hợp lệ.' });
    }

    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({ success: false, message: GENERIC_LOGIN_ERROR });
    }

    const throttleKeys = [`user:${username.toLowerCase()}`, `ip:${clientAddress(req)}`];
    for (const key of throttleKeys) {
      const remaining = throttle.lockRemaining(key);
      if (remaining > 0) {
        return res.status(429).json({
          success: false,
          locked: true,
          message: `Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${remaining} giây.`,
        });
      }
    }

    const user = await store.findByUsername(username);
    if (!user) {
      // Spend comparable time on unknown accounts to avoid user enumeration.
      await verifyServerPassword(password, 'scrypt$16384$8$1$00$00');
      for (const key of throttleKeys) throttle.registerFailure(key);
      return res.status(401).json({ success: false, message: GENERIC_LOGIN_ERROR });
    }

    const outcome = await verifyServerPassword(password, user.passwordHash);
    if (!outcome.valid) {
      let lockedMessage: string | null = null;
      for (const key of throttleKeys) {
        const result = throttle.registerFailure(key);
        if (result.locked) {
          lockedMessage = `Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${result.retryAfterSeconds} giây.`;
        }
      }
      if (lockedMessage) {
        return res.status(429).json({ success: false, locked: true, message: lockedMessage });
      }
      return res.status(401).json({ success: false, message: GENERIC_LOGIN_ERROR });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.',
      });
    }

    for (const key of throttleKeys) throttle.clear(key);

    // Upgrade weak/legacy verifiers opportunistically
    if (outcome.needsRehash) {
      await store.setPassword(user.id, await hashServerPassword(password), user.mustChangePassword);
    }
    const updated = (await store.markLogin(user.id)) || user;

    const { token, session } = sessions.create(user.id);
    setSessionCookie(req, res, token);
    res.json({
      success: true,
      user: toPublicUser(updated),
      csrfToken: session.csrfToken,
      mustChangePassword: Boolean(updated.mustChangePassword),
    });
  });

  // --- Logout ---
  app.post('/api/auth/logout', attachSession, requireCsrf, (req, res) => {
    const session = (req as Request & { authSession?: SessionRecord }).authSession;
    if (session) sessions.destroy(session.id);
    clearSessionCookie(req, res);
    res.json({ success: true });
  });

  // --- Change own password ---
  app.post('/api/auth/change-password', attachSession, requireSession, requireCsrf, async (req, res) => {
    const user = (req as Request & { authUser?: StoredUser }).authUser;
    const session = (req as Request & { authSession?: SessionRecord }).authSession;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword ?? newPassword);

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại.' });
    }
    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu mới.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Xác nhận mật khẩu không khớp.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' });
    }

    const strength = getPasswordStrength(newPassword, { username: user.username, fullName: user.fullName });
    if (!strength.ok) {
      return res.status(400).json({ success: false, message: strength.issues[0], issues: strength.issues });
    }

    const outcome = await verifyServerPassword(currentPassword, user.passwordHash);
    if (!outcome.valid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }

    await store.setPassword(user.id, await hashServerPassword(newPassword), false);
    await store.markLogin(user.id);

    // Rotate the session so a stolen cookie cannot outlive the password change.
    sessions.destroy(session.id);
    const { token, session: fresh } = sessions.create(user.id);
    setSessionCookie(req, res, token);

    res.json({ success: true, csrfToken: fresh.csrfToken, mustChangePassword: false });
  });

  // --- Admin: list users ---
  app.get('/api/auth/users', attachSession, requireSession, requireAdmin, async (_req, res) => {
    const users = await store.list();
    res.json({ success: true, users: users.map(toPublicUser) });
  });

  // --- Admin: create user ---
  app.post('/api/auth/users', attachSession, requireSession, requireCsrf, requireAdmin, async (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const fullName = String(req.body?.fullName || '').trim();
    const roleId = String(req.body?.roleId || 'WAREHOUSE');
    const password = String(req.body?.password || '') || generateTemporaryPassword();

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập phải dài 3-32 ký tự, chỉ gồm chữ thường, số và các ký tự . _ -',
      });
    }
    if (!fullName) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ và tên.' });
    }
    if (await store.findByUsername(username)) {
      return res.status(409).json({ success: false, message: 'Tên đăng nhập này đã tồn tại.' });
    }

    const strength = getPasswordStrength(password, { username, fullName });
    if (!strength.ok) {
      return res.status(400).json({ success: false, message: strength.issues[0], issues: strength.issues });
    }

    const created = await store.create({
      username,
      fullName,
      email: String(req.body?.email || ''),
      phone: String(req.body?.phone || ''),
      roleId,
      status: req.body?.status === 'LOCKED' ? 'LOCKED' : 'ACTIVE',
      passwordHash: await hashServerPassword(password),
      mustChangePassword: true,
    });

    res.json({ success: true, user: toPublicUser(created) });
  });

  // --- Admin: update profile / role / status ---
  app.put('/api/auth/users/:id', attachSession, requireSession, requireCsrf, requireAdmin, async (req, res) => {
    const actor = (req as Request & { authUser?: StoredUser }).authUser;
    const target = await store.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    const status = req.body?.status === 'LOCKED' ? 'LOCKED' : req.body?.status === 'ACTIVE' ? 'ACTIVE' : target.status;
    const activeAdmins = (await store.list()).filter(
      (u) => u.roleId === 'ADMIN' && u.status === 'ACTIVE'
    );
    if (target.roleId === 'ADMIN' && (status === 'LOCKED' || req.body?.roleId !== 'ADMIN')) {
      if (activeAdmins.length <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Không thể hạ quyền hoặc khóa tài khoản Admin duy nhất đang hoạt động.',
        });
      }
    }

    const updated = await store.update(target.id, {
      fullName: req.body?.fullName !== undefined ? String(req.body.fullName).trim() : target.fullName,
      email: req.body?.email !== undefined ? String(req.body.email).trim() : target.email,
      phone: req.body?.phone !== undefined ? String(req.body.phone).trim() : target.phone,
      roleId: req.body?.roleId !== undefined ? String(req.body.roleId) : target.roleId,
      status,
    });

    // Locking or changing role must invalidate the target's live sessions.
    if (status === 'LOCKED') sessions.destroyForUser(target.id);

    if (updated && updated.id === actor.id) {
      // Self role downgrade: end this session so privileges are re-evaluated.
      const selfSession = (req as Request & { authSession?: SessionRecord }).authSession;
      if (selfSession && updated.roleId !== 'ADMIN') sessions.destroy(selfSession.id);
    }

    res.json({ success: true, user: updated ? toPublicUser(updated) : null });
  });

  // --- Admin: reset password ---
  app.post('/api/auth/users/:id/reset-password', attachSession, requireSession, requireCsrf, requireAdmin, async (req, res) => {
    const target = await store.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    const provided = String(req.body?.password || '');
    let password = provided;
    if (password) {
      const strength = getPasswordStrength(password, { username: target.username, fullName: target.fullName });
      if (!strength.ok) {
        return res.status(400).json({ success: false, message: strength.issues[0], issues: strength.issues });
      }
    } else {
      password = generateTemporaryPassword();
    }

    await store.setPassword(target.id, await hashServerPassword(password), true);
    // Every existing session of that account is invalidated after a reset.
    sessions.destroyForUser(target.id);

    res.json({ success: true, temporaryPassword: password, mustChangePassword: true });
  });

  // --- Admin: delete user ---
  app.delete('/api/auth/users/:id', attachSession, requireSession, requireCsrf, requireAdmin, async (req, res) => {
    const actor = (req as Request & { authUser?: StoredUser }).authUser;
    if (req.params.id === actor?.id) {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản đang đăng nhập.' });
    }
    const target = await store.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }
    if (target.roleId === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên.' });
    }
    await store.remove(target.id);
    sessions.destroyForUser(target.id);
    res.json({ success: true });
  });

  return {
    attachSession,
    requireSession,
    /** Protect every data endpoint that must never be reachable anonymously.
     *  String mount paths are required: raw RegExp paths bypass Express's
     *  path-separator boundary check in trim_prefix and get silently skipped.
     *  Mutating methods additionally require a valid CSRF token — the client
     *  (authFetch) already sends one for every non-GET/HEAD request. */
    protectDataRoutes: (expressApp: Express, ...matchers: Array<string | RegExp>) => {
      const csrfForMutations = (req: Request, res: Response, next: NextFunction) => {
        const method = req.method.toUpperCase();
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
          next();
          return;
        }
        requireCsrf(req, res, next);
      };
      for (const matcher of matchers) {
        expressApp.use(matcher, attachSession, requireSession, csrfForMutations);
      }
    },
    runtime,
  };
}