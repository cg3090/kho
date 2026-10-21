/**
 * HMAC-signed, expiring API sessions, compatible with Node.js and Cloudflare Workers.
 * JWT_SECRET must be provided server-side (at least 32 characters).
 */
export type SessionPayload = { sub: string; role: string; exp: number; iat: number };
const encoder = new TextEncoder();

function secret(env?: Record<string, unknown>): string {
  const value = env?.JWT_SECRET ?? (typeof process !== 'undefined' ? process.env.JWT_SECRET : undefined);
  if (typeof value !== 'string' || value.length < 32) {
    throw new Error('JWT_SECRET must be configured (minimum 32 characters).');
  }
  return value;
}

function toBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid token');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

async function hmac(input: string, env?: Record<string, unknown>): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(input)));
}

export async function createSession(userId: string, role: string, env?: Record<string, unknown>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = toBase64Url(encoder.encode(JSON.stringify({
    sub: userId, role, iat: now, exp: now + 8 * 60 * 60
  } satisfies SessionPayload)));
  const message = header + '.' + payload;
  return message + '.' + toBase64Url(await hmac(message, env));
}

export async function verifySession(token: string, env?: Record<string, unknown>): Promise<SessionPayload | null> {
  try {
    const [header, body, signature, extra] = token.split('.');
    if (!header || !body || !signature || extra) return null;
    const decodedHeader = JSON.parse(new TextDecoder().decode(fromBase64Url(header)));
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') return null;
    const message = header + '.' + body;
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const valid = await crypto.subtle.verify('HMAC', key, fromBase64Url(signature), encoder.encode(message));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || typeof payload.role !== 'string' || !Number.isSafeInteger(payload.exp) ||
        !Number.isSafeInteger(payload.iat) || payload.iat > now + 60 || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}
