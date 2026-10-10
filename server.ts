import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  connectPrismaClient,
  getPrismaClient,
  disconnectPrismaClient,
  inspectExistingDatabaseCatalog,
  runPrismaDbPullAndGenerate,
  loadFullStateViaPrisma,
  syncCollectionViaPrisma,
  purgeMockDataViaPrisma,
  updateEnvDatabaseUrl,
  sanitizeRowsForJson,
  ensurePrismaClientGenerated,
} from './src/db/prismaClient';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PG_CONFIG_CACHE_PATH = path.join(__dirname, '.pg-runtime-config.json');
const SQL_SETUP_SCRIPT_PATH = path.join(__dirname, 'database_setup.sql');
const PRISMA_SCHEMA_PATH = path.join(__dirname, 'prisma', 'schema.prisma');

interface RuntimePgConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}

let runtimePgConfig: RuntimePgConfig | null = null;
let activePool: Pool | null = null;
let schemaInitialized = false;
let schemaInitPromise: Promise<void> | null = null;
let dbWriteQueue: Promise<any> = Promise.resolve();

function withDbWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = dbWriteQueue.then(() => fn(), () => fn());
  dbWriteQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function retryOnDeadlock<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const code = err?.code || err?.cause?.code;
      const msg = String(err?.message || '');
      if ((code === '40P01' || code === '55P03' || msg.includes('deadlock')) && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 150 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Load persisted runtime PostgreSQL config if available
try {
  if (fs.existsSync(PG_CONFIG_CACHE_PATH)) {
    const raw = fs.readFileSync(PG_CONFIG_CACHE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.host && parsed.database && parsed.user) {
      runtimePgConfig = parsed;
    }
  }
} catch {
  // ignore cache read error
}

function saveRuntimePgConfigToDisk(cfg: RuntimePgConfig | null) {
  try {
    if (!cfg) {
      if (fs.existsSync(PG_CONFIG_CACHE_PATH)) {
        fs.unlinkSync(PG_CONFIG_CACHE_PATH);
      }
    } else {
      fs.writeFileSync(PG_CONFIG_CACHE_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Could not persist runtime PG config:', err);
  }
}

function parsePostgresUrl(urlStr: string): RuntimePgConfig | null {
  try {
    const parsed = new URL(urlStr);
    if (!parsed.protocol.startsWith('postgres')) return null;
    const hostname = parsed.hostname || 'localhost';
    const sslParam = parsed.searchParams.get('sslmode') || parsed.searchParams.get('ssl');
    const isCloudHost =
      hostname.includes('supabase.co') ||
      hostname.includes('supabase.com') ||
      hostname.includes('pooler.supabase.com') ||
      hostname.includes('neon.tech') ||
      hostname.includes('render.com') ||
      hostname.includes('railway.app') ||
      hostname.includes('aivencloud.com');
    const ssl = isCloudHost || sslParam === 'require' || sslParam === 'true' || sslParam === 'no-verify';

    return {
      host: hostname,
      port: parsed.port ? Number(parsed.port) : 5432,
      database: (parsed.pathname || '/erp_db').replace(/^\//, '') || 'erp_db',
      user: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || ''),
      ssl,
    };
  } catch {
    return null;
  }
}

function buildDatabaseUrl(cfg: RuntimePgConfig): string {
  const user = encodeURIComponent(cfg.user || 'postgres');
  const pass = cfg.password ? `:${encodeURIComponent(cfg.password)}` : '';
  const host = cfg.host || 'localhost';
  const port = cfg.port || 5432;
  const db = encodeURIComponent(cfg.database || 'erp_db');
  const isCloudHost =
    host.includes('supabase.co') ||
    host.includes('supabase.com') ||
    host.includes('pooler.supabase.com') ||
    host.includes('neon.tech');
  const needsSsl = Boolean(cfg.ssl || isCloudHost);
  const sslQuery = needsSsl ? '&sslmode=require' : '';
  return `postgresql://${user}${pass}@${host}:${port}/${db}?schema=public${sslQuery}`;
}

function maskDatabaseUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    if (u.password) u.password = '******';
    return u.toString();
  } catch {
    return urlStr;
  }
}

function resolvePgConfig(): RuntimePgConfig | null {
  if (runtimePgConfig) {
    return runtimePgConfig;
  }

  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
    return {
      host: process.env.SQL_HOST,
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
      database: process.env.SQL_DB_NAME,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD || '',
      ssl: false,
    };
  }

  if (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE) {
    return {
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD || '',
      ssl: process.env.PGSSLMODE === 'require',
    };
  }

  const envUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const isPlaceholderUrl =
    !envUrl ||
    envUrl === 'postgresql://postgres:password@localhost:5432/erp_db' ||
    envUrl === 'postgresql://postgres:password@localhost:5432/erp_db?schema=public';

  if (
    envUrl &&
    !isPlaceholderUrl &&
    (process.env.DB_TYPE === 'postgres' || Boolean(process.env.POSTGRES_URL) || Boolean(process.env.DATABASE_URL))
  ) {
    return parsePostgresUrl(envUrl);
  }

  return null;
}

function getOrCreatePool(): Pool | null {
  const cfg = resolvePgConfig();
  if (!cfg) return null;

  if (!activePool) {
    const poolConfig: PoolConfig = {
      host: cfg.host,
      port: cfg.port || 5432,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      ssl: cfg.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };
    activePool = new Pool(poolConfig);
    activePool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool client:', err.message);
    });
  }
  return activePool;
}

// Known legacy mock IDs that must NEVER exist in a real PostgreSQL database
const MOCK_PRODUCT_IDS = new Set(['prod-1', 'prod-2', 'prod-3']);
const MOCK_PRODUCT_SKUS = new Set(['IPHONE15PRO', 'SAMS24ULTRA', 'MACAIRM3']);
const MOCK_SUPPLIER_IDS = new Set(['sup-1', 'sup-2']);
const MOCK_SUPPLIER_TAX = new Set(['0101234567', '0309876543']);
const MOCK_CUSTOMER_IDS = new Set(['cus-1', 'cus-2']);
const MOCK_CUSTOMER_TAX = new Set(['0303217456', '0311609355']);
const MOCK_CAT_IDS = new Set(['cat-1', 'cat-2', 'cat-3']);
const MOCK_CAT_NAMES = new Set(['Điện thoại di động', 'Máy tính xách tay', 'Phụ kiện công nghệ']);
const MOCK_WH_IDS = new Set(['wh-1', 'wh-2']);
const MOCK_WH_NAMES = new Set(['Kho Chính Quận 1', 'Kho Phụ Thủ Đức']);
const MOCK_TX_IDS = new Set(['tx-init-stock', 'tx-out-init']);
const MOCK_TXD_IDS = new Set(['txd-1', 'txd-2', 'txd-3', 'txd-out-1', 'txd-out-2']);
const MOCK_JE_IDS = new Set(['je-init', 'je-in-init', 'je-pay-init', 'je-rev-init', 'je-cogs-init', 'je-cus-pay-init']);
const MOCK_JL_IDS = new Set([
  'jl-init-1', 'jl-init-2', 'jl-in-1', 'jl-in-2', 'jl-in-3',
  'jl-pay-1', 'jl-pay-2', 'jl-rev-1', 'jl-rev-2', 'jl-rev-3',
  'jl-cogs-1', 'jl-cogs-2', 'jl-cus-pay-1', 'jl-cus-pay-2',
]);
const MOCK_DEBT_IDS = new Set(['debt-init', 'debt-cus-init']);
const MOCK_PAYMENT_IDS = new Set(['pay-init', 'pay-cus-init']);
const MOCK_VAT_IDS = new Set(['vat-in-init', 'vat-out-init']);
const MOCK_QUOTE_IDS = new Set(['bg-init-1']);
const MOCK_QUOTED_IDS = new Set(['bgd-init-1']);
const MOCK_WS_ORDER_IDS = new Set(['order-ws-init-1', 'order-ws-init-2']);
const MOCK_USER_IDS = new Set(['u-thukho', 'u-ketoan', 'u-sales']);
const MOCK_USER_EMAILS = new Set(['thukho@verp.vn', 'ketoan@verp.vn', 'sales@verp.vn']);

