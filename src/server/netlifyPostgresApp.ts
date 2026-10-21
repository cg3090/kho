/**
 * Netlify PostgreSQL API.
 * No D1/SQLite fallback. Unsupported writes fail closed with 501.
 */
import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { createSession, verifySession } from './security/session';
import { verifyPassword } from '../utils/password';
import { loadFullStateViaPrisma } from '../db/prismaClient';
import { createPostgresPayment } from './services/postgresPaymentService';
import { savePostgresCatalog, CatalogValidationError } from './services/postgresCatalogService';

const api = new Hono();
const writesEnabled = () => process.env.ENABLE_POSTGRES_WRITES === 'true';
let prisma: PrismaClient | undefined;

export const database = () => {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    throw new Error('DATABASE_URL or POSTGRES_URL is required on Netlify Functions');
  }
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL || process.env.POSTGRES_URL } },
      log: ['error'],
    });
  }
  return prisma;
};

const safeUser = (u: any) => ({
  id: u.id, username: u.username, fullName: u.fullName,
  email: u.email || '', phone: u.phone || '',
  roleId: u.roleId || '', status: u.status,
  avatarUrl: u.avatarUrl || undefined,
  createdAt: u.createdAt || '', lastLogin: u.lastLogin || '',
  mustChangePassword: Boolean(u.mustChangePassword),
});

api.get('/api/health', (c) => c.json({
  status: 'ok', runtime: 'Netlify PostgreSQL',
  storage: 'Supabase PostgreSQL', mode: 'read-only-business',
  businessMutationsEnabled: writesEnabled(),
}));

// Login is the only public data endpoint; do not ship default credentials.
api.post('/api/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) return c.json({ success: false, error: 'Username and password required' }, 400);
  try {
    const db = database();
    const user = await db.user.findUnique({ where: { username }, include: { role: true } });
    if (!user || user.status !== 'ACTIVE' || !verifyPassword(password, user.password)) {
      return c.json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, 401);
    }
    const token = await createSession(user.id, user.roleId || '', process.env);
    await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date().toISOString() } });
    return c.json({
      success: true, token,
      user: {
        ...safeUser(user),
        role: user.role ? {
          id: user.role.id, name: user.role.name, permissions: user.role.permissions,
        } : undefined,
      },
    });
  } catch (error) {
    console.error('Postgres login failed', error);
    return c.json({ success: false, error: 'Lỗi đăng nhập hoặc cấu hình database' }, 503);
  }
});

api.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  const header = c.req.header('Authorization') || '';
  if (!/^Bearer\\s+/i.test(header)) return c.json({ error: 'Authentication required' }, 401);
  const payload = await verifySession(header.replace(/^Bearer\\s+/i, ''), process.env);
  if (!payload) return c.json({ error: 'Invalid or expired session' }, 401);
  try {
    const user = await database().user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') return c.json({ error: 'Account inactive' }, 403);
    c.set('user', safeUser(user));
    return next();
  } catch (error) {
    console.error('Postgres session validation failed', error);
    return c.json({ error: 'Database unavailable' }, 503);
  }
});

api.get('/api/auth/me', (c) => c.json(c.get('user')));

api.post('/api/auth/logout', (c) => c.json({ success: true }));

api.get('/api/db/status', async (c) => {
  try {
    await database().$queryRaw`SELECT 1`;
    const count = await database().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    return c.json({
      connected: true, success: true, engine: 'supabase',
      driver: 'postgresql', database: 'PostgreSQL',
      tableCount: Number(count[0]?.count || 0),
      businessMutationsEnabled: writesEnabled(),
    });
  } catch (error) {
    console.error('PostgreSQL health check failed', error);
    return c.json({ connected: false, error: 'Database unavailable' }, 503);
  }
});

