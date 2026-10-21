import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { verifyPassword } from '../../utils/password';

const scrypt = promisify(scryptCb);
const KEY_LENGTH = 64;

export async function hashPostgresPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Mật khẩu mới phải có ít nhất 12 ký tự');
  }
  const salt = randomBytes(24);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return 'scrypt$' + salt.toString('hex') + '$' + derived.toString('hex');
}

/**
 * Verify a strong hash or legacy hash. Caller can upgrade verified legacy
 * hashes atomically. Legacy default 123 and empty passwords are not accepted.
 */
export async function verifyPostgresPassword(password: string, stored: string): Promise<{ valid: boolean; upgrade: boolean }> {
  if (!password || !stored || password === '123' || stored === '123') return { valid: false, upgrade: false };
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3 || !/^[a-f0-9]{48}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) {
      return { valid: false, upgrade: false };
    }
    const expected = Buffer.from(parts[2], 'hex');
    const actual = (await scrypt(password, Buffer.from(parts[1], 'hex'), expected.length)) as Buffer;
    return { valid: expected.length === actual.length && timingSafeEqual(expected, actual), upgrade: false };
  }
  const valid = verifyPassword(password, stored);
  return { valid, upgrade: valid };
}