function cleanStateMapOfMockData(state: Record<string, any>): boolean {
  let modified = false;
  const filterArr = (key: string, pred: (item: any) => boolean) => {
    if (Array.isArray(state[key])) {
      const before = state[key].length;
      state[key] = state[key].filter(pred);
      if (state[key].length !== before) modified = true;
    }
  };

  filterArr('products', (p) => !(MOCK_PRODUCT_IDS.has(p?.id) || MOCK_PRODUCT_SKUS.has(p?.sku)));
  filterArr('suppliers', (s) => !(MOCK_SUPPLIER_IDS.has(s?.id) && MOCK_SUPPLIER_TAX.has(s?.taxCode)));
  filterArr('customers', (c) => !(MOCK_CUSTOMER_IDS.has(c?.id) && MOCK_CUSTOMER_TAX.has(c?.taxCode)));
  filterArr('stockTransactions', (t) => !MOCK_TX_IDS.has(t?.id));
  filterArr('stockTransactionDetails', (d) => !MOCK_TXD_IDS.has(d?.id) && !MOCK_TX_IDS.has(d?.txId));
  filterArr('journalEntries', (j) => !MOCK_JE_IDS.has(j?.id));
  filterArr('journalLines', (l) => !MOCK_JL_IDS.has(l?.id) && !MOCK_JE_IDS.has(l?.entryId));
  filterArr('debts', (d) => !MOCK_DEBT_IDS.has(d?.id) && !MOCK_TX_IDS.has(d?.txId));
  filterArr('payments', (p) => !MOCK_PAYMENT_IDS.has(p?.id));
  filterArr('vatLedger', (v) => !MOCK_VAT_IDS.has(v?.id) && !MOCK_TX_IDS.has(v?.txId));
  filterArr('quotations', (q) => !MOCK_QUOTE_IDS.has(q?.id));
  filterArr('quotationDetails', (qd) => !MOCK_QUOTED_IDS.has(qd?.id) && !MOCK_QUOTE_IDS.has(qd?.quotationId));
  filterArr('webshopOrders', (o) => !MOCK_WS_ORDER_IDS.has(o?.id));
  filterArr('webshopProductConfigs', (c) => !MOCK_PRODUCT_IDS.has(c?.productId));
  filterArr('users', (u) => !(MOCK_USER_IDS.has(u?.id) && MOCK_USER_EMAILS.has(u?.email)));

  const usedCatIds = new Set((state.products || []).map((p: any) => p?.categoryId));
  filterArr('categories', (c) => !(MOCK_CAT_IDS.has(c?.id) && MOCK_CAT_NAMES.has(c?.name) && !usedCatIds.has(c?.id)));

  const usedWhIds = new Set([
    ...(state.stockTransactions || []).map((t: any) => t?.warehouseId),
    ...(state.webshopOrders || []).map((o: any) => o?.warehouseId),
  ]);
  filterArr('warehouses', (w) => !(MOCK_WH_IDS.has(w?.id) && MOCK_WH_NAMES.has(w?.name) && !usedWhIds.has(w?.id)));

  return modified;
}

async function purgeMockDataInPostgres(pool: Pool): Promise<void> {
  try {
    await retryOnDeadlock(async () => {
      await pool.query(`
        DELETE FROM webshop_order_items WHERE order_id IN ('order-ws-init-1', 'order-ws-init-2');
        DELETE FROM webshop_orders WHERE id IN ('order-ws-init-1', 'order-ws-init-2');
        DELETE FROM webshop_product_configs WHERE product_id IN ('prod-1', 'prod-2', 'prod-3');
        DELETE FROM quotation_details WHERE id IN ('bgd-init-1') OR quotation_id IN ('bg-init-1');
        DELETE FROM quotations WHERE id IN ('bg-init-1');
        DELETE FROM vat_ledger WHERE id IN ('vat-in-init', 'vat-out-init') OR tx_id IN ('tx-init-stock', 'tx-out-init');
        DELETE FROM payments WHERE id IN ('pay-init', 'pay-cus-init');
        DELETE FROM debts WHERE id IN ('debt-init', 'debt-cus-init') OR tx_id IN ('tx-init-stock', 'tx-out-init');
        DELETE FROM journal_entry_lines WHERE entry_id IN ('je-init', 'je-in-init', 'je-pay-init', 'je-rev-init', 'je-cogs-init', 'je-cus-pay-init');
        DELETE FROM journal_entries WHERE id IN ('je-init', 'je-in-init', 'je-pay-init', 'je-rev-init', 'je-cogs-init', 'je-cus-pay-init');
        DELETE FROM stock_transaction_details WHERE tx_id IN ('tx-init-stock', 'tx-out-init') OR id IN ('txd-1', 'txd-2', 'txd-3', 'txd-out-1', 'txd-out-2');
        DELETE FROM stock_transactions WHERE id IN ('tx-init-stock', 'tx-out-init');
        DELETE FROM products WHERE id IN ('prod-1', 'prod-2', 'prod-3') OR sku IN ('IPHONE15PRO', 'SAMS24ULTRA', 'MACAIRM3');
        DELETE FROM suppliers WHERE id IN ('sup-1', 'sup-2') AND tax_code IN ('0101234567', '0309876543');
        DELETE FROM customers WHERE id IN ('cus-1', 'cus-2') AND tax_code IN ('0303217456', '0311609355');
        DELETE FROM categories WHERE id IN ('cat-1', 'cat-2', 'cat-3') AND name IN ('Điện thoại di động', 'Máy tính xách tay', 'Phụ kiện công nghệ')
          AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = categories.id);
        DELETE FROM warehouses WHERE id IN ('wh-1', 'wh-2') AND name IN ('Kho Chính Quận 1', 'Kho Phụ Thủ Đức')
          AND NOT EXISTS (SELECT 1 FROM stock_transactions st WHERE st.warehouse_id = warehouses.id);
        DELETE FROM users WHERE id IN ('u-thukho', 'u-ketoan', 'u-sales') AND email IN ('thukho@verp.vn', 'ketoan@verp.vn', 'sales@verp.vn');
      `);

      const kvRes = await pool.query('SELECT key, data FROM erp_collections');
      if (kvRes.rows.length > 0) {
        const stateMap: Record<string, any> = {};
        for (const row of kvRes.rows) {
          stateMap[row.key] = row.data;
        }
        const changed = cleanStateMapOfMockData(stateMap);
        if (changed) {
          for (const [k, v] of Object.entries(stateMap)) {
            await pool.query(
              `UPDATE erp_collections SET data = $2::jsonb, updated_at = CURRENT_TIMESTAMP WHERE key = $1`,
              [k, JSON.stringify(v)]
            );
          }
        }
      }
    });
  } catch (err) {
    console.warn('Notice during purgeMockDataInPostgres:', err);
  }
}

