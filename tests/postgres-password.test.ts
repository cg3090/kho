import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPostgresPassword, verifyPostgresPassword } from '../src/server/security/postgresPassword';
import { hashPassword } from '../src/utils/password';

test('new scrypt password verifies and incorrect password fails', async () => {
  const stored = await hashPostgresPassword('A-long-unique-password!2026');
  assert.ok(stored.startsWith('scrypt$'));
  assert.equal((await verifyPostgresPassword('A-long-unique-password!2026', stored)).valid, true);
  assert.equal((await verifyPostgresPassword('other-wrong-password', stored)).valid, false);
});

test('legacy hash may be upgraded after valid login', async () => {
  const legacy = hashPassword('Old-password-2025');
  assert.deepEqual(await verifyPostgresPassword('Old-password-2025', legacy), { valid: true, upgrade: true });
});

test('default password and short new passwords rejected', async () => {
  assert.equal((await verifyPostgresPassword('123', '123')).valid, false);
  await assert.rejects(() => hashPostgresPassword('weak'), /12 ký tự/);
});
