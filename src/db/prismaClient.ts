import type { PrismaClient, Prisma } from '@prisma/client';
import { createRequire } from 'module';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const customRequire = createRequire(import.meta.url);

let prismaInstance: PrismaClient | null = null;
let activeDatabaseUrl: string = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
let generatePromise: Promise<void> | null = null;

/**
 * Clears Node's require cache for @prisma/client and .prisma/client
 * so newly generated Prisma Client code is loaded immediately without restarting the server.
 */
export function clearPrismaRequireCache(): void {
  try {
    for (const key of Object.keys(customRequire.cache)) {
      if (
        key.includes('.prisma') ||
        key.includes('@prisma/client') ||
        key.includes('@prisma\\client')
      ) {
        delete customRequire.cache[key];
      }
    }
  } catch {
    // ignore cache clear errors
  }
}

function resolvePrismaClientCtor(): any {
  const generatedIndexPath = path.resolve(process.cwd(), 'node_modules/.prisma/client/index.js');
  if (fs.existsSync(generatedIndexPath)) {
    try {
      const directMod = customRequire(generatedIndexPath);
      const DirectCtor = directMod?.PrismaClient || directMod?.default?.PrismaClient;
      if (
        DirectCtor &&
        !Function.prototype.toString.call(DirectCtor).includes('did not initialize yet')
      ) {
        return DirectCtor;
      }
    } catch {
      // fall through
    }
  }
  const mod = customRequire('@prisma/client');
  return mod?.PrismaClient || mod?.default?.PrismaClient;
}

/**
 * Checks whether the currently loaded @prisma/client is the uninitialized stub.
 */
function isPrismaClientStub(): boolean {
  try {
    const generatedIndexPath = path.resolve(process.cwd(), 'node_modules/.prisma/client/index.js');
    if (!fs.existsSync(generatedIndexPath)) {
      return true;
    }
    const Ctor = resolvePrismaClientCtor();
    if (!Ctor) return true;
    const fnSource = Function.prototype.toString.call(Ctor);
    return fnSource.includes('did not initialize yet');
  } catch {
    return true;
  }
}

/**
 * Ensures `npx prisma generate` has been executed and reloads @prisma/client into memory.
 */
export async function ensurePrismaClientGenerated(forceGenerate = false): Promise<void> {
  if (!forceGenerate && !isPrismaClientStub()) {
    return;
  }

  if (generatePromise) {
    await generatePromise;
    return;
  }

  generatePromise = (async () => {
    try {
      const fallbackUrl =
        activeDatabaseUrl ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        'postgresql://postgres:postgres@localhost:5432/erp_wms_accounting?schema=public';

      await execAsync('npx prisma generate', {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: fallbackUrl,
        },
        timeout: 60000,
      });
      clearPrismaRequireCache();
    } finally {
      generatePromise = null;
    }
  })();

  await generatePromise;
}

async function createPrismaClientInstance(normalizedUrl: string): Promise<PrismaClient> {
  await ensurePrismaClientGenerated(false);

  const instantiate = (): PrismaClient => {
    const PrismaClientCtor = resolvePrismaClientCtor();
    if (!PrismaClientCtor) {
      throw new Error('@prisma/client did not initialize yet.');
    }
    return new PrismaClientCtor({
      datasources: {
        db: {
          url: normalizedUrl,
        },
      },
      log: ['error', 'warn'],
    });
  };

  try {
    return instantiate();
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (
      msg.includes('did not initialize yet') ||
      msg.includes('prisma generate') ||
      msg.includes('.prisma/client')
    ) {
      clearPrismaRequireCache();
      await ensurePrismaClientGenerated(true);
      return instantiate();
    }
    throw err;
  }
}

export interface IntrospectedTableInfo {
  tableName: string;
  rowCount: number;
  columnCount: number;
  columns: {
    name: string;
    dataType: string;
    isNullable: boolean;
    defaultValue: string | null;
  }[];
  sampleRows?: Record<string, any>[];
}

export interface PrismaIntrospectionResult {
  success: boolean;
  message: string;
  cliOutput: string;
  schemaPrisma: string;
  tables: IntrospectedTableInfo[];
  totalTables: number;
  totalRows: number;
  timestamp: string;
}

export function sanitizeRowsForJson<T>(rows: T): T {
  if (rows === null || rows === undefined) return rows;
  return JSON.parse(
    JSON.stringify(rows, (_key, value) => (typeof value === 'bigint' ? Number(value) : value))
  );
}

/**
 * Updates the active DATABASE_URL and POSTGRES_URL in process.env memory
 * (and optionally .env on disk only when content actually changes)
 * without triggering Vite file-watcher reloads.
 */
export function updateEnvDatabaseUrl(databaseUrl: string, persistToEnvFile = false) {
  try {
    const normalizedUrl = databaseUrl.includes('?')
      ? databaseUrl
      : `${databaseUrl}?schema=public`;
    process.env.DATABASE_URL = normalizedUrl;
    process.env.POSTGRES_URL = databaseUrl;
    activeDatabaseUrl = normalizedUrl;

    if (!persistToEnvFile) return;

    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = envContent.split('\n').filter((line) => {
      const trimmed = line.trim();
      return (
        !trimmed.startsWith('DATABASE_URL=') &&
        !trimmed.startsWith('POSTGRES_URL=') &&
        !trimmed.startsWith('DB_TYPE=')
      );
    });

    lines.push(`DATABASE_URL="${normalizedUrl}"`);
    lines.push(`POSTGRES_URL="${databaseUrl}"`);
    lines.push(`DB_TYPE="postgres"`);

    const nextContent = lines.filter(Boolean).join('\n') + '\n';
    if (nextContent !== envContent) {
      fs.writeFileSync(envPath, nextContent, 'utf-8');
    }
  } catch (err) {
    console.warn('Không thể cập nhật biến môi trường DATABASE_URL:', err);
  }
}

/**
 * Initializes or reconnects the PrismaClient singleton to the specified PostgreSQL URL.
 */
export async function connectPrismaClient(customUrl?: string): Promise<PrismaClient> {
  const targetUrl =
    customUrl || process.env.DATABASE_URL || process.env.POSTGRES_URL || activeDatabaseUrl;

  if (!targetUrl) {
    throw new Error('Chưa cấu hình DATABASE_URL cho Prisma Client.');
  }

  const normalizedUrl = targetUrl.includes('?') ? targetUrl : `${targetUrl}?schema=public`;

  if (prismaInstance && activeDatabaseUrl === normalizedUrl) {
    await prismaInstance.$queryRaw`SELECT 1`;
    return prismaInstance;
  }

  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
    } catch {
      // ignore disconnect error
    }
    prismaInstance = null;
  }

  const client = await createPrismaClientInstance(normalizedUrl);

  await client.$connect();
  await client.$queryRaw`SELECT 1`;

  // Only update in-memory env after connection succeeds (do not touch .env on disk to avoid Vite reload)
  updateEnvDatabaseUrl(targetUrl, false);
  prismaInstance = client;
  return prismaInstance;
}

export function getPrismaClient(): PrismaClient | null {
  return prismaInstance;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
    } catch {
      // ignore
    }
    prismaInstance = null;
  }
}

/**
 * Inspects all existing tables, columns, and row counts in the PostgreSQL database
 * using Prisma $queryRaw (non-destructive reverse catalog inspection).
 */
export async function inspectExistingDatabaseCatalog(
  prisma: PrismaClient,
  includeSamples = false
): Promise<IntrospectedTableInfo[]> {
  const tablesRaw = await prisma.$queryRaw<
    { table_name: string }[]
  >`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name ASC`;

  const columnsRaw = await prisma.$queryRaw<
    {
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }[]
  >`SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name ASC, ordinal_position ASC`;

  const result: IntrospectedTableInfo[] = [];

  for (const t of tablesRaw) {
    const tableName = t.table_name;
    const cols = columnsRaw
      .filter((c) => c.table_name === tableName)
      .map((c) => ({
        name: c.column_name,
        dataType: c.data_type,
        isNullable: c.is_nullable === 'YES',
        defaultValue: c.column_default,
      }));

    let rowCount = 0;
    let sampleRows: Record<string, any>[] | undefined = undefined;
    try {
      const safeIdent = `"${tableName.replace(/"/g, '""')}"`;
      const countRes = await prisma.$queryRawUnsafe<{ count: bigint | number | string }[]>(
        `SELECT COUNT(*)::bigint AS count FROM public.${safeIdent}`
      );
      rowCount = Number(countRes?.[0]?.count || 0);

      if (includeSamples && rowCount > 0) {
        const rawSamples = await prisma.$queryRawUnsafe<Record<string, any>[]>(
          `SELECT * FROM public.${safeIdent} LIMIT 5`
        );
        sampleRows = sanitizeRowsForJson(rawSamples);
      }
    } catch {
      rowCount = 0;
    }

    result.push({
      tableName,
      rowCount,
      columnCount: cols.length,
      columns: cols,
      sampleRows,
    });
  }

  return result;
}