async function ensurePostgresSchema(pool: Pool, forceRun = false): Promise<void> {
  if (schemaInitialized && !forceRun) return;

  if (schemaInitPromise) {
    await schemaInitPromise;
    if (schemaInitialized && !forceRun) return;
  }

  schemaInitPromise = (async () => {
    const cfg = resolvePgConfig();
    if (cfg) {
      try {
        await connectPrismaClient(buildDatabaseUrl(cfg));
      } catch (prismaErr) {
        console.warn('Prisma connection notice during schema init:', prismaErr);
      }
    }

    const client = await pool.connect();
    let lockAcquired = false;
    try {
      // Use a PostgreSQL session-level advisory lock so multiple concurrent processes/requests
      // never execute DDL/DML migrations simultaneously and never deadlock (40P01).
      try {
        await client.query('SELECT pg_advisory_lock(88442211)');
        lockAcquired = true;
      } catch {
        // ignore if advisory lock unsupported
      }

      if (!forceRun) {
        // Fast check: if core tables already exist, only run lightweight column checks instead of full DDL lock
        const checkRes = await client.query(`
          SELECT COUNT(*)::int AS cnt
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN (
              'erp_collections',
              'products',
              'stock_transactions',
              'journal_entries',
              'debts',
              'webshop_orders',
              'fiscal_closings',
              'chart_of_accounts'
            )
        `);
        const existingCount = Number(checkRes.rows?.[0]?.cnt || 0);
        if (existingCount >= 8) {
          schemaInitialized = true;
          return;
        }
      }

      if (fs.existsSync(SQL_SETUP_SCRIPT_PATH)) {
        const sqlScript = fs.readFileSync(SQL_SETUP_SCRIPT_PATH, 'utf-8');
        await retryOnDeadlock(async () => {
          await client.query(sqlScript);
        });
      }

      await purgeMockDataInPostgres(pool);
      schemaInitialized = true;
    } catch (error: any) {
      const code = error?.code || error?.cause?.code;
      if (code === '40P01') {
        console.warn('Transient deadlock (40P01) noticed during schema init; another process completed initialization.');
        schemaInitialized = true;
        return;
      }
      console.error('Failed to initialize PostgreSQL schema:', error);
      throw new Error('Failed to initialize PostgreSQL schema.', { cause: error });
    } finally {
      if (lockAcquired) {
        try {
          await client.query('SELECT pg_advisory_unlock(88442211)');
        } catch {
          // ignore unlock error
        }
      }
      client.release();
      schemaInitPromise = null;
    }
  })();

  await schemaInitPromise;
}

