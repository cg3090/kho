/**
 * CLOUDFLARE D1 & DRIZZLE ORM DATABASE CLIENT ADAPTER
 * Hỗ trợ chạy song song 2 môi trường:
 * 1. Cloudflare Workers / Pages: D1 Edge Database (Tự động nhận diện mọi binding: DB, khodb,...)
 * 2. Local Development (Node.js 22): Native `node:sqlite` D1-compatible engine
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// An toàn tuyệt đối trên Cloudflare Edge (nơi import.meta.url có thể là undefined)
let nodeRequire: ((id: string) => any) | null = null;
function getNodeRequire(): ((id: string) => any) | null {
  if (nodeRequire) return nodeRequire;
  try {
    if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string' && import.meta.url.startsWith('file:')) {
      nodeRequire = createRequire(import.meta.url);
    }
  } catch {
    // Cloudflare Edge V8 isolate environment - bỏ qua an toàn
  }
  return nodeRequire;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}

export interface D1Response {
  success: boolean;
  meta: any;
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Response>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export type DrizzleD1Database = ReturnType<typeof drizzle<typeof schema>>;

export interface CloudflareEnv {
  DB?: D1Database;
  khodb?: D1Database;
  DATABASE?: D1Database;
  JWT_SECRET?: string;
  [key: string]: any;
}

/**
 * Tự động tìm kiếm binding Cloudflare D1 trong biến môi trường
 * Nhận diện linh hoạt DB, khodb, hoặc bất kỳ binding D1 nào có hàm prepare()
 */
export function findD1Binding(env?: CloudflareEnv): D1Database | null {
  if (!env || typeof env !== 'object') return null;

  if (env.DB && typeof (env.DB as any).prepare === 'function') return env.DB;
  if (env.khodb && typeof (env.khodb as any).prepare === 'function') return env.khodb;
  if (env.DATABASE && typeof (env.DATABASE as any).prepare === 'function') return env.DATABASE;

  for (const key of Object.keys(env)) {
    const val = (env as any)[key];
    if (val && typeof val === 'object' && typeof val.prepare === 'function') {
      return val as D1Database;
    }
  }
  return null;
}

let localD1Instance: D1Database | null = null;

/**
 * Local Node 22 SQLite adapter mimicking Cloudflare D1Database API
 * (Chỉ khởi tạo khi chạy local server trong môi trường Node.js)
 */
export function getOrCreateLocalD1(): D1Database {
  if (localD1Instance) return localD1Instance;

  const req = getNodeRequire();
  if (!req) {
    throw new Error('Local SQLite D1 emulation is only supported in Node.js development mode.');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = req('node:sqlite');
  const dbDir = path.resolve(process.cwd(), '.d1-local');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'd1_wms.sqlite');
  const sqlite = new DatabaseSync(dbPath);

  // Initialize schema if tables don't exist
  const migrationPath = path.resolve(process.cwd(), 'drizzle/migrations/0000_init_wms_d1.sql');
  if (fs.existsSync(migrationPath)) {
    try {
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      sqlite.exec(sqlContent);
    } catch (err) {
      console.warn('Local D1 migration notice:', err);
    }
  }

  // Build D1Database compatible interface
  const d1: D1Database = {
    prepare(query: string) {
      return {
        statement: query,
        params: [] as any[],
        bind(...values: any[]) {
          this.params = values;
          return this;
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          const stmt = sqlite.prepare(this.statement);
          const row = stmt.get(...this.params) as any;
          if (!row) return null;
          if (colName) return row[colName] ?? null;
          return row as T;
        },
        async all<T = unknown>(): Promise<D1Result<T>> {
          const stmt = sqlite.prepare(this.statement);
          const rows = stmt.all(...this.params) as T[];
          return {
            results: rows,
            success: true,
            meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'local-node-sqlite' } as any,
          };
        },
        async run<T = unknown>(): Promise<D1Response> {
          const stmt = sqlite.prepare(this.statement);
          const result = stmt.run(...this.params);
          return {
            success: true,
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
              duration: 0,
              served_by: 'local-node-sqlite',
            } as any,
          };
        },
        async raw<T = unknown>(): Promise<T[]> {
          const stmt = sqlite.prepare(this.statement);
          const rows = stmt.all(...this.params) as any[];
          return rows.map((r) => Object.values(r)) as T[];
        },
      } as any;
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      sqlite.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        const results: D1Result<T>[] = [];
        for (const st of statements) {
          const res = await st.all<T>();
          results.push(res);
        }
        sqlite.exec('COMMIT');
        return results;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
    async exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    },
    dump: async () => new ArrayBuffer(0),
  };

  localD1Instance = d1;
  return d1;
}

/**
 * Lấy instance Drizzle ORM kết nối với Cloudflare D1
 * (Tự động nhận diện D1 thật trên Cloudflare Workers hoặc Local D1 trên dev)
 */
export function getDb(env?: CloudflareEnv): DrizzleD1Database {
  const d1 = findD1Binding(env);
  if (d1) {
    return drizzle(d1, { schema });
  }

  // Nếu đang chạy trên Cloudflare Edge mà không tìm thấy binding:
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error(
      'Không tìm thấy Cloudflare D1 database binding trong env. Vui lòng kiểm tra lại cấu hình d1_databases trong wrangler.toml/wrangler.jsonc (ví dụ: binding = "DB" hoặc "khodb").'
    );
  }

  // Môi trường dev cục bộ trên Node.js
  const localD1 = getOrCreateLocalD1();
  return drizzle(localD1, { schema });
}
