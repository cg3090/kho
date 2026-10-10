/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Role } from '../types';
import { hashPassword } from './password';

export const AUTH_TOKEN_KEY = 'wms_auth_token';
export const AUTH_USER_KEY = 'wms_auth_user';

/** Server-managed auth mode probe result. */
export type AuthMode = 'server' | 'local' | 'unknown';

export interface AuthConfig {
  authMode: AuthMode;
  serverAvailable: boolean;
  sessionIdleMinutes?: number;
  sessionAbsoluteHours?: number;
}

export interface SessionInfo {
  user: User;
  csrfToken: string;
  mustChangePassword: boolean;
}

/** Fired by the server-protected data layer when a session is rejected. */
export const UNAUTHORIZED_EVENT = 'erp:unauthorized';

let authConfig: AuthConfig = { authMode: 'unknown', serverAvailable: false };

/**
 * Returns current JWT / bearer auth token from localStorage if available
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('auth_token');
}

/**
 * Sets auth token into localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Clears auth token from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem('auth_token');
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem('wms_currentUser');
}

/**
 * Wrapper for fetch that automatically attaches the Authorization Bearer header
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Internal check for server auth mode
 */
function checkServerAuth(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(getAuthToken());
  } catch {
    return false;
  }
}

/**
 * `isServerAuth` can be checked as a boolean value OR called as a function `isServerAuth()`
 */
export const isServerAuth: any = Object.assign(
  function isServerAuth(): boolean {
    return checkServerAuth();
  },
  {
    valueOf: () => checkServerAuth(),
    toString: () => String(checkServerAuth()),
    [Symbol.toPrimitive]: () => checkServerAuth(),
  }
);

export function getAuthMode(): AuthMode {
  return authConfig.authMode;
}

export function setAuthConfig(cfg: AuthConfig): void {
  authConfig = cfg;
}

let cachedUser: User | null = null;

export function getCachedUser(): User | null {
  return cachedUser;
}

export function setCachedUser(user: User | null): void {
  cachedUser = user;
  if (typeof window === 'undefined') return;
  try {
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // ignore
  }
}

function notifyUnauthorized() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Probes the server for server-managed authentication. */
export async function initAuth(): Promise<AuthConfig> {
  // Retry briefly: a single failed probe must never pin the app to the
  // unauthenticated local fallback for the rest of the session.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('/api/auth/config', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('auth config unavailable');
      const body = await readJson<{ success?: boolean; sessionIdleMinutes?: number; sessionAbsoluteHours?: number }>(
        response
      );
      if (!body?.success) throw new Error('auth config rejected');
      authConfig = {
        authMode: 'server',
        serverAvailable: true,
        sessionIdleMinutes: body.sessionIdleMinutes,
        sessionAbsoluteHours: body.sessionAbsoluteHours,
      };
      return authConfig;
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }

  authConfig = { authMode: 'local', serverAvailable: false };
  return authConfig;
}