async function syncRelationalTable(pool: Pool, key: string, value: any): Promise<void> {
  try {
    if (key === 'categories' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.name) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO categories (id, name, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
          [item.id, item.name, item.description || '']
        );
      }
      if (validIds.length === 0) {
        await pool.query('UPDATE products SET category_id = NULL WHERE category_id IS NOT NULL');
        await pool.query('DELETE FROM categories');
      } else {
        await pool.query('UPDATE products SET category_id = NULL WHERE category_id IS NOT NULL AND category_id != ALL($1::varchar[])', [validIds]);
        await pool.query('DELETE FROM categories WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'uoms' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.name) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO uoms (id, name)
           VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [item.id, item.name]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM uoms WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.uom_id = uoms.id OR p.alt_uom_id = uoms.id)');
      } else {
        await pool.query(
          'DELETE FROM uoms WHERE id != ALL($1::varchar[]) AND NOT EXISTS (SELECT 1 FROM products p WHERE p.uom_id = uoms.id OR p.alt_uom_id = uoms.id)',
          [validIds]
        );
      }
    } else if (key === 'warehouses' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.name) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO warehouses (id, name, location)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location`,
          [item.id, item.name, item.location || '']
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM warehouses WHERE NOT EXISTS (SELECT 1 FROM stock_transactions st WHERE st.warehouse_id = warehouses.id)');
      } else {
        await pool.query(
          'DELETE FROM warehouses WHERE id != ALL($1::varchar[]) AND NOT EXISTS (SELECT 1 FROM stock_transactions st WHERE st.warehouse_id = warehouses.id)',
          [validIds]
        );
      }
    } else if (key === 'suppliers' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.name) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO suppliers (id, name, tax_code, phone, address)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             tax_code = EXCLUDED.tax_code,
             phone = EXCLUDED.phone,
             address = EXCLUDED.address`,
          [item.id, item.name, item.taxCode || '', item.phone || '', item.address || '']
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM suppliers WHERE NOT EXISTS (SELECT 1 FROM stock_transactions st WHERE st.supplier_id = suppliers.id)');
      } else {
        await pool.query(
          'DELETE FROM suppliers WHERE id != ALL($1::varchar[]) AND NOT EXISTS (SELECT 1 FROM stock_transactions st WHERE st.supplier_id = suppliers.id)',
          [validIds]
        );
      }
    } else if (key === 'customers' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.name) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO customers (id, name, tax_code, phone, address)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             tax_code = EXCLUDED.tax_code,
             phone = EXCLUDED.phone,
             address = EXCLUDED.address`,
          [item.id, item.name, item.taxCode || '', item.phone || '', item.address || '']
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM customers WHERE NOT EXISTS (SELECT 1 FROM stock_transactions st WHERE st.customer_id = customers.id)');
      } else {
        await pool.query(
          'DELETE FROM customers WHERE id != ALL($1::varchar[]) AND NOT EXISTS (SELECT 1 FROM stock_transactions st WHERE st.customer_id = customers.id)',
          [validIds]
        );
      }
    } else if (key === 'products' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.sku || !item?.name) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO products (
             id, sku, name, category_id, uom_id, alt_uom_id,
             uom_conversion_rate, description, current_qty, average_cost, image_url
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             sku = EXCLUDED.sku,
             name = EXCLUDED.name,
             category_id = EXCLUDED.category_id,
             uom_id = EXCLUDED.uom_id,
             alt_uom_id = EXCLUDED.alt_uom_id,
             uom_conversion_rate = EXCLUDED.uom_conversion_rate,
             description = EXCLUDED.description,
             current_qty = EXCLUDED.current_qty,
             average_cost = EXCLUDED.average_cost,
             image_url = EXCLUDED.image_url`,
          [
            item.id,
            item.sku,
            item.name,
            item.categoryId || null,
            item.uomId || null,
            item.altUomId || null,
            Number(item.uomConversionRate || 1),
            item.description || '',
            Number(item.currentQty || 0),
            Number(item.averageCost || 0),
            item.imageUrl || null,
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM products WHERE NOT EXISTS (SELECT 1 FROM stock_transaction_details d WHERE d.product_id = products.id)');
      } else {
        await pool.query(
          'DELETE FROM products WHERE id != ALL($1::varchar[]) AND NOT EXISTS (SELECT 1 FROM stock_transaction_details d WHERE d.product_id = products.id)',
          [validIds]
        );
      }
    } else if (key === 'coa' && Array.isArray(value)) {
      for (const item of value) {
        if (!item?.code || !item?.name) continue;
        await pool.query(
          `INSERT INTO chart_of_accounts (code, name, type, parent_code, is_custom)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (code) DO UPDATE SET
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             parent_code = EXCLUDED.parent_code,
             is_custom = EXCLUDED.is_custom`,
          [item.code, item.name, item.type || 'ASSET', item.parentCode || null, Boolean(item.isCustom)]
        );
      }
    } else if (key === 'accountMapping' && Array.isArray(value)) {
      for (const item of value) {
        if (!item?.key || !item?.accountCode) continue;
        await pool.query(
          `INSERT INTO account_mappings (key, account_code, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (key) DO UPDATE SET
             account_code = EXCLUDED.account_code,
             description = EXCLUDED.description`,
          [item.key, item.accountCode, item.description || '']
        );
      }
    } else if (key === 'sequenceConfig' && Array.isArray(value)) {
      for (const item of value) {
        if (!item?.type || !item?.prefix) continue;
        await pool.query(
          `INSERT INTO sequence_configs (type, prefix, digits, current_number)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (type) DO UPDATE SET
             prefix = EXCLUDED.prefix,
             digits = EXCLUDED.digits,
             current_number = EXCLUDED.current_number`,
          [item.type, item.prefix, Number(item.digits || 4), Number(item.currentNumber || 1)]
        );
      }
    } else if (key === 'roles' && Array.isArray(value)) {
      for (const item of value) {
        if (!item?.id || !item?.name) continue;
        await pool.query(
          `INSERT INTO roles (id, name, description, color, is_system, permissions)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             color = EXCLUDED.color,
             is_system = EXCLUDED.is_system,
             permissions = EXCLUDED.permissions`,
          [
            item.id,
            item.name,
            item.description || '',
            item.color || '#10b981',
            Boolean(item.isSystem),
            JSON.stringify(item.permissions || []),
          ]
        );
      }
    } else if (key === 'users' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.username) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO users (id, username, password, full_name, email, phone, role_id, status, avatar_url, created_at, last_login)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             username = EXCLUDED.username,
             password = EXCLUDED.password,
             full_name = EXCLUDED.full_name,
             email = EXCLUDED.email,
             phone = EXCLUDED.phone,
             role_id = EXCLUDED.role_id,
             status = EXCLUDED.status,
             avatar_url = EXCLUDED.avatar_url,
             last_login = EXCLUDED.last_login`,
          [
            item.id,
            item.username,
            item.password || '123',
            item.fullName || item.username,
            item.email || '',
            item.phone || '',
            item.roleId || 'ADMIN',
            item.status || 'ACTIVE',
            item.avatarUrl || null,
            item.createdAt || new Date().toISOString().split('T')[0],
            item.lastLogin || null,
          ]
        );
      }
      if (validIds.length > 0) {
        await pool.query('DELETE FROM users WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'stockTransactions' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.referenceNo) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO stock_transactions (
             id, type, date, warehouse_id, supplier_id, customer_id, reference_no,
             vat_rate, vat_type, subtotal, vat_amount, total_amount, is_confirmed,
             is_reversed, reversal_reference, notes, prepaid_amount, prepaid_method,
             due_date, fiscal_year, is_carry_forward, linked_closing_year
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
           ON CONFLICT (id) DO UPDATE SET
             type = EXCLUDED.type,
             date = EXCLUDED.date,
             warehouse_id = EXCLUDED.warehouse_id,
             supplier_id = EXCLUDED.supplier_id,
             customer_id = EXCLUDED.customer_id,
             reference_no = EXCLUDED.reference_no,
             vat_rate = EXCLUDED.vat_rate,
             vat_type = EXCLUDED.vat_type,
             subtotal = EXCLUDED.subtotal,
             vat_amount = EXCLUDED.vat_amount,
             total_amount = EXCLUDED.total_amount,
             is_confirmed = EXCLUDED.is_confirmed,
             is_reversed = EXCLUDED.is_reversed,
             reversal_reference = EXCLUDED.reversal_reference,
             notes = EXCLUDED.notes,
             prepaid_amount = EXCLUDED.prepaid_amount,
             prepaid_method = EXCLUDED.prepaid_method,
             due_date = EXCLUDED.due_date,
             fiscal_year = EXCLUDED.fiscal_year,
             is_carry_forward = EXCLUDED.is_carry_forward,
             linked_closing_year = EXCLUDED.linked_closing_year`,
          [
            item.id,
            item.type || 'IN',
            item.date || new Date().toISOString().split('T')[0],
            item.warehouseId || null,
            item.supplierId || null,
            item.customerId || null,
            item.referenceNo,
            Number(item.vatRate || 0),
            item.vatType || 'ITEMIZED',
            Number(item.subtotal || 0),
            Number(item.vatAmount || 0),
            Number(item.totalAmount || 0),
            Boolean(item.isConfirmed),
            Boolean(item.isReversed),
            item.reversalReference || null,
            item.notes || '',
            Number(item.prepaidAmount || 0),
            item.prepaidMethod || null,
            item.dueDate || null,
            item.fiscalYear ? Number(item.fiscalYear) : null,
            Boolean(item.isCarryForward),
            item.linkedClosingYear ? Number(item.linkedClosingYear) : null,
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM stock_transactions');
      } else {
        await pool.query('DELETE FROM stock_transactions WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'stockTransactionDetails' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.txId) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO stock_transaction_details (
             id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount,
             alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (id) DO UPDATE SET
             tx_id = EXCLUDED.tx_id,
             product_id = EXCLUDED.product_id,
             qty = EXCLUDED.qty,
             unit_price = EXCLUDED.unit_price,
             total_price = EXCLUDED.total_price,
             vat_rate = EXCLUDED.vat_rate,
             vat_amount = EXCLUDED.vat_amount,
             alt_uom_id = EXCLUDED.alt_uom_id,
             alt_qty = EXCLUDED.alt_qty,
             alt_unit_price = EXCLUDED.alt_unit_price,
             cogs_unit_cost = EXCLUDED.cogs_unit_cost,
             cogs_total = EXCLUDED.cogs_total,
             carton_qty = EXCLUDED.carton_qty`,
          [
            item.id,
            item.txId,
            item.productId || null,
            Number(item.qty || 0),
            Number(item.unitPrice || 0),
            Number(item.totalPrice || 0),
            Number(item.vatRate || 0),
            Number(item.vatAmount || 0),
            item.altUomId || null,
            item.altQty !== undefined ? Number(item.altQty) : null,
            item.altUnitPrice !== undefined ? Number(item.altUnitPrice) : null,
            Number(item.cogsUnitCost || 0),
            Number(item.cogsTotal || 0),
            Number(item.cartonQty || 0),
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM stock_transaction_details');
      } else {
        await pool.query('DELETE FROM stock_transaction_details WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'journalEntries' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.referenceNo) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO journal_entries (
             id, date, reference_no, description, is_reversed, reversal_reference, is_closing_entry, fiscal_year
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET
             date = EXCLUDED.date,
             reference_no = EXCLUDED.reference_no,
             description = EXCLUDED.description,
             is_reversed = EXCLUDED.is_reversed,
             reversal_reference = EXCLUDED.reversal_reference,
             is_closing_entry = EXCLUDED.is_closing_entry,
             fiscal_year = EXCLUDED.fiscal_year`,
          [
            item.id,
            item.date || new Date().toISOString().split('T')[0],
            item.referenceNo,
            item.description || '',
            Boolean(item.isReversed),
            item.reversalReference || null,
            Boolean(item.isClosingEntry),
            item.fiscalYear ? Number(item.fiscalYear) : null,
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM journal_entries');
      } else {
        await pool.query('DELETE FROM journal_entries WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'journalLines' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.entryId || !item?.accountCode) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET
             entry_id = EXCLUDED.entry_id,
             account_code = EXCLUDED.account_code,
             debit = EXCLUDED.debit,
             credit = EXCLUDED.credit,
             partner_id = EXCLUDED.partner_id,
             partner_type = EXCLUDED.partner_type`,
          [
            item.id,
            item.entryId,
            item.accountCode,
            Number(item.debit || 0),
            Number(item.credit || 0),
            item.partnerId || null,
            item.partnerType || null,
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM journal_entry_lines');
      } else {
        await pool.query('DELETE FROM journal_entry_lines WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'debts' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.referenceNo) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO debts (
             id, type, partner_id, tx_id, reference_no, date, amount, paid_amount,
             status, is_reversed, reversal_reference, due_date
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO UPDATE SET
             type = EXCLUDED.type,
             partner_id = EXCLUDED.partner_id,
             tx_id = EXCLUDED.tx_id,
             reference_no = EXCLUDED.reference_no,
             date = EXCLUDED.date,
             amount = EXCLUDED.amount,
             paid_amount = EXCLUDED.paid_amount,
             status = EXCLUDED.status,
             is_reversed = EXCLUDED.is_reversed,
             reversal_reference = EXCLUDED.reversal_reference,
             due_date = EXCLUDED.due_date`,
          [
            item.id,
            item.type || 'AP',
            item.partnerId || '',
            item.txId || null,
            item.referenceNo,
            item.date || new Date().toISOString().split('T')[0],
            Number(item.amount || 0),
            Number(item.paidAmount || 0),
            item.status || 'UNPAID',
            Boolean(item.isReversed),
            item.reversalReference || null,
            item.dueDate || null,
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM debts');
      } else {
        await pool.query('DELETE FROM debts WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'payments' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.referenceNo) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO payments (id, type, debt_id, partner_id, partner_type, date, amount, method, reference_no, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET
             type = EXCLUDED.type,
             debt_id = EXCLUDED.debt_id,
             partner_id = EXCLUDED.partner_id,
             partner_type = EXCLUDED.partner_type,
             date = EXCLUDED.date,
             amount = EXCLUDED.amount,
             method = EXCLUDED.method,
             reference_no = EXCLUDED.reference_no,
             notes = EXCLUDED.notes`,
          [
            item.id,
            item.type || 'RECEIVE',
            item.debtId || null,
            item.partnerId || '',
            item.partnerType || 'CUSTOMER',
            item.date || new Date().toISOString().split('T')[0],
            Number(item.amount || 0),
            item.method || 'BANK',
            item.referenceNo,
            item.notes || '',
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM payments');
      } else {
        await pool.query('DELETE FROM payments WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'vatLedger' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.invoiceNo) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO vat_ledger (
             id, type, date, tx_id, invoice_no, partner_name, partner_tax_code,
             amount_before_vat, vat_rate, vat_amount, account_code, is_reversed
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO UPDATE SET
             type = EXCLUDED.type,
             date = EXCLUDED.date,
             tx_id = EXCLUDED.tx_id,
             invoice_no = EXCLUDED.invoice_no,
             partner_name = EXCLUDED.partner_name,
             partner_tax_code = EXCLUDED.partner_tax_code,
             amount_before_vat = EXCLUDED.amount_before_vat,
             vat_rate = EXCLUDED.vat_rate,
             vat_amount = EXCLUDED.vat_amount,
             account_code = EXCLUDED.account_code,
             is_reversed = EXCLUDED.is_reversed`,
          [
            item.id,
            item.type || 'INPUT',
            item.date || new Date().toISOString().split('T')[0],
            item.txId || null,
            item.invoiceNo,
            item.partnerName || '',
            item.partnerTaxCode || '',
            Number(item.amountBeforeVat || 0),
            Number(item.vatRate || 0),
            Number(item.vatAmount || 0),
            item.accountCode || '1331',
            Boolean(item.isReversed),
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM vat_ledger');
      } else {
        await pool.query('DELETE FROM vat_ledger WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'quotations' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.referenceNo) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO quotations (id, reference_no, date, customer_id, subtotal, vat_rate, vat_amount, total_amount, notes, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET
             reference_no = EXCLUDED.reference_no,
             date = EXCLUDED.date,
             customer_id = EXCLUDED.customer_id,
             subtotal = EXCLUDED.subtotal,
             vat_rate = EXCLUDED.vat_rate,
             vat_amount = EXCLUDED.vat_amount,
             total_amount = EXCLUDED.total_amount,
             notes = EXCLUDED.notes,
             status = EXCLUDED.status`,
          [
            item.id,
            item.referenceNo,
            item.date || new Date().toISOString().split('T')[0],
            item.customerId || null,
            Number(item.subtotal || 0),
            Number(item.vatRate || 0),
            Number(item.vatAmount || 0),
            Number(item.totalAmount || 0),
            item.notes || '',
            item.status || 'PENDING',
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM quotations');
      } else {
        await pool.query('DELETE FROM quotations WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'quotationDetails' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.quotationId) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO quotation_details (id, quotation_id, product_id, qty, uom_id, unit_price, total_price, conversion_rate)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET
             quotation_id = EXCLUDED.quotation_id,
             product_id = EXCLUDED.product_id,
             qty = EXCLUDED.qty,
             uom_id = EXCLUDED.uom_id,
             unit_price = EXCLUDED.unit_price,
             total_price = EXCLUDED.total_price,
             conversion_rate = EXCLUDED.conversion_rate`,
          [
            item.id,
            item.quotationId,
            item.productId || null,
            Number(item.qty || 0),
            item.uomId || null,
            Number(item.unitPrice || 0),
            Number(item.totalPrice || 0),
            Number(item.conversionRate || 1),
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM quotation_details');
      } else {
        await pool.query('DELETE FROM quotation_details WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'fiscalClosings' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.fiscalYear) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO fiscal_closings (
             id, fiscal_year, closing_date, closed_at, closed_by, status,
             closing_journal_entry_id, next_year_opening_tx_ids,
             total_revenue_transferred, total_cogs_transferred, total_expense_transferred,
             tax_amount_transferred, net_profit_transferred,
             total_closing_stock_qty, total_closing_stock_value, stock_snapshots, notes
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17)
           ON CONFLICT (id) DO UPDATE SET
             fiscal_year = EXCLUDED.fiscal_year,
             closing_date = EXCLUDED.closing_date,
             closed_at = EXCLUDED.closed_at,
             closed_by = EXCLUDED.closed_by,
             status = EXCLUDED.status,
             closing_journal_entry_id = EXCLUDED.closing_journal_entry_id,
             next_year_opening_tx_ids = EXCLUDED.next_year_opening_tx_ids,
             total_revenue_transferred = EXCLUDED.total_revenue_transferred,
             total_cogs_transferred = EXCLUDED.total_cogs_transferred,
             total_expense_transferred = EXCLUDED.total_expense_transferred,
             tax_amount_transferred = EXCLUDED.tax_amount_transferred,
             net_profit_transferred = EXCLUDED.net_profit_transferred,
             total_closing_stock_qty = EXCLUDED.total_closing_stock_qty,
             total_closing_stock_value = EXCLUDED.total_closing_stock_value,
             stock_snapshots = EXCLUDED.stock_snapshots,
             notes = EXCLUDED.notes`,
          [
            item.id,
            Number(item.fiscalYear),
            item.closingDate || `${item.fiscalYear}-12-31`,
            item.closedAt || new Date().toISOString(),
            item.closedBy || 'Admin',
            item.status || 'LOCKED',
            item.closingJournalEntryId || null,
            JSON.stringify(item.nextYearOpeningTxIds || []),
            Number(item.totalRevenueTransferred || 0),
            Number(item.totalCogsTransferred || 0),
            Number(item.totalExpenseTransferred || 0),
            Number(item.taxAmountTransferred || 0),
            Number(item.netProfitTransferred || 0),
            Number(item.totalClosingStockQty || 0),
            Number(item.totalClosingStockValue || 0),
            JSON.stringify(item.stockSnapshots || []),
            item.notes || '',
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM fiscal_closings');
      } else {
        await pool.query('DELETE FROM fiscal_closings WHERE id != ALL($1::varchar[])', [validIds]);
      }
    } else if (key === 'companyInfo' && value && typeof value === 'object') {
      await pool.query(
        `INSERT INTO company_info (id, name, tax_code, address, bank_account, bank_name, logo_url, updated_at)
         VALUES (1, $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           tax_code = EXCLUDED.tax_code,
           address = EXCLUDED.address,
           bank_account = EXCLUDED.bank_account,
           bank_name = EXCLUDED.bank_name,
           logo_url = EXCLUDED.logo_url,
           updated_at = CURRENT_TIMESTAMP`,
        [
          value.name || '',
          value.taxCode || '',
          value.address || '',
          value.bankAccount || '',
          value.bankName || '',
          value.logoUrl || null,
        ]
      );
    } else if (key === 'systemConfig' && value && typeof value === 'object') {
      await pool.query(
        `INSERT INTO system_config (id, allow_negative_stock, default_vat_rate, auto_approve_quotation, theme_color, updated_at)
         VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           allow_negative_stock = EXCLUDED.allow_negative_stock,
           default_vat_rate = EXCLUDED.default_vat_rate,
           auto_approve_quotation = EXCLUDED.auto_approve_quotation,
           theme_color = EXCLUDED.theme_color,
           updated_at = CURRENT_TIMESTAMP`,
        [
          Boolean(value.allowNegativeStock),
          Number(value.defaultVatRate ?? 10),
          Boolean(value.autoApproveQuotation),
          value.themeColor || '#10b981',
        ]
      );
    } else if (key === 'webshopOrders' && Array.isArray(value)) {
      const validIds: string[] = [];
      for (const item of value) {
        if (!item?.id || !item?.orderCode) continue;
        validIds.push(item.id);
        await pool.query(
          `INSERT INTO webshop_orders (
             id, order_code, date, customer_name, customer_phone, customer_email,
             customer_address, customer_id, shipping_method, payment_method,
             payment_status, order_status, warehouse_id, subtotal, discount_amount,
             shipping_fee, vat_rate, vat_amount, total_amount, stock_tx_id, notes, created_at, updated_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
           ON CONFLICT (id) DO UPDATE SET
             order_status = EXCLUDED.order_status,
             payment_status = EXCLUDED.payment_status,
             warehouse_id = EXCLUDED.warehouse_id,
             stock_tx_id = EXCLUDED.stock_tx_id,
             notes = EXCLUDED.notes,
             updated_at = EXCLUDED.updated_at`,
          [
            item.id,
            item.orderCode,
            item.date || new Date().toISOString().split('T')[0],
            item.customerName || '',
            item.customerPhone || '',
            item.customerEmail || null,
            item.customerAddress || '',
            item.customerId || null,
            item.shippingMethod || 'STANDARD',
            item.paymentMethod || 'COD',
            item.paymentStatus || 'UNPAID',
            item.orderStatus || 'PENDING',
            item.warehouseId || null,
            Number(item.subtotal || 0),
            Number(item.discountAmount || 0),
            Number(item.shippingFee || 0),
            Number(item.vatRate || 0),
            Number(item.vatAmount || 0),
            Number(item.totalAmount || 0),
            item.stockTxId || null,
            item.notes || '',
            item.createdAt || new Date().toISOString(),
            item.updatedAt || null,
          ]
        );
      }
      if (validIds.length === 0) {
        await pool.query('DELETE FROM webshop_orders');
      } else {
        await pool.query('DELETE FROM webshop_orders WHERE id != ALL($1::varchar[])', [validIds]);
      }
    }
  } catch (err) {
    console.warn(`Relational table sync notice for ${key}:`, err);
  }
}

async function loadStateFromPostgres(pool: Pool): Promise<Record<string, any>> {
  try {
    await ensurePostgresSchema(pool);
    const cfg = resolvePgConfig();
    const prisma = getPrismaClient() || (cfg ? await connectPrismaClient(buildDatabaseUrl(cfg)) : null);

    // 1. Primary path: Load all 29 relational tables via Prisma Client ORM
    if (prisma) {
      const prismaState = await loadFullStateViaPrisma(prisma);
      cleanStateMapOfMockData(prismaState);
      return prismaState;
    }

    const state: Record<string, any> = {};

    // 2. Fallback path: Load from erp_collections JSONB store
    const kvRes = await pool.query('SELECT key, data FROM erp_collections');
    for (const row of kvRes.rows) {
      state[row.key] = row.data;
    }

    // 2. Hydrate from relational SQL tables ONLY if key is not yet in erp_collections
    //    (or if user inserted rows directly into PostgreSQL SQL tables)
    if (!('categories' in state)) {
      const catRes = await pool.query('SELECT id, name, description FROM categories ORDER BY name ASC');
      state.categories = catRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
      }));
    }

    if (!('uoms' in state)) {
      const uomRes = await pool.query('SELECT id, name FROM uoms ORDER BY name ASC');
      state.uoms = uomRes.rows.map((r) => ({ id: r.id, name: r.name }));
    }

    if (!('warehouses' in state)) {
      const whRes = await pool.query('SELECT id, name, location FROM warehouses ORDER BY name ASC');
      state.warehouses = whRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        location: r.location || '',
      }));
    }

    if (!('suppliers' in state)) {
      const supRes = await pool.query('SELECT id, name, tax_code, phone, address FROM suppliers ORDER BY name ASC');
      state.suppliers = supRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        taxCode: r.tax_code || '',
        phone: r.phone || '',
        address: r.address || '',
      }));
    }

    if (!('customers' in state)) {
      const cusRes = await pool.query('SELECT id, name, tax_code, phone, address FROM customers ORDER BY name ASC');
      state.customers = cusRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        taxCode: r.tax_code || '',
        phone: r.phone || '',
        address: r.address || '',
      }));
    }

    if (!('products' in state)) {
      const prodRes = await pool.query('SELECT * FROM products ORDER BY name ASC');
      state.products = prodRes.rows.map((r) => ({
        id: r.id,
        sku: r.sku,
        name: r.name,
        categoryId: r.category_id || '',
        uomId: r.uom_id || '',
        altUomId: r.alt_uom_id || undefined,
        uomConversionRate: r.uom_conversion_rate ? Number(r.uom_conversion_rate) : undefined,
        description: r.description || '',
        currentQty: Number(r.current_qty || 0),
        averageCost: Number(r.average_cost || 0),
        imageUrl: r.image_url || undefined,
      }));
    }

    if (!('coa' in state)) {
      const coaRes = await pool.query('SELECT code, name, type, parent_code, is_custom FROM chart_of_accounts ORDER BY code ASC');
      if (coaRes.rows.length > 0) {
        state.coa = coaRes.rows.map((r) => ({
          code: r.code,
          name: r.name,
          type: r.type,
          parentCode: r.parent_code || undefined,
          isCustom: Boolean(r.is_custom),
        }));
      }
    }

    if (!('accountMapping' in state)) {
      const mapRes = await pool.query('SELECT key, account_code, description FROM account_mappings');
      if (mapRes.rows.length > 0) {
        state.accountMapping = mapRes.rows.map((r) => ({
          key: r.key,
          accountCode: r.account_code,
          description: r.description || '',
        }));
      }
    }

    if (!('roles' in state)) {
      const roleRes = await pool.query('SELECT id, name, description, color, is_system, permissions FROM roles');
      if (roleRes.rows.length > 0) {
        state.roles = roleRes.rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          color: r.color || '#10b981',
          isSystem: Boolean(r.is_system),
          permissions: Array.isArray(r.permissions) ? r.permissions : [],
        }));
      }
    }

    if (!('users' in state)) {
      const userRes = await pool.query('SELECT * FROM users');
      if (userRes.rows.length > 0) {
        state.users = userRes.rows.map((r) => ({
          id: r.id,
          username: r.username,
          password: r.password || '123',
          fullName: r.full_name,
          email: r.email || '',
          phone: r.phone || '',
          roleId: r.role_id || 'ADMIN',
          status: r.status || 'ACTIVE',
          avatarUrl: r.avatar_url || undefined,
          createdAt: r.created_at || '2026-01-01',
          lastLogin: r.last_login || undefined,
        }));
      }
    }

    // 3. Always sanitize state against any legacy mock records before returning
    cleanStateMapOfMockData(state);

    return state;
  } catch (error) {
    console.error('Failed to load state from PostgreSQL:', error);
    throw new Error('Database query failed while loading ERP state.', { cause: error });
  }
}

async function startServer() {
  await ensurePrismaClientGenerated(false).catch((err) => {
    console.warn('Prisma generate startup warmup notice:', err?.message || err);
  });

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Check PostgreSQL + Prisma ORM connection status & table count
  app.get('/api/db/status', async (_req, res) => {
    const pool = getOrCreatePool();
    const cfg = resolvePgConfig();
    if (!pool || !cfg) {
      return res.json({
        connected: false,
        engine: 'none',
        orm: 'prisma',
        message: 'PostgreSQL / Prisma ORM chưa được cấu hình.',
      });
    }

    try {
      await pool.query('SELECT 1');
      const dbUrl = buildDatabaseUrl(cfg);
      const prisma = await connectPrismaClient(dbUrl);
      await ensurePostgresSchema(pool);
      const tables = await inspectExistingDatabaseCatalog(prisma, false);
      const totalRows = tables.reduce((s, t) => s + t.rowCount, 0);
      return res.json({
        connected: true,
        engine: 'postgres',
        orm: 'Prisma Client v6',
        databaseUrl: maskDatabaseUrl(dbUrl),
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        user: cfg.user,
        tableCount: tables.length,
        totalRows,
        tables,
      });
    } catch (error: any) {
      return res.json({
        connected: false,
        engine: 'postgres',
        orm: 'prisma',
        host: cfg.host,
        database: cfg.database,
        error: error?.message || 'Không thể kết nối tới PostgreSQL qua Prisma ORM.',
      });
    }
  });

  // Get full SQL setup script content (raw text download or JSON)
  app.get('/api/db/schema-sql', (_req, res) => {
    try {
      const sql = fs.existsSync(SQL_SETUP_SCRIPT_PATH)
        ? fs.readFileSync(SQL_SETUP_SCRIPT_PATH, 'utf-8')
        : '';
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      return res.send(sql);
    } catch (error: any) {
      return res.status(500).send(`-- Error reading database_setup.sql: ${error?.message}`);
    }
  });

  app.get('/api/db/sql-script', (_req, res) => {
    try {
      const sql = fs.existsSync(SQL_SETUP_SCRIPT_PATH)
        ? fs.readFileSync(SQL_SETUP_SCRIPT_PATH, 'utf-8')
        : '';
      return res.json({ success: true, sql });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Failed to read database_setup.sql' });
    }
  });

  // =========================================================================
  // PRISMA ORM & REVERSE INTROSPECTION ENDPOINTS (`prisma db pull` / `generate`)
  // =========================================================================

  // Get Prisma Schema & Introspection Catalog Status
  app.get('/api/prisma/status', async (_req, res) => {
    await ensurePrismaClientGenerated(false).catch(() => {});
    const schemaContent = fs.existsSync(PRISMA_SCHEMA_PATH)
      ? fs.readFileSync(PRISMA_SCHEMA_PATH, 'utf-8')
      : '';
    const cfg = resolvePgConfig();
    if (!cfg) {
      return res.json({
        connected: false,
        orm: 'Prisma ORM v6',
        schemaPrisma: schemaContent,
        tables: [],
        totalTables: 0,
        totalRows: 0,
      });
    }

    try {
      const dbUrl = buildDatabaseUrl(cfg);
      const prisma = await connectPrismaClient(dbUrl);
      const tables = await inspectExistingDatabaseCatalog(prisma, false);
      const totalRows = tables.reduce((s, t) => s + t.rowCount, 0);
      return res.json({
        connected: true,
        orm: 'Prisma ORM v6',
        databaseUrl: maskDatabaseUrl(dbUrl),
        schemaPrisma: schemaContent,
        tables,
        totalTables: tables.length,
        totalRows,
      });
    } catch (err: any) {
      return res.json({
        connected: false,
        orm: 'Prisma ORM v6',
        schemaPrisma: schemaContent,
        tables: [],
        totalTables: 0,
        totalRows: 0,
        error: err?.message,
      });
    }
  });

  // Download raw prisma/schema.prisma
  app.get('/api/prisma/schema', (_req, res) => {
    try {
      const content = fs.existsSync(PRISMA_SCHEMA_PATH)
        ? fs.readFileSync(PRISMA_SCHEMA_PATH, 'utf-8')
        : '';
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(content);
    } catch (err: any) {
      return res.status(500).send(`// Error reading schema.prisma: ${err?.message}`);
    }
  });

  // Explicitly run `npx prisma generate` and reload @prisma/client in memory
  app.post('/api/prisma/generate', async (_req, res) => {
    try {
      await ensurePrismaClientGenerated(true);
      return res.json({
        success: true,
        message: 'Đã chạy `npx prisma generate` và khởi tạo thành công @prisma/client!',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Lỗi khi chạy prisma generate.',
      });
    }
  });

  // Execute Prisma Reverse Introspection (`npx prisma db pull` + `npx prisma generate`)
  // Reads existing PostgreSQL schema & data without rewriting the database from scratch
  app.post('/api/prisma/introspect', async (_req, res) => {
    const cfg = resolvePgConfig();
    const pool = getOrCreatePool();
    if (!cfg || !pool) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng kết nối PostgreSQL trước khi chạy Khảo sát ngược (prisma db pull).',
      });
    }

    try {
      const dbUrl = buildDatabaseUrl(cfg);
      updateEnvDatabaseUrl(dbUrl, true);
      const prisma = await connectPrismaClient(dbUrl);

      // Run Prisma Introspection (`npx prisma db pull` + `npx prisma generate` + catalog scan)
      const introspection = await runPrismaDbPullAndGenerate(prisma);

      // Ensure any missing ERP tables are non-destructively added (IF NOT EXISTS)
      await ensurePostgresSchema(pool, false);

      // Load all existing data via Prisma Client
      const data = await loadFullStateViaPrisma(prisma);
      cleanStateMapOfMockData(data);

      return res.json({
        ...introspection,
        data,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Lỗi khi thực thi Prisma Introspection (prisma db pull).',
      });
    }
  });

  // Query rows of any specific table discovered by Prisma Introspection
  app.get('/api/prisma/table/:tableName', async (req, res) => {
    const cfg = resolvePgConfig();
    if (!cfg) {
      return res.status(400).json({ success: false, error: 'Chưa kết nối PostgreSQL.' });
    }
    try {
      const prisma = await connectPrismaClient(buildDatabaseUrl(cfg));
      const rawTable = String(req.params.tableName || '').replace(/[^a-zA-Z0-9_]/g, '');
      if (!rawTable) {
        return res.status(400).json({ success: false, error: 'Tên bảng không hợp lệ.' });
      }
      const rows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
        `SELECT * FROM public."${rawTable}" LIMIT 50`
      );
      return res.json({ success: true, tableName: rawTable, rows: sanitizeRowsForJson(rows) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Không thể truy vấn bảng.' });
    }
  });

  // Explicitly run database_setup.sql & purge mock data on connected PostgreSQL
  app.post('/api/db/init-schema', async (_req, res) => {
    const pool = getOrCreatePool();
    if (!pool) {
      return res.status(400).json({ success: false, error: 'Chưa kết nối tới PostgreSQL.' });
    }
    try {
      await ensurePostgresSchema(pool, true);
      const tablesRes = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name ASC`
      );
      const tables = tablesRes.rows.map((r) => r.table_name);
      return res.json({
        success: true,
        tableCount: tables.length,
        tables,
        message: `Đã khởi tạo & đồng bộ thành công ${tables.length} bảng chuẩn Thông tư 133/200 trên PostgreSQL và dọn sạch 100% dữ liệu mẫu!`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Lỗi khi chạy script khởi tạo bảng trên PostgreSQL.',
      });
    }
  });

  // Connect / update PostgreSQL configuration at runtime
  app.post('/api/db/connect', async (req, res) => {
    try {
      const { connectionString, host, port, database, user, password, ssl } = req.body || {};
      let newCfg: RuntimePgConfig | null = null;

      if (connectionString && typeof connectionString === 'string') {
        newCfg = parsePostgresUrl(connectionString.trim());
        if (!newCfg) {
          return res.status(400).json({
            connected: false,
            error: 'Chuỗi kết nối PostgreSQL (URI) không hợp lệ.',
          });
        }
      } else if (host && database && user) {
        newCfg = {
          host: String(host).trim(),
          port: port ? Number(port) : 5432,
          database: String(database).trim(),
          user: String(user).trim(),
          password: password ? String(password) : '',
          ssl: Boolean(ssl),
        };
      } else {
        return res.status(400).json({
          connected: false,
          error: 'Vui lòng cung cấp đầy đủ Host, Database và User hoặc chuỗi kết nối PostgreSQL.',
        });
      }

      const testPool = new Pool({
        host: newCfg.host,
        port: newCfg.port || 5432,
        database: newCfg.database,
        user: newCfg.user,
        password: newCfg.password,
        ssl: newCfg.ssl ? { rejectUnauthorized: false } : false,
        max: 10,
        connectionTimeoutMillis: 10000,
      });

      testPool.on('error', (err) => {
        console.error('PostgreSQL pool client error:', err.message);
      });

      await testPool.query('SELECT 1');

      if (activePool) {
        try {
          await activePool.end();
        } catch {
          // ignore cleanup error
        }
      }

      runtimePgConfig = newCfg;
      saveRuntimePgConfigToDisk(newCfg);
      activePool = testPool;
      schemaInitialized = false;

      // Connect Prisma Client & update .env DATABASE_URL
      const dbUrl = buildDatabaseUrl(newCfg);
      updateEnvDatabaseUrl(dbUrl, true);
      const prisma = await connectPrismaClient(dbUrl);

      // Run non-destructive schema check (CREATE TABLE IF NOT EXISTS) + mock purge
      await ensurePostgresSchema(activePool, true);

      // Load existing real data via Prisma Client ORM
      const data = await loadStateFromPostgres(activePool);
      const tables = await inspectExistingDatabaseCatalog(prisma, false);

      return res.json({
        connected: true,
        engine: 'postgres',
        orm: 'Prisma Client v6',
        databaseUrl: maskDatabaseUrl(dbUrl),
        host: newCfg.host,
        port: newCfg.port,
        database: newCfg.database,
        user: newCfg.user,
        tableCount: tables.length,
        tables,
        data,
      });
    } catch (error: any) {
      console.error('PostgreSQL connection test failed:', error);
      return res.status(500).json({
        connected: false,
        error: error?.message || 'Kết nối PostgreSQL thất bại. Vui lòng kiểm tra lại thông tin máy chủ.',
      });
    }
  });

  // Disconnect runtime PostgreSQL & Prisma Client
  app.post('/api/db/disconnect', async (_req, res) => {
    try {
      await disconnectPrismaClient();
      if (activePool) {
        await activePool.end();
      }
    } catch {
      // ignore
    } finally {
      activePool = null;
      runtimePgConfig = null;
      schemaInitialized = false;
      saveRuntimePgConfigToDisk(null);
    }
    return res.json({ connected: false, message: 'Đã ngắt kết nối PostgreSQL & Prisma Client.' });
  });

  // Purge mock data in PostgreSQL explicitly
  app.post('/api/db/purge-mock', async (_req, res) => {
    const pool = getOrCreatePool();
    if (!pool) {
      return res.json({ success: true, message: 'Đã làm sạch bộ nhớ cục bộ.' });
    }
    try {
      await purgeMockDataInPostgres(pool);
      const data = await loadStateFromPostgres(pool);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Failed to purge mock data' });
    }
  });

  // Load full state from PostgreSQL
  app.get('/api/db/state', async (_req, res) => {
    const pool = getOrCreatePool();
    if (!pool) {
      return res.status(400).json({ connected: false, error: 'PostgreSQL is not configured.' });
    }
    try {
      const data = await loadStateFromPostgres(pool);
      return res.json({ connected: true, engine: 'postgres', data });
    } catch (error: any) {
      console.error('Error in GET /api/db/state:', error);
      return res.status(500).json({ connected: false, error: error?.message || 'Failed to load state' });
    }
  });

  // Save a single collection or configuration key to PostgreSQL via Prisma ORM
  app.post('/api/db/collection/:key', async (req, res) => {
    const pool = getOrCreatePool();
    const cfg = resolvePgConfig();
    if (!pool || !cfg) {
      return res.status(400).json({ connected: false, error: 'PostgreSQL is not configured.' });
    }
    const { key } = req.params;
    const { value } = req.body || {};

    try {
      await ensurePostgresSchema(pool);
      await withDbWriteLock(async () => {
        await retryOnDeadlock(async () => {
          const prisma = getPrismaClient() || (await connectPrismaClient(buildDatabaseUrl(cfg)).catch(() => null));
          if (prisma) {
            await syncCollectionViaPrisma(prisma, key, value);
          } else {
            await syncRelationalTable(pool, key, value);
          }
        });
      });

      return res.json({ success: true, key, orm: 'prisma' });
    } catch (error: any) {
      console.error(`Error saving collection ${key} via Prisma:`, error);
      return res.status(500).json({ success: false, error: error?.message || 'Failed to save collection' });
    }
  });

  // Save all collections in bulk to PostgreSQL via Prisma ORM
  app.post('/api/db/sync-all', async (req, res) => {
    const pool = getOrCreatePool();
    const cfg = resolvePgConfig();
    if (!pool || !cfg) {
      return res.status(400).json({ connected: false, error: 'PostgreSQL is not configured.' });
    }
    const { collections } = req.body || {};
    if (!collections || typeof collections !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing collections payload.' });
    }

    try {
      await ensurePostgresSchema(pool);
      await withDbWriteLock(async () => {
        const prisma = getPrismaClient() || (await connectPrismaClient(buildDatabaseUrl(cfg)).catch(() => null));
        cleanStateMapOfMockData(collections);

        // Sync parent tables first so foreign key references succeed
        const orderedKeys = [
          'systemConfig',
          'companyInfo',
          'sequenceConfig',
          'printTemplates',
          'coa',
          'accountMapping',
          'roles',
          'users',
          'categories',
          'uoms',
          'warehouses',
          'suppliers',
          'customers',
          'products',
          'quotations',
          'quotationDetails',
          'stockTransactions',
          'stockTransactionDetails',
          'journalEntries',
          'journalLines',
          'debts',
          'payments',
          'vatLedger',
          'fiscalClosings',
          'webshopStoreConfig',
          'webshopProductConfigs',
          'webshopOrders',
        ];

        for (const key of orderedKeys) {
          const value = collections[key];
          if (value === undefined) continue;
          await retryOnDeadlock(async () => {
            if (prisma) {
              await syncCollectionViaPrisma(prisma, key, value);
            } else {
              await syncRelationalTable(pool, key, value);
            }
          });
        }
      });

      return res.json({ success: true, orm: 'prisma' });
    } catch (error: any) {
      console.error('Error in POST /api/db/sync-all:', error);
      return res.status(500).json({ success: false, error: error?.message || 'Failed to sync all collections' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/.env*',
            '**/.pg-runtime-config.json',
            '**/prisma/**',
            '**/database_setup.sql',
            '**/node_modules/**',
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
