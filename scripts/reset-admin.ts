/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Emergency recovery for the server-managed account store.
 *
 * Usage (server must be STOPPED first, then start it again):
 *   npm run reset-admin -- --password "MatKhauMoi@2026"
 *   npm run reset-admin -- --generate     # prints a random strong password
 *
 * The account is written as a scrypt verifier only; no plain-text password is
 * ever stored. The account is flagged mustChangePassword so the owner must set
 * their own password at the next sign-in.
 */

import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthStore, generateTemporaryPassword, hashServerPassword } from '../src/server/auth';
import { getPasswordStrength } from '../src/utils/password';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.join(__dirname, '.data', 'auth-users.json');

function parseArgs(argv: string[]) {
  const options = { password: '', generate: false, username: 'admin' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--generate') options.generate = true;
    else if (arg === '--password') options.password = argv[++i] || '';
    else if (arg.startsWith('--password=')) options.password = arg.slice('--password='.length);
    else if (arg === '--username') options.username = argv[++i] || options.username;
    else if (arg.startsWith('--username=')) options.username = arg.slice('--username='.length);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let password = options.password.trim();

  if (!password && !options.generate) {
    console.error('Cần truyền --password "<mật khẩu>" hoặc --generate để sinh mật khẩu ngẫu nhiên.');
    process.exit(1);
  }

  if (!password) {
    password = generateTemporaryPassword(14);
    console.log(`Mật khẩu sinh tự động: ${password}`);
  }

  const strength = getPasswordStrength(password, { username: options.username });
  if (!strength.ok) {
    console.error(`Mật khẩu chưa đủ mạnh:\n- ${strength.issues.join('\n- ')}`);
    process.exit(1);
  }

  const store = new AuthStore(__dirname);
  const existing = await store.findByUsername(options.username);
  const passwordHash = await hashServerPassword(password);

  if (existing) {
    await store.setPassword(existing.id, passwordHash, true);
    console.log(`Đã đặt lại mật khẩu cho tài khoản "${options.username}".`);
    console.log('Tài khoản sẽ phải đổi mật khẩu này ở lần đăng nhập kế tiếp.');
  } else {
    await store.create({
      username: options.username,
      fullName: 'Quản trị viên hệ thống (Admin)',
      roleId: 'ADMIN',
      passwordHash,
      mustChangePassword: true,
    });
    console.log(`Đã tạo tài khoản "${options.username}" với vai trò ADMIN.`);
    console.log('Tài khoản sẽ phải đổi mật khẩu này ở lần đăng nhập kế tiếp.');
  }

  console.log(`Kho thông tin đăng nhập: ${storePath}`);
  console.log('Hãy khởi động lại máy chủ (npm run dev) rồi đăng nhập.');
}

main().catch((error: any) => {
  console.error('Không thể đặt lại mật khẩu:', error?.message || error);
  process.exit(1);
});