/**
 * Runs Prisma Reverse Engineering / Introspection (`npx prisma db pull`)
 * followed by `npx prisma generate` so existing PostgreSQL tables and data
 * are automatically read into `prisma/schema.prisma` without rewriting the DB from scratch.
 */
export async function runPrismaDbPullAndGenerate(
  prisma: PrismaClient
): Promise<PrismaIntrospectionResult> {
  const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
  const backupSchema = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';

  let cliOutput = '';
  try {
    // 1. Inspect existing tables in PostgreSQL first
    const tablesBefore = await inspectExistingDatabaseCatalog(prisma, true);

    // 2. Run `npx prisma db pull` if the database already has at least 1 table
    if (tablesBefore.length > 0) {
      try {
        const pullRes = await execAsync('npx prisma db pull', {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: activeDatabaseUrl },
          timeout: 30000,
        });
        cliOutput += `[prisma db pull]\n${pullRes.stdout || ''}\n${pullRes.stderr || ''}\n`;
      } catch (pullErr: any) {
        cliOutput += `[prisma db pull info]\n${pullErr.stdout || ''}\n${pullErr.message || ''}\n`;
        if (backupSchema) {
          fs.writeFileSync(schemaPath, backupSchema, 'utf-8');
        }
      }

      const currentSchema = fs.existsSync(schemaPath)
        ? fs.readFileSync(schemaPath, 'utf-8')
        : backupSchema;

      // Check if custom user tables (outside standard 30 ERP tables) exist
      const standardTables = new Set([
        'erp_collections',
        'system_config',
        'system_configs',
        'company_info',
        'company_infos',
        'sequence_configs',
        'print_templates',
        'roles',
        'users',
        'categories',
        'uoms',
        'warehouses',
        'suppliers',
        'customers',
        'products',
        'inventory_stock',
        'chart_of_accounts',
        'account_mappings',
        'quotations',
        'quotation_details',
        'stock_transactions',
        'stock_transaction_details',
        'journal_entries',
        'journal_entry_lines',
        'debts',
        'payments',
        'vat_ledger',
        'fiscal_closings',
        'webshop_store_config',
        'webshop_store_configs',
        'webshop_product_configs',
        'webshop_orders',
        'webshop_order_items',
      ]);

      const customTables = tablesBefore.filter((t) => !standardTables.has(t.tableName));
      if (customTables.length === 0 && backupSchema) {
        // Keep the camelCase @map annotated schema so typed PrismaClient queries work seamlessly
        fs.writeFileSync(schemaPath, backupSchema, 'utf-8');
      } else if (customTables.length > 0 && backupSchema) {
        // Append any newly discovered custom models from `prisma db pull` to our canonical schema
        const pulledModels = extractCustomModelsFromPulledSchema(currentSchema, standardTables);
        if (pulledModels.trim().length > 0) {
          const mergedSchema = `${backupSchema.trim()}\n\n// =================================================================================\n// MODELS INTROSPECTED TỰ ĐỘNG TỪ DATABASE CŨ (PRISMA DB PULL)\n// =================================================================================\n\n${pulledModels}\n`;
          fs.writeFileSync(schemaPath, mergedSchema, 'utf-8');
        } else {
          fs.writeFileSync(schemaPath, backupSchema, 'utf-8');
        }
      }

      try {
        const genRes = await execAsync('npx prisma generate', {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: activeDatabaseUrl },
          timeout: 30000,
        });
        clearPrismaRequireCache();
        cliOutput += `[prisma generate]\n${genRes.stdout || ''}\n`;
      } catch (genErr: any) {
        cliOutput += `[prisma generate info]\n${genErr.message || ''}\n`;
      }
    } else {
      cliOutput +=
        '[Khảo sát ngược] Database hiện đang trống (0 bảng). Hệ thống sẽ tự động khởi tạo cấu trúc bảng chuẩn qua Prisma ORM.\n';
    }

    const finalSchema = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';
    const tablesAfter = await inspectExistingDatabaseCatalog(prisma, true);
    const totalRows = tablesAfter.reduce((sum, t) => sum + t.rowCount, 0);

    return {
      success: true,
      message: `Khảo sát ngược (Prisma Introspection) thành công! Phát hiện ${tablesAfter.length} bảng và ${totalRows.toLocaleString()} bản ghi dữ liệu thật trong PostgreSQL.`,
      cliOutput: cliOutput.trim(),
      schemaPrisma: finalSchema,
      tables: tablesAfter,
      totalTables: tablesAfter.length,
      totalRows,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    if (backupSchema && fs.existsSync(schemaPath)) {
      fs.writeFileSync(schemaPath, backupSchema, 'utf-8');
    }
    const finalSchema = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';
    return {
      success: false,
      message: `Lỗi khi khảo sát ngược database: ${err.message || String(err)}`,
      cliOutput: cliOutput || String(err),
      schemaPrisma: finalSchema,
      tables: [],
      totalTables: 0,
      totalRows: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

function extractCustomModelsFromPulledSchema(
  pulledSchema: string,
  standardTables: Set<string>
): string {
  const blocks: string[] = [];
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = modelRegex.exec(pulledSchema)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const mapMatch = body.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName;
    if (!standardTables.has(tableName) && !standardTables.has(modelName.toLowerCase())) {
      blocks.push(match[0]);
    }
  }
  return blocks.join('\n\n');
}

const toNum = (v: Prisma.Decimal | number | string | null | undefined, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toDateStr = (v: Date | string | null | undefined): string => {
  if (!v) return new Date().toISOString().split('T')[0];
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return String(v).split('T')[0];
};

const toDateObj = (v: string | Date | null | undefined): Date => {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
};

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn('Prisma safeQuery notice:', (err as any)?.message || err);
    return fallback;
  }
}

/**
 * Purges legacy mock records using Prisma Client ORM queries so real PostgreSQL
 * databases never retain fake sample records.
 */
export async function purgeMockDataViaPrisma(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.webshopOrderItem.deleteMany({
        where: { orderId: { in: ['order-ws-init-1', 'order-ws-init-2'] } },
      }),
      prisma.webshopOrder.deleteMany({
        where: { id: { in: ['order-ws-init-1', 'order-ws-init-2'] } },
      }),
      prisma.webshopProductConfig.deleteMany({
        where: { productId: { in: ['prod-1', 'prod-2', 'prod-3'] } },
      }),
      prisma.quotationDetail.deleteMany({
        where: { OR: [{ id: 'bgd-init-1' }, { quotationId: 'bg-init-1' }] },
      }),
      prisma.quotation.deleteMany({
        where: { id: 'bg-init-1' },
      }),
      prisma.vatLedger.deleteMany({
        where: {
          OR: [
            { id: { in: ['vat-in-init', 'vat-out-init'] } },
            { txId: { in: ['tx-init-stock', 'tx-out-init'] } },
          ],
        },
      }),
      prisma.payment.deleteMany({
        where: { id: { in: ['pay-init', 'pay-cus-init'] } },
      }),
      prisma.debt.deleteMany({
        where: {
          OR: [
            { id: { in: ['debt-init', 'debt-cus-init'] } },
            { txId: { in: ['tx-init-stock', 'tx-out-init'] } },
          ],
        },
      }),
      prisma.journalEntryLine.deleteMany({
        where: {
          entryId: {
            in: [
              'je-init',
              'je-in-init',
              'je-pay-init',
              'je-rev-init',
              'je-cogs-init',
              'je-cus-pay-init',
            ],
          },
        },
      }),
      prisma.journalEntry.deleteMany({
        where: {
          id: {
            in: [
              'je-init',
              'je-in-init',
              'je-pay-init',
              'je-rev-init',
              'je-cogs-init',
              'je-cus-pay-init',
            ],
          },
        },
      }),
      prisma.stockTransactionDetail.deleteMany({
        where: {
          OR: [
            { txId: { in: ['tx-init-stock', 'tx-out-init'] } },
            { id: { in: ['txd-1', 'txd-2', 'txd-3', 'txd-out-1', 'txd-out-2'] } },
          ],
        },
      }),
      prisma.stockTransaction.deleteMany({
        where: { id: { in: ['tx-init-stock', 'tx-out-init'] } },
      }),
      prisma.product.deleteMany({
        where: {
          OR: [
            { id: { in: ['prod-1', 'prod-2', 'prod-3'] } },
            { sku: { in: ['IPHONE15PRO', 'SAMS24ULTRA', 'MACAIRM3'] } },
          ],
        },
      }),
      prisma.supplier.deleteMany({
        where: {
          id: { in: ['sup-1', 'sup-2'] },
          taxCode: { in: ['0101234567', '0309876543'] },
        },
      }),
      prisma.customer.deleteMany({
        where: {
          id: { in: ['cus-1', 'cus-2'] },
          taxCode: { in: ['0303217456', '0311609355'] },
        },
      }),
      prisma.user.deleteMany({
        where: {
          id: { in: ['u-thukho', 'u-ketoan', 'u-sales'] },
          email: { in: ['thukho@verp.vn', 'ketoan@verp.vn', 'sales@verp.vn'] },
        },
      }),
    ]);
  } catch (err) {
    console.warn('Prisma purgeMockDataViaPrisma info:', err);
  }
}