/** Restores an existing session on page load. Returns null when signed out. */
export async function fetchSession(): Promise<SessionInfo | null> {
  if (!isServerAuth()) return null;
  try {
    const response = await authFetch('/api/auth/session');
    if (response.status === 401) {
      cachedUser = null;
      return null;
    }
    if (!response.ok) return null;
    const body = await readJson<{ authenticated?: boolean; user?: User; csrfToken?: string }>(response);
    if (!body?.authenticated || !body.user) return null;
    cachedUser = body.user;
    return {
      user: body.user,
      csrfToken: body.csrfToken || '',
      mustChangePassword: Boolean(body.user.mustChangePassword),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch users list from server API (with fallback to local storage)
 */
export async function serverListUsers(): Promise<User[]> {
  try {
    const res = await authFetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.users || [];
    }
  } catch {
    // ignore
  }

  try {
    const saved = localStorage.getItem('wms_db_users');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }

  return [];
}

export const serverGetUsers = serverListUsers;

/**
 * Fetch a single user by ID
 */
export async function serverGetUser(id: string): Promise<User | null> {
  try {
    const res = await authFetch(`/api/users/${id}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }

  const users = await serverListUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * Create a new user on server
 */
export async function serverCreateUser(user: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, user: data.user || data };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || err.message || 'Không thể tạo người dùng trên máy chủ' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Update user on server
 */
export async function serverUpdateUser(id: string, user: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await authFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, user: data.user || data };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || err.message || 'Không thể cập nhật người dùng trên máy chủ' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Delete user on server
 */
export async function serverDeleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await authFetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      return { success: true };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || err.message || 'Không thể xóa người dùng trên máy chủ' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Reset password on server
 */
export async function serverResetPassword(id: string, newPassword?: string): Promise<{ success: boolean; password?: string; error?: string }> {
  try {
    const res = await authFetch(`/api/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, password: data.password || newPassword };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || err.message || 'Không thể đặt lại mật khẩu' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Update cached user password in localStorage across all user stores
 */
function updateCachedUserPassword(userIdOrUsername: string, newPlainPassword: string): User | null {
  if (typeof window === 'undefined') return null;
  const hashed = hashPassword(newPlainPassword);
  let updatedUser: User | null = null;

  try {
    const rawUsers = localStorage.getItem('wms_db_users');
    if (rawUsers) {
      const users: any[] = JSON.parse(rawUsers);
      const idx = users.findIndex(
        (u) => u.id === userIdOrUsername || u.username?.toLowerCase() === userIdOrUsername?.toLowerCase()
      );
      if (idx !== -1) {
        users[idx].password = hashed;
        users[idx].mustChangePassword = false;
        users[idx].isTemporaryPassword = false;
        localStorage.setItem('wms_db_users', JSON.stringify(users));
        updatedUser = users[idx];
      }
    }
  } catch {
    // ignore
  }

  // Update current user cache
  try {
    const curRaw = localStorage.getItem(AUTH_USER_KEY) || localStorage.getItem('wms_currentUser');
    if (curRaw) {
      const cur: any = JSON.parse(curRaw);
      if (
        !userIdOrUsername ||
        cur.id === userIdOrUsername ||
        cur.username?.toLowerCase() === userIdOrUsername?.toLowerCase()
      ) {
        cur.password = hashed;
        cur.mustChangePassword = false;
        cur.isTemporaryPassword = false;
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(cur));
        localStorage.setItem('wms_currentUser', JSON.stringify(cur));
        if (!updatedUser) updatedUser = cur;
      }
    }
  } catch {
    // ignore
  }

  return updatedUser;
}

/**
 * Change password on server (and update local storage/mock db cache)
 * Supports signatures:
 * - serverChangePassword(oldPassword, newPassword)
 * - serverChangePassword(userId, newPassword)
 * - serverChangePassword(userId, newPassword, oldPassword)
 * - serverChangePassword({ userId, oldPassword, newPassword, currentPassword })
 */
export async function serverChangePassword(
  arg1: string | { userId?: string; id?: string; oldPassword?: string; currentPassword?: string; newPassword: string; [key: string]: any },
  arg2?: string,
  arg3?: string
): Promise<{ success: boolean; user?: User; error?: string; message?: string }> {
  let userId = '';
  let oldPassword = '';
  let newPassword = '';

  if (typeof arg1 === 'object' && arg1 !== null) {
    userId = arg1.userId || arg1.id || '';
    oldPassword = arg1.oldPassword || arg1.currentPassword || '';
    newPassword = arg1.newPassword || '';
  } else if (typeof arg1 === 'string') {
    if (arg3 !== undefined) {
      // serverChangePassword(userId, newPassword, oldPassword)
      userId = arg1;
      newPassword = arg2 || '';
      oldPassword = arg3;
    } else if (arg2 !== undefined) {
      // Could be serverChangePassword(oldPassword, newPassword) OR serverChangePassword(userId, newPassword)
      try {
        const curUserRaw = localStorage.getItem(AUTH_USER_KEY) || localStorage.getItem('wms_currentUser');
        const curUser = curUserRaw ? JSON.parse(curUserRaw) : null;
        if (curUser && (curUser.id === arg1 || curUser.username === arg1)) {
          userId = arg1;
          newPassword = arg2;
        } else {
          oldPassword = arg1;
          newPassword = arg2;
        }
      } catch {
        oldPassword = arg1;
        newPassword = arg2;
      }
    } else {
      // serverChangePassword(newPassword)
      newPassword = arg1;
    }
  }

  // If userId is still missing, fallback to current logged-in user
  if (!userId) {
    try {
      const curUserRaw = localStorage.getItem(AUTH_USER_KEY) || localStorage.getItem('wms_currentUser');
      if (curUserRaw) {
        const curUser = JSON.parse(curUserRaw);
        if (curUser?.id) userId = curUser.id;
      }
    } catch {
      // ignore
    }
  }

  // Attempt server API call first if server is available
  try {
    const endpoints = [
      `/api/users/${userId}/change-password`,
      `/api/users/${userId}/password`,
      `/api/auth/change-password`,
      `/api/change-password`,
    ];
    for (const url of endpoints) {
      try {
        const res = await authFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, oldPassword, newPassword }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const updatedUser = updateCachedUserPassword(userId, newPassword);
          return {
            success: true,
            user: data.user || updatedUser || undefined,
            message: data.message || 'Đổi mật khẩu thành công',
          };
        }
      } catch {
        // try next endpoint
      }
    }
  } catch {
    // ignore
  }

  // Local storage / fallback update
  try {
    const updatedUser = updateCachedUserPassword(userId, newPassword);
    return {
      success: true,
      user: updatedUser || undefined,
      message: 'Đổi mật khẩu thành công',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Không thể đổi mật khẩu',
    };
  }
}

export const changePassword = serverChangePassword;
export const serverUpdatePassword = serverChangePassword;
export const resetPassword = serverResetPassword;

/**
 * Toggle user active/locked status on server
 */
export async function serverToggleUserStatus(id: string, status?: 'ACTIVE' | 'LOCKED'): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const res = await authFetch(`/api/users/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, status: data.status || status };
    }
  } catch {
    // ignore
  }
  return { success: false, error: 'Không thể thay đổi trạng thái người dùng' };
}

export const serverLockUser = (id: string) => serverToggleUserStatus(id, 'LOCKED');
export const serverUnlockUser = (id: string) => serverToggleUserStatus(id, 'ACTIVE');

/**
 * Fetch roles from server
 */
export async function serverGetRoles(): Promise<Role[]> {
  try {
    const res = await authFetch('/api/roles');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.roles || [];
    }
  } catch {
    // ignore
  }
  try {
    const saved = localStorage.getItem('wms_db_roles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Update role permissions on server
 */
export async function serverUpdateRole(id: string, role: Partial<Role>): Promise<{ success: boolean; role?: Role; error?: string }> {
  try {
    const res = await authFetch(`/api/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, role: data.role || data };
    }
  } catch {
    // ignore
  }
  return { success: false, error: 'Không thể cập nhật vai trò' };
}

/**
 * Get current logged-in server user
 */
export async function getCurrentServerUser(): Promise<User | null> {
  try {
    const res = await authFetch('/api/auth/me');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  try {
    const cached = localStorage.getItem(AUTH_USER_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

export const getServerCurrentUser = getCurrentServerUser;

/**
 * Log in to server
 */
export async function serverLogin(username: string, password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string; message?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) setAuthToken(data.token);
      if (data.user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      }
      return { success: true, user: data.user, token: data.token, message: data.message };
    }
    const err = await res.json().catch(() => ({}));
    const errorMsg = err.error || err.message || 'Đăng nhập không thành công';
    return { success: false, error: errorMsg, message: errorMsg };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export const loginServerUser = serverLogin;

/**
 * Log out from server
 */
export async function serverLogout(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  } finally {
    clearAuthToken();
  }
}

export const logoutServerUser = serverLogout;

export const checkAuth = initAuth;
export const isAuthenticated = (): boolean => Boolean(getAuthToken());