api.get('/api/db/state', async (c) => {
  try {
    const state = await loadFullStateViaPrisma(database());
    // Password hashes, connection strings and auth secrets must never leak into the browser.
    if (Array.isArray(state.users)) state.users = state.users.map(safeUser);
    const data = JSON.parse(JSON.stringify(state, (key, value) =>
      /^(password|passwordHash|connectionString|DATABASE_URL|POSTGRES_URL|serviceRoleKey)$/i.test(key) ? undefined :
      typeof value === 'bigint' ? value.toString() : value
    ));
    return c.json({ connected: true, success: true, engine: 'supabase', data, ...data });
  } catch (error) {
    console.error('Loading PostgreSQL ERP state failed', error);
    return c.json({ connected: false, error: 'Không thể tải dữ liệu PostgreSQL' }, 503);
  }
});

api.get('/api/roles', async (c) => {
  try {
    const roles = await database().role.findMany();
    return c.json(roles);
  } catch {
    return c.json({ error: 'Database unavailable' }, 503);
  }
});

api.get('/api/users', async (c) => {
  if (c.get('user').roleId !== 'ADMIN') return c.json({ error: 'Administrator required' }, 403);
  try {
    const users = await database().user.findMany();
    return c.json(users.map(safeUser));
  } catch {
    return c.json({ error: 'Database unavailable' }, 503);
  }
});

api.get('/api/users/:id', async (c) => {
  const requester = c.get('user');
  if (requester.roleId !== 'ADMIN' && requester.id !== c.req.param('id')) {
    return c.json({ error: 'Permission denied' }, 403);
  }
  try {
    const user = await database().user.findUnique({ where: { id: c.req.param('id') } });
    return user ? c.json(safeUser(user)) : c.json({ error: 'Not found' }, 404);
  } catch {
    return c.json({ error: 'Database unavailable' }, 503);
  }
});

api.get('/api/webshop/orders', async (c) => {
  try {
    return c.json(await database().webshopOrder.findMany({ include: { items: true }, orderBy: { date: 'desc' } }));
  } catch {
    return c.json({ error: 'Database unavailable' }, 503);
  }
});

api.post('/api/db/collection/:key', async (c) => {
  if (!writesEnabled()) return c.json({ error: 'PostgreSQL writes are disabled by deployment configuration' }, 503);
  if (c.get('user').roleId !== 'ADMIN') return c.json({ error: 'Administrator required' }, 403);
  const body = await c.req.json().catch(() => ({}));
  const value = body.data !== undefined ? body.data : body.value;
  try {
    return c.json(await savePostgresCatalog(database(), c.req.param('key'), value));
  } catch (error) {
    if (error instanceof CatalogValidationError) {
      return c.json({ success: false, error: error.message }, 400);
    }
    console.error('PostgreSQL catalog transaction failed', error);
    return c.json({ success: false, error: 'Catalog transaction failed or conflicted' }, 503);
  }
});

// Accounting payments use a single PostgreSQL transaction and row-level debt lock.
// Keep restricted to ADMIN until granular accounting permissions have been verified.
api.post('/api/payments', async (c) => {
  if (!writesEnabled()) return c.json({ error: 'PostgreSQL writes are disabled by deployment configuration' }, 503);
  if (c.get('user').roleId !== 'ADMIN') return c.json({ error: 'Administrator required for payments' }, 403);
  const body = await c.req.json().catch(() => null);
  try {
    const result = await createPostgresPayment(database(), body);
    return c.json(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    if (message.includes('thanh toán') || message.includes('công nợ') || message.includes('Công nợ') ||
        message.includes('Loại') || message.includes('Ngày') || message.includes('Thiếu tài khoản')) {
      return c.json({ success: false, error: message }, 400);
    }
    console.error('PostgreSQL payment transaction failed', error);
    return c.json({ success: false, error: 'Payment transaction failed' }, 503);
  }
});

api.all('/api/*', (c) => c.json({
  success: false, error: 'PostgreSQL write operations are not yet transaction-safe for this route',
  code: 'POSTGRES_TRANSACTION_IMPLEMENTATION_REQUIRED',
  path: c.req.path,
}, 501));

export { api as postgresApi };