/**
 * Loads the complete ERP state from PostgreSQL using typed Prisma Client queries.
 * Reads directly from relational tables so any pre-existing data in PostgreSQL
 * is automatically loaded into the application without needing `erp_collections`.
 */
export async function loadFullStateViaPrisma(
  prisma: PrismaClient
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  // 1. Load fallback JSONB collections first (for any non-relational metadata)
  const collections = await safeQuery(() => prisma.erpCollection.findMany(), []);
  for (const row of collections) {
    const val = row.data !== undefined && row.data !== null ? row.data : row.payload;
    if (val !== undefined) {
      result[row.key] = val;
    }
  }

  // 2. Query all relational tables via Prisma Client ORM (authoritative source of truth)
  const [
    categories,
    uoms,
    warehouses,
    suppliers,
    customers,
    products,
    coa,
    accountMapping,
    stockTransactions,
    stockTransactionDetails,
    journalEntries,
    journalLines,
    debts,
    payments,
    vatLedger,
    quotations,
    quotationDetails,
    fiscalClosings,
    webshopOrders,
    webshopProductConfigs,
    webshopStoreConfig,
    roles,
    users,
    companyInfo,
    systemConfig,
    sequenceConfig,
    printTemplates,
  ] = await Promise.all([
    safeQuery(() => prisma.category.findMany({ orderBy: { name: 'asc' } }), []),
    safeQuery(() => prisma.uom.findMany({ orderBy: { name: 'asc' } }), []),
    safeQuery(() => prisma.warehouse.findMany({ orderBy: { name: 'asc' } }), []),
    safeQuery(() => prisma.supplier.findMany({ orderBy: { name: 'asc' } }), []),
    safeQuery(() => prisma.customer.findMany({ orderBy: { name: 'asc' } }), []),
    safeQuery(() => prisma.product.findMany({ orderBy: { name: 'asc' } }), []),
    safeQuery(() => prisma.chartOfAccount.findMany({ orderBy: { code: 'asc' } }), []),
    safeQuery(() => prisma.accountMapping.findMany({ orderBy: { key: 'asc' } }), []),
    safeQuery(() => prisma.stockTransaction.findMany({ orderBy: { date: 'desc' } }), []),
    safeQuery(() => prisma.stockTransactionDetail.findMany(), []),
    safeQuery(() => prisma.journalEntry.findMany({ orderBy: { date: 'desc' } }), []),
    safeQuery(() => prisma.journalEntryLine.findMany(), []),
    safeQuery(() => prisma.debt.findMany({ orderBy: { date: 'desc' } }), []),
    safeQuery(() => prisma.payment.findMany({ orderBy: { date: 'desc' } }), []),
    safeQuery(() => prisma.vatLedger.findMany({ orderBy: { date: 'desc' } }), []),
    safeQuery(() => prisma.quotation.findMany({ orderBy: { date: 'desc' } }), []),
    safeQuery(() => prisma.quotationDetail.findMany(), []),
    safeQuery(() => prisma.fiscalClosing.findMany({ orderBy: { fiscalYear: 'desc' } }), []),
    safeQuery(
      () =>
        prisma.webshopOrder.findMany({
          include: { items: true },
          orderBy: { date: 'desc' },
        }),
      []
    ),
    safeQuery(() => prisma.webshopProductConfig.findMany(), []),
    safeQuery(() => prisma.webshopStoreConfig.findFirst({ where: { id: 1 } }), null),
    safeQuery(() => prisma.role.findMany({ orderBy: { id: 'asc' } }), []),
    safeQuery(() => prisma.user.findMany({ orderBy: { username: 'asc' } }), []),
    safeQuery(() => prisma.companyInfo.findFirst({ where: { id: 1 } }), null),
    safeQuery(() => prisma.systemConfig.findFirst({ where: { id: 1 } }), null),
    safeQuery(() => prisma.sequenceConfig.findMany({ orderBy: { type: 'asc' } }), []),
    safeQuery(() => prisma.printTemplate.findMany({ orderBy: { type: 'asc' } }), []),
  ]);

  if (categories.length > 0 || !('categories' in result)) {
    result.categories = categories.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
    }));
  }

  if (uoms.length > 0 || !('uoms' in result)) {
    result.uoms = uoms.map((r) => ({
      id: r.id,
      name: r.name,
    }));
  }

  if (warehouses.length > 0 || !('warehouses' in result)) {
    result.warehouses = warehouses.map((r) => ({
      id: r.id,
      name: r.name,
      location: r.location || '',
    }));
  }

  if (suppliers.length > 0 || !('suppliers' in result)) {
    result.suppliers = suppliers.map((r) => ({
      id: r.id,
      name: r.name,
      taxCode: r.taxCode || '',
      phone: r.phone || '',
      address: r.address || '',
    }));
  }

  if (customers.length > 0 || !('customers' in result)) {
    result.customers = customers.map((r) => ({
      id: r.id,
      name: r.name,
      taxCode: r.taxCode || '',
      phone: r.phone || '',
      address: r.address || '',
    }));
  }

  if (products.length > 0 || !('products' in result)) {
    result.products = products.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      categoryId: r.categoryId || '',
      uomId: r.uomId || '',
      altUomId: r.altUomId || undefined,
      uomConversionRate: r.uomConversionRate ? toNum(r.uomConversionRate, 1) : undefined,
      description: r.description || '',
      currentQty: toNum(r.currentQty, 0),
      averageCost: toNum(r.averageCost, 0),
      imageUrl: r.imageUrl || undefined,
    }));
  }

  if (coa.length > 0) {
    result.coa = coa.map((r) => ({
      code: r.code,
      name: r.name,
      type: r.type,
      parentCode: r.parentCode || undefined,
      isCustom: Boolean(r.isCustom),
    }));
  }

  if (accountMapping.length > 0) {
    result.accountMapping = accountMapping.map((r) => ({
      key: r.key,
      accountCode: r.accountCode || '',
      description: r.description || '',
    }));
  }

  if (stockTransactions.length > 0 || !('stockTransactions' in result)) {
    result.stockTransactions = stockTransactions.map((r) => ({
      id: r.id,
      type: r.type,
      date: toDateStr(r.date),
      warehouseId: r.warehouseId || '',
      supplierId: r.supplierId || undefined,
      customerId: r.customerId || undefined,
      referenceNo: r.referenceNo,
      vatRate: toNum(r.vatRate, 0),
      vatType: r.vatType || 'ITEMIZED',
      subtotal: toNum(r.subtotal, 0),
      vatAmount: toNum(r.vatAmount, 0),
      totalAmount: toNum(r.totalAmount, 0),
      isConfirmed: Boolean(r.isConfirmed),
      isReversed: Boolean(r.isReversed),
      reversalReference: r.reversalReference || undefined,
      notes: r.notes || '',
      prepaidAmount: toNum(r.prepaidAmount, 0),
      prepaidMethod: r.prepaidMethod || undefined,
      dueDate: r.dueDate ? toDateStr(r.dueDate) : undefined,
      fiscalYear: r.fiscalYear !== null && r.fiscalYear !== undefined ? Number(r.fiscalYear) : undefined,
      isCarryForward: Boolean(r.isCarryForward),
      linkedClosingYear:
        r.linkedClosingYear !== null && r.linkedClosingYear !== undefined
          ? Number(r.linkedClosingYear)
          : undefined,
    }));
  }

  if (stockTransactionDetails.length > 0 || !('stockTransactionDetails' in result)) {
    result.stockTransactionDetails = stockTransactionDetails.map((r) => ({
      id: r.id,
      txId: r.txId || '',
      productId: r.productId || '',
      qty: toNum(r.qty, 0),
      unitPrice: toNum(r.unitPrice, 0),
      totalPrice: toNum(r.totalPrice, 0),
      vatRate: toNum(r.vatRate, 0),
      vatAmount: toNum(r.vatAmount, 0),
      altUomId: r.altUomId || undefined,
      altQty: r.altQty !== null && r.altQty !== undefined ? toNum(r.altQty, 0) : undefined,
      altUnitPrice:
        r.altUnitPrice !== null && r.altUnitPrice !== undefined
          ? toNum(r.altUnitPrice, 0)
          : undefined,
      cogsUnitCost: r.cogsUnitCost !== null ? toNum(r.cogsUnitCost, 0) : undefined,
      cogsTotal: r.cogsTotal !== null ? toNum(r.cogsTotal, 0) : undefined,
      cartonQty: r.cartonQty !== null ? toNum(r.cartonQty, 0) : undefined,
    }));
  }

  if (journalEntries.length > 0 || !('journalEntries' in result)) {
    result.journalEntries = journalEntries.map((r) => ({
      id: r.id,
      date: toDateStr(r.date),
      referenceNo: r.referenceNo || '',
      description: r.description || '',
      isReversed: Boolean(r.isReversed),
      reversalReference: r.reversalReference || undefined,
      isClosingEntry: Boolean(r.isClosingEntry),
      fiscalYear: r.fiscalYear !== null && r.fiscalYear !== undefined ? Number(r.fiscalYear) : undefined,
    }));
  }

  if (journalLines.length > 0 || !('journalLines' in result)) {
    result.journalLines = journalLines.map((r) => ({
      id: r.id,
      entryId: r.entryId || '',
      accountCode: r.accountCode || '',
      debit: toNum(r.debit, 0),
      credit: toNum(r.credit, 0),
      partnerId: r.partnerId || undefined,
      partnerType: r.partnerType || undefined,
    }));
  }

  if (debts.length > 0 || !('debts' in result)) {
    result.debts = debts.map((r) => ({
      id: r.id,
      type: r.type,
      partnerId: r.partnerId,
      txId: r.txId || '',
      referenceNo: r.referenceNo || '',
      date: toDateStr(r.date),
      amount: toNum(r.amount, 0),
      paidAmount: toNum(r.paidAmount, 0),
      status: r.status || 'UNPAID',
      isReversed: Boolean(r.isReversed),
      reversalReference: r.reversalReference || undefined,
      dueDate: r.dueDate ? toDateStr(r.dueDate) : undefined,
    }));
  }

  if (payments.length > 0 || !('payments' in result)) {
    result.payments = payments.map((r) => ({
      id: r.id,
      type: r.type,
      debtId: r.debtId || undefined,
      partnerId: r.partnerId,
      partnerType: r.partnerType,
      date: toDateStr(r.date),
      amount: toNum(r.amount, 0),
      method: r.method,
      referenceNo: r.referenceNo || '',
      notes: r.notes || '',
    }));
  }

  if (vatLedger.length > 0 || !('vatLedger' in result)) {
    result.vatLedger = vatLedger.map((r) => ({
      id: r.id,
      type: r.type,
      date: toDateStr(r.date),
      txId: r.txId || '',
      invoiceNo: r.invoiceNo || '',
      partnerName: r.partnerName || '',
      partnerTaxCode: r.partnerTaxCode || '',
      amountBeforeVat: toNum(r.amountBeforeVat, 0),
      vatRate: toNum(r.vatRate, 0),
      vatAmount: toNum(r.vatAmount, 0),
      accountCode: r.accountCode || '',
      isReversed: Boolean(r.isReversed),
    }));
  }

  if (quotations.length > 0 || !('quotations' in result)) {
    result.quotations = quotations.map((r) => ({
      id: r.id,
      referenceNo: r.referenceNo,
      date: toDateStr(r.date),
      customerId: r.customerId || '',
      subtotal: toNum(r.subtotal, 0),
      vatRate: toNum(r.vatRate, 0),
      vatAmount: toNum(r.vatAmount, 0),
      totalAmount: toNum(r.totalAmount, 0),
      notes: r.notes || '',
      status: r.status || 'PENDING',
    }));
  }

  if (quotationDetails.length > 0 || !('quotationDetails' in result)) {
    result.quotationDetails = quotationDetails.map((r) => ({
      id: r.id,
      quotationId: r.quotationId || '',
      productId: r.productId || '',
      qty: toNum(r.qty, 0),
      uomId: r.uomId || '',
      unitPrice: toNum(r.unitPrice, 0),
      totalPrice: toNum(r.totalPrice, 0),
      conversionRate: r.conversionRate ? toNum(r.conversionRate, 1) : 1,
    }));
  }

  if (fiscalClosings.length > 0 || !('fiscalClosings' in result)) {
    result.fiscalClosings = fiscalClosings.map((r) => ({
      id: r.id,
      fiscalYear: Number(r.fiscalYear),
      closingDate: toDateStr(r.closingDate),
      closedAt: String(r.closedAt || ''),
      closedBy: r.closedBy,
      status: r.status || 'LOCKED',
      closingJournalEntryId: r.closingJournalEntryId || '',
      nextYearOpeningTxIds: Array.isArray(r.nextYearOpeningTxIds) ? r.nextYearOpeningTxIds : [],
      totalRevenueTransferred: toNum(r.totalRevenueTransferred, 0),
      totalCogsTransferred: toNum(r.totalCogsTransferred, 0),
      totalExpenseTransferred: toNum(r.totalExpenseTransferred, 0),
      taxAmountTransferred: toNum(r.taxAmountTransferred, 0),
      netProfitTransferred: toNum(r.netProfitTransferred, 0),
      totalClosingStockQty: toNum(r.totalClosingStockQty, 0),
      totalClosingStockValue: toNum(r.totalClosingStockValue, 0),
      stockSnapshots: Array.isArray(r.stockSnapshots) ? r.stockSnapshots : [],
      notes: r.notes || '',
    }));
  }

  if (webshopOrders.length > 0 || !('webshopOrders' in result)) {
    result.webshopOrders = webshopOrders.map((r) => ({
      id: r.id,
      orderCode: r.orderCode,
      date: toDateStr(r.date),
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: r.customerEmail || undefined,
      customerAddress: r.customerAddress,
      customerId: r.customerId || undefined,
      shippingMethod: r.shippingMethod || 'STANDARD',
      paymentMethod: r.paymentMethod || 'COD',
      paymentStatus: r.paymentStatus || 'UNPAID',
      orderStatus: r.orderStatus || 'PENDING',
      warehouseId: r.warehouseId || '',
      items: (r.items || []).map((it) => ({
        id: it.id,
        productId: it.productId || '',
        productSku: it.productSku || '',
        productName: it.productName || '',
        qty: toNum(it.qty, 0),
        uomId: it.uomId || '',
        uomName: it.uomName || '',
        unitPrice: toNum(it.unitPrice, 0),
        totalPrice: toNum(it.totalPrice, 0),
      })),
      subtotal: toNum(r.subtotal, 0),
      discountAmount: toNum(r.discountAmount, 0),
      shippingFee: toNum(r.shippingFee, 0),
      vatRate: toNum(r.vatRate, 0),
      vatAmount: toNum(r.vatAmount, 0),
      totalAmount: toNum(r.totalAmount, 0),
      notes: r.notes || '',
      stockTxId: r.stockTxId || undefined,
      createdAt: r.createdAt || '',
      updatedAt: r.updatedAt || undefined,
    }));
  }

  if (webshopProductConfigs.length > 0 || !('webshopProductConfigs' in result)) {
    result.webshopProductConfigs = webshopProductConfigs.map((r) => ({
      productId: r.productId,
      isPublished: Boolean(r.isPublished),
      retailPrice: toNum(r.retailPrice, 0),
      promoPrice: r.promoPrice !== null ? toNum(r.promoPrice, 0) : undefined,
      shortDescription: r.shortDescription || '',
      badge: r.badge || undefined,
      isFeatured: Boolean(r.isFeatured),
    }));
  }

  if (webshopStoreConfig) {
    result.webshopStoreConfig = {
      storeName: webshopStoreConfig.storeName || '',
      storeSlogan: webshopStoreConfig.storeSlogan || '',
      hotline: webshopStoreConfig.hotline || '',
      email: webshopStoreConfig.email || '',
      address: webshopStoreConfig.address || '',
      defaultWarehouseId: webshopStoreConfig.defaultWarehouseId || '',
      autoCreateStockOut: Boolean(webshopStoreConfig.autoCreateStockOut),
      allowOrderWhenOutOfStock: Boolean(webshopStoreConfig.allowOrderWhenOutOfStock),
      bankName: webshopStoreConfig.bankName || '',
      bankAccount: webshopStoreConfig.bankAccount || '',
      bankOwner: webshopStoreConfig.bankOwner || '',
      bannerTitle: webshopStoreConfig.bannerTitle || '',
      bannerSubtitle: webshopStoreConfig.bannerSubtitle || '',
      zaloNumber: webshopStoreConfig.zaloNumber || '',
      supportHours: webshopStoreConfig.supportHours || '',
      chatWelcomeMessage: webshopStoreConfig.chatWelcomeMessage || '',
      enableSupportWidget: Boolean(webshopStoreConfig.enableSupportWidget ?? true),
    };
  }

  if (roles.length > 0) {
    result.roles = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      color: r.color || '#10b981',
      isSystem: Boolean(r.isSystem),
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
    }));
  }

  if (users.length > 0) {
    result.users = users.map((r) => ({
      id: r.id,
      username: r.username,
      password: r.password || '123',
      fullName: r.fullName,
      email: r.email || '',
      phone: r.phone || '',
      roleId: r.roleId || 'ADMIN',
      status: r.status || 'ACTIVE',
      avatarUrl: r.avatarUrl || undefined,
      createdAt: r.createdAt || '',
      lastLogin: r.lastLogin || undefined,
    }));
  }

  if (companyInfo && (companyInfo.name || !('companyInfo' in result))) {
    result.companyInfo = {
      name: companyInfo.name || '',
      taxCode: companyInfo.taxCode || '',
      address: companyInfo.address || '',
      bankAccount: companyInfo.bankAccount || '',
      bankName: companyInfo.bankName || '',
      logoUrl: companyInfo.logoUrl || '',
    };
  }

  if (systemConfig) {
    result.systemConfig = {
      allowNegativeStock: Boolean(systemConfig.allowNegativeStock),
      defaultVatRate: toNum(systemConfig.defaultVatRate, 10),
      autoApproveQuotation: Boolean(systemConfig.autoApproveQuotation),
      themeColor: systemConfig.themeColor || '#10b981',
    };
  }

  if (sequenceConfig.length > 0) {
    result.sequenceConfig = sequenceConfig.map((r) => ({
      type: r.type,
      prefix: r.prefix,
      digits: Number(r.digits || 4),
      currentNumber: Number(r.currentNumber || 1),
    }));
  }

  if (printTemplates.length > 0) {
    result.printTemplates = printTemplates.map((r) => ({
      type: r.type,
      name: r.name,
      title: r.title,
      headerHtml: r.headerHtml || '',
      footerHtml: r.footerHtml || '',
    }));
  }

  return result;
}

