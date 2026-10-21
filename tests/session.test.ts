import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, verifySession } from '../src/server/security/session';

const env = { JWT_SECRET: 'a-test-only-secret-of-more-than-32-characters-not-for-production' };

test('valid signed session verifies', async () => {
  const token = await createSession('user-1', 'ADMIN', env);
  const payload = await verifySession(token, env);
  assert.equal(payload?.sub, 'user-1');
  assert.equal(payload?.role, 'ADMIN');
  assert.ok((payload?.exp || 0) > Math.floor(Date.now() / 1000));
});

test('tampering cannot escalate privileges', async () => {
  const token = await createSession('user-1', 'KHO', env);
  const parts = token.split('.');
  const tampered = { sub: 'user-1', role: 'ADMIN', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 };
  parts[1] = Buffer.from(JSON.stringify(tampered)).toString('base64url');
  assert.equal(await verifySession(parts.join('.'), env), null);
});

test('an invalid or missing secret is rejected', async () => {
  await assert.rejects(() => createSession('user-1', 'ADMIN', { JWT_SECRET: 'short' }));
  assert.equal(await verifySession('not-a-token', env), null);
});

test('signatures are bound to the correct secret', async () => {
  const token = await createSession('user-1', 'ADMIN', env);
  assert.equal(await verifySession(token, { JWT_SECRET: 'another-secret-which-is-also-long-enough-123' }), null);
});