/**
 * Synchronizes a collection or singleton configuration into PostgreSQL
 * using Prisma Client ORM (`upsert`, `deleteMany`, `$transaction`).
 */
export async function syncCollectionViaPrisma(
  prisma: PrismaClient,
  key: string,
  value: any
): Promise<void> {
  // 1. Always upsert JSONB mirror in erp_collections
  try {
    await prisma.erpCollection.upsert({
      where: { key },
      update: { data: value ?? [], payload: value ?? [], updatedAt: new Date() },
      create: { key, data: value ?? [], payload: value ?? [] },
    });
  } catch {
    // ignore if erp_collections does not exist yet
  }

  if (value === null || value === undefined) return;

  // 2. Sync relational table via Prisma Client ORM
  try {
    if (key === 'categories' && Array.isArray(value)) {
      const ids = value.map((c: any) => String(c.id));
      for (const c of value) {
        await prisma.category.upsert({
          where: { id: String(c.id) },
          update: { name: c.name || '', description: c.description || null },
          create: { id: String(c.id), name: c.name || '', description: c.description || null },
        });
      }
      await prisma.category.deleteMany({
        where: {
          id: { notIn: ids },
          products: { none: {} },
        },
      });
    } else if (key === 'uoms' && Array.isArray(value)) {
      const ids = value.map((u: any) => String(u.id));
      for (const u of value) {
        await prisma.uom.upsert({
          where: { id: String(u.id) },
          update: { name: u.name || '' },
          create: { id: String(u.id), name: u.name || '' },
        });
      }
      await prisma.uom.deleteMany({
        where: {
          id: { notIn: ids },
          productsBase: { none: {} },
          productsAlt: { none: {} },
        },
      });
    } else if (key === 'warehouses' && Array.isArray(value)) {
      const ids = value.map((w: any) => String(w.id));
      for (const w of value) {
        await prisma.warehouse.upsert({
          where: { id: String(w.id) },
          update: { name: w.name || '', location: w.location || null },
          create: { id: String(w.id), name: w.name || '', location: w.location || null },
        });
      }
      await prisma.warehouse.deleteMany({
        where: {
          id: { notIn: ids },
          stockTransactions: { none: {} },
        },
      });
    } else if (key === 'suppliers' && Array.isArray(value)) {
      const ids = value.map((s: any) => String(s.id));
      for (const s of value) {
        await prisma.supplier.upsert({
          where: { id: String(s.id) },
          update: {
            name: s.name || '',
            taxCode: s.taxCode || '',
            phone: s.phone || null,
            address: s.address || null,
          },
          create: {
            id: String(s.id),
            name: s.name || '',
            taxCode: s.taxCode || '',
            phone: s.phone || null,
            address: s.address || null,
          },
        });
      }
      await prisma.supplier.deleteMany({
        where: {
          id: { notIn: ids },
          stockTransactions: { none: {} },
        },
      });
    } else if (key === 'customers' && Array.isArray(value)) {
      const ids = value.map((c: any) => String(c.id));
      for (const c of value) {
        await prisma.customer.upsert({
          where: { id: String(c.id) },
          update: {
            name: c.name || '',
            taxCode: c.taxCode || '',
            phone: c.phone || null,
            address: c.address || null,
          },
          create: {
            id: String(c.id),
            name: c.name || '',
            taxCode: c.taxCode || '',
            phone: c.phone || null,
            address: c.address || null,
          },
        });
      }
      await prisma.customer.deleteMany({
        where: {
          id: { notIn: ids },
          stockTransactions: { none: {} },
          quotations: { none: {} },
        },
      });
    } else if (key === 'products' && Array.isArray(value)) {
      const ids = value.map((p: any) => String(p.id));
      for (const p of value) {
        await prisma.product.upsert({
          where: { id: String(p.id) },
          update: {
            sku: p.sku || String(p.id),
            name: p.name || '',
            categoryId: p.categoryId || null,
            uomId: p.uomId || null,
            altUomId: p.altUomId || null,
            uomConversionRate: toNum(p.uomConversionRate, 1),
            description: p.description || null,
            currentQty: toNum(p.currentQty, 0),
            averageCost: toNum(p.averageCost, 0),
            imageUrl: p.imageUrl || null,
          },
          create: {
            id: String(p.id),
            sku: p.sku || String(p.id),
            name: p.name || '',
            categoryId: p.categoryId || null,
            uomId: p.uomId || null,
            altUomId: p.altUomId || null,
            uomConversionRate: toNum(p.uomConversionRate, 1),
            description: p.description || null,
            currentQty: toNum(p.currentQty, 0),
            averageCost: toNum(p.averageCost, 0),
            imageUrl: p.imageUrl || null,
          },
        });
      }
      await prisma.product.deleteMany({
        where: {
          id: { notIn: ids },
          stockTransactionDetails: { none: {} },
          quotationDetails: { none: {} },
        },
      });
    } else if (key === 'coa' && Array.isArray(value)) {
      for (const c of value) {
        await prisma.chartOfAccount.upsert({
          where: { code: String(c.code) },
          update: {
            name: c.name || '',
            type: c.type || 'ASSET',
            parentCode: c.parentCode || null,
            isCustom: Boolean(c.isCustom),
          },
          create: {
            code: String(c.code),
            name: c.name || '',
            type: c.type || 'ASSET',
            parentCode: c.parentCode || null,
            isCustom: Boolean(c.isCustom),
          },
        });
      }
    } else if (key === 'accountMapping' && Array.isArray(value)) {
      for (const m of value) {
        await prisma.accountMapping.upsert({
          where: { key: String(m.key) },
          update: { accountCode: m.accountCode || null, description: m.description || null },
          create: {
            key: String(m.key),
            accountCode: m.accountCode || null,
            description: m.description || null,
          },
        });
      }
    } else if (key === 'stockTransactions' && Array.isArray(value)) {
      const ids = value.map((t: any) => String(t.id));
      for (const t of value) {
        await prisma.stockTransaction.upsert({
          where: { id: String(t.id) },
          update: {
            type: t.type || 'IN',
            date: toDateObj(t.date),
            warehouseId: t.warehouseId || null,
            supplierId: t.supplierId || null,
            customerId: t.customerId || null,
            referenceNo: t.referenceNo || String(t.id),
            vatRate: toNum(t.vatRate, 0),
            vatType: t.vatType || 'ITEMIZED',
            subtotal: toNum(t.subtotal, 0),
            vatAmount: toNum(t.vatAmount, 0),
            totalAmount: toNum(t.totalAmount, 0),
            isConfirmed: Boolean(t.isConfirmed),
            isReversed: Boolean(t.isReversed),
            reversalReference: t.reversalReference || null,
            notes: t.notes || null,
            prepaidAmount: toNum(t.prepaidAmount, 0),
            prepaidMethod: t.prepaidMethod || null,
            dueDate: t.dueDate ? toDateObj(t.dueDate) : null,
            fiscalYear: t.fiscalYear ? Number(t.fiscalYear) : null,
            isCarryForward: Boolean(t.isCarryForward),
            linkedClosingYear: t.linkedClosingYear ? Number(t.linkedClosingYear) : null,
          },
          create: {
            id: String(t.id),
            type: t.type || 'IN',
            date: toDateObj(t.date),
            warehouseId: t.warehouseId || null,
            supplierId: t.supplierId || null,
            customerId: t.customerId || null,
            referenceNo: t.referenceNo || String(t.id),
            vatRate: toNum(t.vatRate, 0),
            vatType: t.vatType || 'ITEMIZED',
            subtotal: toNum(t.subtotal, 0),
            vatAmount: toNum(t.vatAmount, 0),
            totalAmount: toNum(t.totalAmount, 0),
            isConfirmed: Boolean(t.isConfirmed),
            isReversed: Boolean(t.isReversed),
            reversalReference: t.reversalReference || null,
            notes: t.notes || null,
            prepaidAmount: toNum(t.prepaidAmount, 0),
            prepaidMethod: t.prepaidMethod || null,
            dueDate: t.dueDate ? toDateObj(t.dueDate) : null,
            fiscalYear: t.fiscalYear ? Number(t.fiscalYear) : null,
            isCarryForward: Boolean(t.isCarryForward),
            linkedClosingYear: t.linkedClosingYear ? Number(t.linkedClosingYear) : null,
          },
        });
      }
      await prisma.stockTransaction.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'stockTransactionDetails' && Array.isArray(value)) {
      const ids = value.map((d: any) => String(d.id));
      for (const d of value) {
        await prisma.stockTransactionDetail.upsert({
          where: { id: String(d.id) },
          update: {
            txId: d.txId || null,
            productId: d.productId || null,
            qty: toNum(d.qty, 0),
            unitPrice: toNum(d.unitPrice, 0),
            totalPrice: toNum(d.totalPrice, 0),
            vatRate: toNum(d.vatRate, 0),
            vatAmount: toNum(d.vatAmount, 0),
            altUomId: d.altUomId || null,
            altQty: d.altQty !== undefined ? toNum(d.altQty, 0) : null,
            altUnitPrice: d.altUnitPrice !== undefined ? toNum(d.altUnitPrice, 0) : null,
            cogsUnitCost: d.cogsUnitCost !== undefined ? toNum(d.cogsUnitCost, 0) : 0,
            cogsTotal: d.cogsTotal !== undefined ? toNum(d.cogsTotal, 0) : 0,
            cartonQty: d.cartonQty !== undefined ? toNum(d.cartonQty, 0) : 0,
          },
          create: {
            id: String(d.id),
            txId: d.txId || null,
            productId: d.productId || null,
            qty: toNum(d.qty, 0),
            unitPrice: toNum(d.unitPrice, 0),
            totalPrice: toNum(d.totalPrice, 0),
            vatRate: toNum(d.vatRate, 0),
            vatAmount: toNum(d.vatAmount, 0),
            altUomId: d.altUomId || null,
            altQty: d.altQty !== undefined ? toNum(d.altQty, 0) : null,
            altUnitPrice: d.altUnitPrice !== undefined ? toNum(d.altUnitPrice, 0) : null,
            cogsUnitCost: d.cogsUnitCost !== undefined ? toNum(d.cogsUnitCost, 0) : 0,
            cogsTotal: d.cogsTotal !== undefined ? toNum(d.cogsTotal, 0) : 0,
            cartonQty: d.cartonQty !== undefined ? toNum(d.cartonQty, 0) : 0,
          },
        });
      }
      await prisma.stockTransactionDetail.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'journalEntries' && Array.isArray(value)) {
      const ids = value.map((j: any) => String(j.id));
      for (const j of value) {
        await prisma.journalEntry.upsert({
          where: { id: String(j.id) },
          update: {
            date: toDateObj(j.date),
            referenceNo: j.referenceNo || '',
            description: j.description || '',
            isReversed: Boolean(j.isReversed),
            reversalReference: j.reversalReference || null,
            isClosingEntry: Boolean(j.isClosingEntry),
            fiscalYear: j.fiscalYear ? Number(j.fiscalYear) : null,
          },
          create: {
            id: String(j.id),
            date: toDateObj(j.date),
            referenceNo: j.referenceNo || '',
            description: j.description || '',
            isReversed: Boolean(j.isReversed),
            reversalReference: j.reversalReference || null,
            isClosingEntry: Boolean(j.isClosingEntry),
            fiscalYear: j.fiscalYear ? Number(j.fiscalYear) : null,
          },
        });
      }
      await prisma.journalEntry.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'journalLines' && Array.isArray(value)) {
      const ids = value.map((l: any) => String(l.id));
      for (const l of value) {
        await prisma.journalEntryLine.upsert({
          where: { id: String(l.id) },
          update: {
            entryId: l.entryId || null,
            accountCode: l.accountCode || null,
            debit: toNum(l.debit, 0),
            credit: toNum(l.credit, 0),
            partnerId: l.partnerId || null,
            partnerType: l.partnerType || null,
          },
          create: {
            id: String(l.id),
            entryId: l.entryId || null,
            accountCode: l.accountCode || null,
            debit: toNum(l.debit, 0),
            credit: toNum(l.credit, 0),
            partnerId: l.partnerId || null,
            partnerType: l.partnerType || null,
          },
        });
      }
      await prisma.journalEntryLine.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'debts' && Array.isArray(value)) {
      const ids = value.map((d: any) => String(d.id));
      for (const d of value) {
        await prisma.debt.upsert({
          where: { id: String(d.id) },
          update: {
            type: d.type || 'AR',
            partnerId: d.partnerId || '',
            txId: d.txId || null,
            referenceNo: d.referenceNo || '',
            date: toDateObj(d.date),
            amount: toNum(d.amount, 0),
            paidAmount: toNum(d.paidAmount, 0),
            status: d.status || 'UNPAID',
            isReversed: Boolean(d.isReversed),
            reversalReference: d.reversalReference || null,
            dueDate: d.dueDate ? toDateObj(d.dueDate) : null,
          },
          create: {
            id: String(d.id),
            type: d.type || 'AR',
            partnerId: d.partnerId || '',
            txId: d.txId || null,
            referenceNo: d.referenceNo || '',
            date: toDateObj(d.date),
            amount: toNum(d.amount, 0),
            paidAmount: toNum(d.paidAmount, 0),
            status: d.status || 'UNPAID',
            isReversed: Boolean(d.isReversed),
            reversalReference: d.reversalReference || null,
            dueDate: d.dueDate ? toDateObj(d.dueDate) : null,
          },
        });
      }
      await prisma.debt.deleteMany({
        where: { id: { notIn: ids }, payments: { none: {} } },
      });
    } else if (key === 'payments' && Array.isArray(value)) {
      const ids = value.map((p: any) => String(p.id));
      for (const p of value) {
        await prisma.payment.upsert({
          where: { id: String(p.id) },
          update: {
            type: p.type || 'RECEIVE',
            debtId: p.debtId || null,
            partnerId: p.partnerId || '',
            partnerType: p.partnerType || 'CUSTOMER',
            date: toDateObj(p.date),
            amount: toNum(p.amount, 0),
            method: p.method || 'CASH',
            referenceNo: p.referenceNo || String(p.id),
            notes: p.notes || null,
          },
          create: {
            id: String(p.id),
            type: p.type || 'RECEIVE',
            debtId: p.debtId || null,
            partnerId: p.partnerId || '',
            partnerType: p.partnerType || 'CUSTOMER',
            date: toDateObj(p.date),
            amount: toNum(p.amount, 0),
            method: p.method || 'CASH',
            referenceNo: p.referenceNo || String(p.id),
            notes: p.notes || null,
          },
        });
      }
      await prisma.payment.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'vatLedger' && Array.isArray(value)) {
      const ids = value.map((v: any) => String(v.id));
      for (const v of value) {
        await prisma.vatLedger.upsert({
          where: { id: String(v.id) },
          update: {
            type: v.type || 'INPUT',
            date: toDateObj(v.date),
            txId: v.txId || null,
            invoiceNo: v.invoiceNo || '',
            partnerName: v.partnerName || '',
            partnerTaxCode: v.partnerTaxCode || '',
            amountBeforeVat: toNum(v.amountBeforeVat, 0),
            vatRate: toNum(v.vatRate, 0),
            vatAmount: toNum(v.vatAmount, 0),
            accountCode: v.accountCode || null,
            isReversed: Boolean(v.isReversed),
          },
          create: {
            id: String(v.id),
            type: v.type || 'INPUT',
            date: toDateObj(v.date),
            txId: v.txId || null,
            invoiceNo: v.invoiceNo || '',
            partnerName: v.partnerName || '',
            partnerTaxCode: v.partnerTaxCode || '',
            amountBeforeVat: toNum(v.amountBeforeVat, 0),
            vatRate: toNum(v.vatRate, 0),
            vatAmount: toNum(v.vatAmount, 0),
            accountCode: v.accountCode || null,
            isReversed: Boolean(v.isReversed),
          },
        });
      }
      await prisma.vatLedger.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'quotations' && Array.isArray(value)) {
      const ids = value.map((q: any) => String(q.id));
      for (const q of value) {
        await prisma.quotation.upsert({
          where: { id: String(q.id) },
          update: {
            referenceNo: q.referenceNo || String(q.id),
            date: toDateObj(q.date),
            customerId: q.customerId || null,
            subtotal: toNum(q.subtotal, 0),
            vatRate: toNum(q.vatRate, 0),
            vatAmount: toNum(q.vatAmount, 0),
            totalAmount: toNum(q.totalAmount, 0),
            notes: q.notes || null,
            status: q.status || 'PENDING',
          },
          create: {
            id: String(q.id),
            referenceNo: q.referenceNo || String(q.id),
            date: toDateObj(q.date),
            customerId: q.customerId || null,
            subtotal: toNum(q.subtotal, 0),
            vatRate: toNum(q.vatRate, 0),
            vatAmount: toNum(q.vatAmount, 0),
            totalAmount: toNum(q.totalAmount, 0),
            notes: q.notes || null,
            status: q.status || 'PENDING',
          },
        });
      }
      await prisma.quotation.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'quotationDetails' && Array.isArray(value)) {
      const ids = value.map((qd: any) => String(qd.id));
      for (const qd of value) {
        await prisma.quotationDetail.upsert({
          where: { id: String(qd.id) },
          update: {
            quotationId: qd.quotationId || null,
            productId: qd.productId || null,
            qty: toNum(qd.qty, 0),
            uomId: qd.uomId || null,
            conversionRate: toNum(qd.conversionRate, 1),
            unitPrice: toNum(qd.unitPrice, 0),
            totalPrice: toNum(qd.totalPrice, 0),
          },
          create: {
            id: String(qd.id),
            quotationId: qd.quotationId || null,
            productId: qd.productId || null,
            qty: toNum(qd.qty, 0),
            uomId: qd.uomId || null,
            conversionRate: toNum(qd.conversionRate, 1),
            unitPrice: toNum(qd.unitPrice, 0),
            totalPrice: toNum(qd.totalPrice, 0),
          },
        });
      }
      await prisma.quotationDetail.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'fiscalClosings' && Array.isArray(value)) {
      const ids = value.map((fc: any) => String(fc.id));
      for (const fc of value) {
        await prisma.fiscalClosing.upsert({
          where: { id: String(fc.id) },
          update: {
            fiscalYear: Number(fc.fiscalYear),
            closingDate: toDateObj(fc.closingDate || `${fc.fiscalYear}-12-31`),
            closedAt: String(fc.closedAt || new Date().toISOString()),
            closedBy: fc.closedBy || 'Admin',
            status: fc.status || 'LOCKED',
            closingJournalEntryId: fc.closingJournalEntryId || null,
            nextYearOpeningTxIds: fc.nextYearOpeningTxIds || [],
            totalRevenueTransferred: toNum(fc.totalRevenueTransferred, 0),
            totalCogsTransferred: toNum(fc.totalCogsTransferred, 0),
            totalExpenseTransferred: toNum(fc.totalExpenseTransferred, 0),
            taxAmountTransferred: toNum(fc.taxAmountTransferred, 0),
            netProfitTransferred: toNum(fc.netProfitTransferred, 0),
            totalClosingStockQty: toNum(fc.totalClosingStockQty, 0),
            totalClosingStockValue: toNum(fc.totalClosingStockValue, 0),
            stockSnapshots: fc.stockSnapshots || [],
            notes: fc.notes || null,
          },
          create: {
            id: String(fc.id),
            fiscalYear: Number(fc.fiscalYear),
            closingDate: toDateObj(fc.closingDate || `${fc.fiscalYear}-12-31`),
            closedAt: String(fc.closedAt || new Date().toISOString()),
            closedBy: fc.closedBy || 'Admin',
            status: fc.status || 'LOCKED',
            closingJournalEntryId: fc.closingJournalEntryId || null,
            nextYearOpeningTxIds: fc.nextYearOpeningTxIds || [],
            totalRevenueTransferred: toNum(fc.totalRevenueTransferred, 0),
            totalCogsTransferred: toNum(fc.totalCogsTransferred, 0),
            totalExpenseTransferred: toNum(fc.totalExpenseTransferred, 0),
            taxAmountTransferred: toNum(fc.taxAmountTransferred, 0),
            netProfitTransferred: toNum(fc.netProfitTransferred, 0),
            totalClosingStockQty: toNum(fc.totalClosingStockQty, 0),
            totalClosingStockValue: toNum(fc.totalClosingStockValue, 0),
            stockSnapshots: fc.stockSnapshots || [],
            notes: fc.notes || null,
          },
        });
      }
      await prisma.fiscalClosing.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'webshopOrders' && Array.isArray(value)) {
      const ids = value.map((o: any) => String(o.id));
      for (const o of value) {
        await prisma.webshopOrder.upsert({
          where: { id: String(o.id) },
          update: {
            orderCode: o.orderCode || String(o.id),
            date: toDateObj(o.date),
            customerName: o.customerName || '',
            customerPhone: o.customerPhone || '',
            customerEmail: o.customerEmail || null,
            customerAddress: o.customerAddress || '',
            customerId: o.customerId || null,
            shippingMethod: o.shippingMethod || 'STANDARD',
            paymentMethod: o.paymentMethod || 'COD',
            paymentStatus: o.paymentStatus || 'UNPAID',
            orderStatus: o.orderStatus || 'PENDING',
            warehouseId: o.warehouseId || null,
            subtotal: toNum(o.subtotal, 0),
            discountAmount: toNum(o.discountAmount, 0),
            shippingFee: toNum(o.shippingFee, 0),
            vatRate: toNum(o.vatRate, 0),
            vatAmount: toNum(o.vatAmount, 0),
            totalAmount: toNum(o.totalAmount, 0),
            notes: o.notes || null,
            stockTxId: o.stockTxId || null,
            createdAt: o.createdAt ? String(o.createdAt) : new Date().toISOString(),
            updatedAt: o.updatedAt ? String(o.updatedAt) : null,
          },
          create: {
            id: String(o.id),
            orderCode: o.orderCode || String(o.id),
            date: toDateObj(o.date),
            customerName: o.customerName || '',
            customerPhone: o.customerPhone || '',
            customerEmail: o.customerEmail || null,
            customerAddress: o.customerAddress || '',
            customerId: o.customerId || null,
            shippingMethod: o.shippingMethod || 'STANDARD',
            paymentMethod: o.paymentMethod || 'COD',
            paymentStatus: o.paymentStatus || 'UNPAID',
            orderStatus: o.orderStatus || 'PENDING',
            warehouseId: o.warehouseId || null,
            subtotal: toNum(o.subtotal, 0),
            discountAmount: toNum(o.discountAmount, 0),
            shippingFee: toNum(o.shippingFee, 0),
            vatRate: toNum(o.vatRate, 0),
            vatAmount: toNum(o.vatAmount, 0),
            totalAmount: toNum(o.totalAmount, 0),
            notes: o.notes || null,
            stockTxId: o.stockTxId || null,
            createdAt: o.createdAt ? String(o.createdAt) : new Date().toISOString(),
            updatedAt: o.updatedAt ? String(o.updatedAt) : null,
          },
        });

        await prisma.webshopOrderItem.deleteMany({
          where: { orderId: String(o.id) },
        });
        if (Array.isArray(o.items)) {
          for (const it of o.items) {
            await prisma.webshopOrderItem.create({
              data: {
                id: String(it.id),
                orderId: String(o.id),
                productId: it.productId || '',
                productSku: it.productSku || '',
                productName: it.productName || '',
                qty: toNum(it.qty, 0),
                uomId: it.uomId || '',
                uomName: it.uomName || '',
                unitPrice: toNum(it.unitPrice, 0),
                totalPrice: toNum(it.totalPrice, 0),
              },
            });
          }
        }
      }
      await prisma.webshopOrder.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'webshopProductConfigs' && Array.isArray(value)) {
      const pids = value.map((c: any) => String(c.productId));
      for (const c of value) {
        const prodExists = await prisma.product.findUnique({
          where: { id: String(c.productId) },
          select: { id: true },
        });
        if (!prodExists) continue;
        await prisma.webshopProductConfig.upsert({
          where: { productId: String(c.productId) },
          update: {
            isPublished: Boolean(c.isPublished),
            retailPrice: toNum(c.retailPrice, 0),
            promoPrice: c.promoPrice !== undefined ? toNum(c.promoPrice, 0) : null,
            shortDescription: c.shortDescription || null,
            badge: c.badge || null,
            isFeatured: Boolean(c.isFeatured),
          },
          create: {
            productId: String(c.productId),
            isPublished: Boolean(c.isPublished),
            retailPrice: toNum(c.retailPrice, 0),
            promoPrice: c.promoPrice !== undefined ? toNum(c.promoPrice, 0) : null,
            shortDescription: c.shortDescription || null,
            badge: c.badge || null,
            isFeatured: Boolean(c.isFeatured),
          },
        });
      }
      await prisma.webshopProductConfig.deleteMany({
        where: { productId: { notIn: pids } },
      });
    } else if (key === 'webshopStoreConfig' && typeof value === 'object') {
      await prisma.webshopStoreConfig.upsert({
        where: { id: 1 },
        update: {
          storeName: value.storeName || '',
          storeSlogan: value.storeSlogan || '',
          hotline: value.hotline || '',
          email: value.email || '',
          address: value.address || '',
          defaultWarehouseId: value.defaultWarehouseId || '',
          autoCreateStockOut: Boolean(value.autoCreateStockOut),
          allowOrderWhenOutOfStock: Boolean(value.allowOrderWhenOutOfStock),
          bankName: value.bankName || '',
          bankAccount: value.bankAccount || '',
          bankOwner: value.bankOwner || '',
          bannerTitle: value.bannerTitle || '',
          bannerSubtitle: value.bannerSubtitle || '',
          zaloNumber: value.zaloNumber || '',
          supportHours: value.supportHours || '',
          chatWelcomeMessage: value.chatWelcomeMessage || '',
          enableSupportWidget: Boolean(value.enableSupportWidget ?? true),
        },
        create: {
          id: 1,
          storeName: value.storeName || '',
          storeSlogan: value.storeSlogan || '',
          hotline: value.hotline || '',
          email: value.email || '',
          address: value.address || '',
          defaultWarehouseId: value.defaultWarehouseId || '',
          autoCreateStockOut: Boolean(value.autoCreateStockOut),
          allowOrderWhenOutOfStock: Boolean(value.allowOrderWhenOutOfStock),
          bankName: value.bankName || '',
          bankAccount: value.bankAccount || '',
          bankOwner: value.bankOwner || '',
          bannerTitle: value.bannerTitle || '',
          bannerSubtitle: value.bannerSubtitle || '',
          zaloNumber: value.zaloNumber || '',
          supportHours: value.supportHours || '',
          chatWelcomeMessage: value.chatWelcomeMessage || '',
          enableSupportWidget: Boolean(value.enableSupportWidget ?? true),
        },
      });
    } else if (key === 'roles' && Array.isArray(value)) {
      for (const r of value) {
        await prisma.role.upsert({
          where: { id: String(r.id) },
          update: {
            name: r.name || '',
            description: r.description || null,
            color: r.color || '#10b981',
            isSystem: Boolean(r.isSystem),
            permissions: r.permissions || [],
          },
          create: {
            id: String(r.id),
            name: r.name || '',
            description: r.description || null,
            color: r.color || '#10b981',
            isSystem: Boolean(r.isSystem),
            permissions: r.permissions || [],
          },
        });
      }
    } else if (key === 'users' && Array.isArray(value)) {
      const ids = value.map((u: any) => String(u.id));
      for (const u of value) {
        await prisma.user.upsert({
          where: { id: String(u.id) },
          update: {
            username: u.username || String(u.id),
            password: u.password || '123',
            fullName: u.fullName || '',
            email: u.email || '',
            phone: u.phone || '',
            roleId: u.roleId || 'ADMIN',
            status: u.status || 'ACTIVE',
            avatarUrl: u.avatarUrl || null,
            createdAt: u.createdAt || null,
            lastLogin: u.lastLogin || null,
          },
          create: {
            id: String(u.id),
            username: u.username || String(u.id),
            password: u.password || '123',
            fullName: u.fullName || '',
            email: u.email || '',
            phone: u.phone || '',
            roleId: u.roleId || 'ADMIN',
            status: u.status || 'ACTIVE',
            avatarUrl: u.avatarUrl || null,
            createdAt: u.createdAt || null,
            lastLogin: u.lastLogin || null,
          },
        });
      }
      await prisma.user.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else if (key === 'companyInfo' && typeof value === 'object') {
      await prisma.companyInfo.upsert({
        where: { id: 1 },
        update: {
          name: value.name || '',
          taxCode: value.taxCode || '',
          address: value.address || '',
          bankAccount: value.bankAccount || '',
          bankName: value.bankName || '',
          logoUrl: value.logoUrl || null,
          updatedAt: new Date(),
        },
        create: {
          id: 1,
          name: value.name || '',
          taxCode: value.taxCode || '',
          address: value.address || '',
          bankAccount: value.bankAccount || '',
          bankName: value.bankName || '',
          logoUrl: value.logoUrl || null,
        },
      });
    } else if (key === 'systemConfig' && typeof value === 'object') {
      await prisma.systemConfig.upsert({
        where: { id: 1 },
        update: {
          allowNegativeStock: Boolean(value.allowNegativeStock),
          defaultVatRate: toNum(value.defaultVatRate, 10),
          autoApproveQuotation: Boolean(value.autoApproveQuotation),
          themeColor: value.themeColor || '#10b981',
          updatedAt: new Date(),
        },
        create: {
          id: 1,
          allowNegativeStock: Boolean(value.allowNegativeStock),
          defaultVatRate: toNum(value.defaultVatRate, 10),
          autoApproveQuotation: Boolean(value.autoApproveQuotation),
          themeColor: value.themeColor || '#10b981',
        },
      });
    } else if (key === 'sequenceConfig' && Array.isArray(value)) {
      for (const s of value) {
        await prisma.sequenceConfig.upsert({
          where: { type: String(s.type) },
          update: {
            prefix: s.prefix || String(s.type),
            digits: Number(s.digits || 4),
            currentNumber: Number(s.currentNumber || 1),
          },
          create: {
            type: String(s.type),
            prefix: s.prefix || String(s.type),
            digits: Number(s.digits || 4),
            currentNumber: Number(s.currentNumber || 1),
          },
        });
      }
    } else if (key === 'printTemplates' && Array.isArray(value)) {
      for (const pt of value) {
        await prisma.printTemplate.upsert({
          where: { type: String(pt.type) },
          update: {
            name: pt.name || '',
            title: pt.title || '',
            headerHtml: pt.headerHtml || '',
            footerHtml: pt.footerHtml || '',
          },
          create: {
            type: String(pt.type),
            name: pt.name || '',
            title: pt.title || '',
            headerHtml: pt.headerHtml || '',
            footerHtml: pt.footerHtml || '',
          },
        });
      }
    }
  } catch (err) {
    console.warn(`Prisma syncCollectionViaPrisma (${key}) warning:`, err);
  }
}
