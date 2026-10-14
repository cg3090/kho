/**
 * HONO FULLSTACK API ROUTER FOR CLOUDFLARE PAGES / WORKERS & D1
 * Hệ thống Quản trị Kho Thông minh (WMS) & Kế toán Doanh nghiệp (TT 133/200)
 *
 * TÍNH NĂNG CHÍNH:
 * - Chuẩn Hono Web Standard API (Hoạt động hoàn hảo trên Cloudflare Workers & Pages)
 * - Tích hợp Drizzle ORM trên Cloudflare D1 với chuẩn số nguyên VNĐ (Zero Floating-Point Error)
 * - Ứng dụng Database Transaction (db.transaction) bảo vệ toàn vẹn Tồn kho & Sổ sách Kế toán
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eq, sql, and } from 'drizzle-orm';
import { getDb, CloudflareEnv } from '../db/d1Client';
import * as schema from '../db/schema';
import { toVndInteger } from '../db/schema';
import { verifyPassword, toStoredPassword, generateTemporaryPassword } from '../utils/password';
import { executeStockTransaction } from './services/stockTransactionService';
import { executePaymentTransaction } from './services/paymentService';
import { executeCreateWebshopOrder } from './services/webshopOrderService';

export const app = new Hono<{ Bindings: CloudflareEnv }>();

// Enable CORS for API requests
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    framework: 'Hono',
    database: 'Cloudflare D1 (SQLite)',
    orm: 'Drizzle ORM',
    currencyStandard: 'VND Integer',
    timestamp: new Date().toISOString(),
  });
});

// Database status
app.get('/api/db/status', async (c) => {
  try {
    const db = getDb(c.env);
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
    const [prodCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.products);
    return c.json({
      connected: true,
      driver: 'cloudflare-d1',
      orm: 'drizzle',
      database: 'Cloudflare D1 Edge SQLite',
      currency: 'VND (Integer standard)',
      tables: {
        users: Number(userCount?.count || 0),
        products: Number(prodCount?.count || 0),
      },
      message: 'Kết nối đến Cloudflare D1 thành công. Dữ liệu sẵn sàng để truy vấn.',
    });
  } catch (err: any) {
    return c.json({
      connected: false,
      error: err?.message || 'Không thể kết nối cơ sở dữ liệu Cloudflare D1',
    }, 500);
  }
});

// Table inspection endpoint
app.get('/api/db/table/:name', async (c) => {
  try {
    const tableName = c.req.param('name');
    const db = getDb(c.env);
    
    // Validate table exists in schema
    const allowedTables = [
      'users', 'roles', 'categories', 'uoms', 'warehouses', 'suppliers', 'customers',
      'products', 'inventory_stock', 'stock_transactions', 'stock_transaction_details',
      'chart_of_accounts', 'account_mappings', 'quotations', 'quotation_details',
      'journal_entries', 'journal_entry_lines', 'debts', 'payments', 'vat_ledger',
      'fiscal_closings', 'webshop_store_config', 'webshop_product_configs',
      'webshop_orders', 'webshop_order_items', 'webshop_customer_accounts', 'system_config', 'company_info',
      'sequence_configs', 'print_templates', 'erp_collections'
    ];
    
    if (!allowedTables.includes(tableName)) {
      return c.json({ success: false, error: 'Bảng không hợp lệ' }, 400);
    }
    
    // Dynamic table access (schema exports use camelCase identifiers)
    const camelName = tableName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const table = (schema as any)[camelName] || (schema as any)[tableName];
    if (!table) {
      return c.json({ success: false, error: 'Bảng không tồn tại trong schema' }, 404);
    }
    
    const rows = await db.select().from(table).limit(100);
    return c.json({ success: true, rows, table: tableName, count: rows.length });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi truy vấn bảng' }, 500);
  }
});

// =========================================================================
// AUTHENTICATION ROUTES (DATA THẬT TỪ BẢNG USERS)
// =========================================================================

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' }, 400);
    }

    const db = getDb(c.env);
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, String(username).trim()))
      .limit(1);

    if (!user) {
      return c.json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' }, 401);
    }

    if (user.status === 'LOCKED') {
      return c.json({ success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' }, 403);
    }

    const isValid = verifyPassword(String(password), user.password);
    if (!isValid) {
      return c.json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' }, 401);
    }

    // Cập nhật thời điểm đăng nhập gần nhất
    const nowIso = new Date().toISOString();
    await db
      .update(schema.users)
      .set({ lastLogin: nowIso })
      .where(eq(schema.users.id, user.id));

    // Lấy thông tin vai trò
    let userRole = null;
    if (user.roleId) {
      const [r] = await db
        .select()
        .from(schema.roles)
        .where(eq(schema.roles.id, user.roleId))
        .limit(1);
      userRole = r;
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      roleId: user.roleId || 'ADMIN',
      status: user.status || 'ACTIVE',
      avatarUrl: user.avatarUrl || undefined,
      createdAt: user.createdAt || nowIso,
      lastLogin: nowIso,
      mustChangePassword: Boolean(user.mustChangePassword),
      isTemporaryPassword: Boolean(user.isTemporaryPassword),
      role: userRole ? {
        id: userRole.id,
        name: userRole.name,
        permissions: typeof userRole.permissions === 'string' ? JSON.parse(userRole.permissions || '[]') : userRole.permissions,
      } : undefined,
    };

    const token = `cf-token-${user.id}-${Date.now()}`;

    return c.json({
      success: true,
      token,
      user: safeUser,
      message: 'Đăng nhập thành công',
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi xử lý đăng nhập' }, 500);
  }
});

app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const parts = token.split('-');
    const userId = parts[2]; // cf-token-usr-id-timestamp

    const db = getDb(c.env);
    let user = null;
    if (userId) {
      const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      user = u;
    }

    if (!user) {
      const [admin] = await db.select().from(schema.users).where(eq(schema.users.roleId, 'ADMIN')).limit(1);
      user = admin;
    }

    if (!user) {
      return c.json({ error: 'Không tìm thấy tài khoản người dùng' }, 404);
    }

    return c.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      roleId: user.roleId || 'ADMIN',
      status: user.status || 'ACTIVE',
      avatarUrl: user.avatarUrl || undefined,
      mustChangePassword: Boolean(user.mustChangePassword),
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Lỗi xác thực' }, 500);
  }
});

app.post('/api/auth/logout', (c) => {
  return c.json({ success: true, message: 'Đăng xuất thành công' });
});

// Đổi mật khẩu
const handlePasswordChange = async (c: any) => {
  try {
    const body = await c.req.json();
    const userId = c.req.param('id') || body.userId;
    const { oldPassword, newPassword } = body;

    if (!userId || !newPassword) {
      return c.json({ success: false, error: 'Vui lòng cung cấp mật khẩu mới' }, 400);
    }

    if (String(newPassword).length < 6) {
      return c.json({ success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' }, 400);
    }

    const db = getDb(c.env);
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

    if (!user) {
      return c.json({ success: false, error: 'Không tìm thấy người dùng' }, 404);
    }

    if (oldPassword && !verifyPassword(oldPassword, user.password)) {
      return c.json({ success: false, error: 'Mật khẩu hiện tại không chính xác' }, 400);
    }

    const hashed = toStoredPassword(newPassword);
    await db
      .update(schema.users)
      .set({
        password: hashed,
        mustChangePassword: false,
        isTemporaryPassword: false,
      })
      .where(eq(schema.users.id, userId));

    return c.json({
      success: true,
      message: 'Đổi mật khẩu thành công.',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        mustChangePassword: false,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi đổi mật khẩu' }, 500);
  }
};

app.post('/api/auth/change-password', handlePasswordChange);
app.post('/api/change-password', handlePasswordChange);
app.post('/api/users/:id/change-password', handlePasswordChange);
app.post('/api/users/:id/password', handlePasswordChange);

// =========================================================================
// USERS & ROLES CRUD
// =========================================================================

app.get('/api/users', async (c) => {
  try {
    const db = getDb(c.env);
    const allUsers = await db.select().from(schema.users);
    return c.json(allUsers.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email || '',
      phone: u.phone || '',
      roleId: u.roleId || 'ADMIN',
      status: u.status || 'ACTIVE',
      avatarUrl: u.avatarUrl || undefined,
      createdAt: u.createdAt || '',
      lastLogin: u.lastLogin || undefined,
      mustChangePassword: Boolean(u.mustChangePassword),
    })));
  } catch (err: any) {
    return c.json({ error: err?.message || 'Lỗi tải danh sách người dùng' }, 500);
  }
});

app.get('/api/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c.env);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!u) return c.json({ error: 'Không tìm thấy người dùng' }, 404);
    return c.json({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email || '',
      phone: u.phone || '',
      roleId: u.roleId || 'ADMIN',
      status: u.status || 'ACTIVE',
      avatarUrl: u.avatarUrl || undefined,
      createdAt: u.createdAt || '',
      lastLogin: u.lastLogin || undefined,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Lỗi truy vấn người dùng' }, 500);
  }
});

app.post('/api/users', async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c.env);
    const id = body.id || `usr-${Date.now()}`;
    const rawPassword = body.password || '123';
    const hashedPassword = toStoredPassword(rawPassword);

    await db.insert(schema.users).values({
      id,
      username: body.username,
      password: hashedPassword,
      fullName: body.fullName || body.username,
      email: body.email || '',
      phone: body.phone || '',
      roleId: body.roleId || 'KHO',
      status: body.status || 'ACTIVE',
      avatarUrl: body.avatarUrl || null,
      mustChangePassword: Boolean(body.mustChangePassword),
    });

    return c.json({ success: true, id }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi tạo người dùng' }, 500);
  }
});

app.put('/api/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c.env);

    const updateData: any = {};
    if (body.fullName !== undefined) updateData.fullName = body.fullName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.roleId !== undefined) updateData.roleId = body.roleId;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
    if (body.password) updateData.password = toStoredPassword(body.password);

    await db.update(schema.users).set(updateData).where(eq(schema.users.id, id));
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi cập nhật người dùng' }, 500);
  }
});

app.post('/api/users/:id/reset-password', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c.env);
    const tempPass = generateTemporaryPassword(8);
    const hashed = toStoredPassword(tempPass);

    await db
      .update(schema.users)
      .set({
        password: hashed,
        mustChangePassword: true,
        isTemporaryPassword: true,
      })
      .where(eq(schema.users.id, id));

    return c.json({
      success: true,
      temporaryPassword: tempPass,
      message: `Đã đặt lại mật khẩu tạm thời thành công: ${tempPass}`,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi đặt lại mật khẩu' }, 500);
  }
});

app.post('/api/users/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const db = getDb(c.env);
    await db.update(schema.users).set({ status }).where(eq(schema.users.id, id));
    return c.json({ success: true, status });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi cập nhật trạng thái' }, 500);
  }
});

app.get('/api/roles', async (c) => {
  try {
    const db = getDb(c.env);
    const allRoles = await db.select().from(schema.roles);
    return c.json(allRoles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      color: r.color || '#10b981',
      isSystem: Boolean(r.isSystem),
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '[]') : r.permissions,
    })));
  } catch (err: any) {
    return c.json({ error: err?.message || 'Lỗi tải danh sách vai trò' }, 500);
  }
});

// =========================================================================
// WAREHOUSE & ACCOUNTING TRANSACTIONS (ỨNG DỤNG DB TRANSACTION)
// =========================================================================

// Giao dịch Nhập/Xuất kho với Database Transaction
app.post('/api/stock-transactions', async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c.env);
    const result = await executeStockTransaction(db, body);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi thực thi giao dịch kho' }, 400);
  }
});

// Phiếu Thu / Chi với Database Transaction
app.post('/api/payments', async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c.env);
    const result = await executePaymentTransaction(db, body);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi thực thi phiếu thanh toán' }, 400);
  }
});

// Đơn hàng Webshop với Database Transaction
app.post('/api/webshop/orders', async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c.env);
    const result = await executeCreateWebshopOrder(db, body);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi tạo đơn hàng Webshop' }, 400);
  }
});

app.get('/api/webshop/orders', async (c) => {
  try {
    const db = getDb(c.env);
    const orders = await db.select().from(schema.webshopOrders);
    const items = await db.select().from(schema.webshopOrderItems);

    const itemsByOrder = new Map<string, any[]>();
    for (const it of items) {
      if (!it.orderId) continue;
      const list = itemsByOrder.get(it.orderId) || [];
      list.push(it);
      itemsByOrder.set(it.orderId, list);
    }

    const fullOrders = orders.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || [],
    }));

    return c.json(fullOrders);
  } catch (err: any) {
    return c.json({ error: err?.message || 'Lỗi tải đơn hàng' }, 500);
  }
});

// =========================================================================
// FULL STATE SYNC & COLLECTION ROUTES
// =========================================================================

// Load Full ERP State from Cloudflare D1
app.get('/api/db/state', async (c) => {
  try {
    const db = getDb(c.env);

    // Truy vấn song song tất cả 29 bảng dữ liệu quan hệ từ Cloudflare D1
    const [
      cats,
      uomList,
      whs,
      sups,
      custs,
      prods,
      stocks,
      stxs,
      stxDetails,
      coaList,
      mappings,
      quots,
      quotDetails,
      jes,
      jeLines,
      debtList,
      payList,
      vats,
      fiscals,
      wsStore,
      wsProds,
      wsAccounts,
      wsOrders,
      wsOrderItems,
      roleList,
      userList,
      sysCfg,
      compInfo,
      seqs,
      pts,
    ] = await Promise.all([
      db.select().from(schema.categories),
      db.select().from(schema.uoms),
      db.select().from(schema.warehouses),
      db.select().from(schema.suppliers),
      db.select().from(schema.customers),
      db.select().from(schema.products),
      db.select().from(schema.inventoryStock),
      db.select().from(schema.stockTransactions),
      db.select().from(schema.stockTransactionDetails),
      db.select().from(schema.chartOfAccounts),
      db.select().from(schema.accountMappings),
      db.select().from(schema.quotations),
      db.select().from(schema.quotationDetails),
      db.select().from(schema.journalEntries),
      db.select().from(schema.journalEntryLines),
      db.select().from(schema.debts),
      db.select().from(schema.payments),
      db.select().from(schema.vatLedger),
      db.select().from(schema.fiscalClosings),
      db.select().from(schema.webshopStoreConfig).limit(1),
      db.select().from(schema.webshopProductConfigs),
      db.select().from(schema.webshopCustomerAccounts),
      db.select().from(schema.webshopOrders),
      db.select().from(schema.webshopOrderItems),
      db.select().from(schema.roles),
      db.select().from(schema.users),
      db.select().from(schema.systemConfig).limit(1),
      db.select().from(schema.companyInfo).limit(1),
      db.select().from(schema.sequenceConfigs),
      db.select().from(schema.printTemplates),
    ]);

    // Nhóm chi tiết theo chứng từ cha
    const stxDetailsMap = new Map<string, any[]>();
    for (const d of stxDetails) {
      const list = stxDetailsMap.get(d.txId) || [];
      list.push(d);
      stxDetailsMap.set(d.txId, list);
    }

    const quotDetailsMap = new Map<string, any[]>();
    for (const q of quotDetails) {
      const list = quotDetailsMap.get(q.quotationId) || [];
      list.push(q);
      quotDetailsMap.set(q.quotationId, list);
    }

    const jeLinesMap = new Map<string, any[]>();
    for (const l of jeLines) {
      if (!l.entryId) continue;
      const list = jeLinesMap.get(l.entryId) || [];
      list.push(l);
      jeLinesMap.set(l.entryId, list);
    }

    const wsItemsMap = new Map<string, any[]>();
    for (const it of wsOrderItems) {
      if (!it.orderId) continue;
      const list = wsItemsMap.get(it.orderId) || [];
      list.push(it);
      wsItemsMap.set(it.orderId, list);
    }

    const state: Record<string, any> = {
      categories: cats,
      uoms: uomList,
      warehouses: whs,
      suppliers: sups,
      customers: custs,
      products: prods.map((p) => ({
        ...p,
        averageCost: toVndInteger(p.averageCost),
      })),
      inventoryStock: stocks,
      stockTransactions: stxs.map((t) => ({
        ...t,
        subtotal: toVndInteger(t.subtotal),
        vatAmount: toVndInteger(t.vatAmount),
        totalAmount: toVndInteger(t.totalAmount),
        prepaidAmount: toVndInteger(t.prepaidAmount),
        details: stxDetailsMap.get(t.id) || [],
      })),
      stockTransactionDetails: stxDetails,
      coa: coaList,
      accountMapping: mappings,
      quotations: quots.map((q) => ({
        ...q,
        subtotal: toVndInteger(q.subtotal),
        vatAmount: toVndInteger(q.vatAmount),
        totalAmount: toVndInteger(q.totalAmount),
        details: quotDetailsMap.get(q.id) || [],
      })),
      journalEntries: jes.map((j) => ({
        ...j,
        lines: jeLinesMap.get(j.id) || [],
      })),
      journalLines: jeLines,
      debts: debtList.map((d) => ({
        ...d,
        amount: toVndInteger(d.amount),
        paidAmount: toVndInteger(d.paidAmount),
      })),
      payments: payList.map((p) => ({
        ...p,
        amount: toVndInteger(p.amount),
      })),
      vatLedger: vats.map((v) => ({
        ...v,
        amountBeforeVat: toVndInteger(v.amountBeforeVat),
        vatAmount: toVndInteger(v.vatAmount),
      })),
      fiscalClosings: fiscals,
      webshopStoreConfig: wsStore[0] || undefined,
      webshopProductConfigs: wsProds,
      webshopCustomerAccounts: wsAccounts,
      webshopOrders: wsOrders.map((o) => ({
        ...o,
        subtotal: toVndInteger(o.subtotal),
        totalAmount: toVndInteger(o.totalAmount),
        items: wsItemsMap.get(o.id) || [],
      })),
      roles: roleList.map((r) => ({
        ...r,
        permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '[]') : r.permissions,
      })),
      users: userList.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email || '',
        phone: u.phone || '',
        roleId: u.roleId || 'ADMIN',
        status: u.status || 'ACTIVE',
        avatarUrl: u.avatarUrl || undefined,
        createdAt: u.createdAt || '',
        lastLogin: u.lastLogin || undefined,
        mustChangePassword: Boolean(u.mustChangePassword),
      })),
      systemConfig: sysCfg[0] || undefined,
      companyInfo: compInfo[0] ? { ...compInfo[0], logoUrl: undefined } : undefined,
      sequenceConfigs: seqs,
      printTemplates: pts,
    };

     return c.json({
       connected: true,
       success: true,
       driver: 'cloudflare-d1',
       orm: 'drizzle',
       database: 'Cloudflare D1 Edge SQLite',
       data: state,
       message: 'Tải trạng thái ERP thành công.',
       ...state,
     });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Lỗi tải trạng thái ERP từ Cloudflare D1' }, 500);
  }
});

// Sync Single Collection into D1
app.post('/api/db/collection/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const payload = body.data !== undefined ? body.data : body.value !== undefined ? body.value : body;
    const db = getDb(c.env);

    // Lưu vào bảng lưu trữ KV erp_collections
    await db
      .insert(schema.erpCollections)
      .values({
        key,
        data: JSON.stringify(payload),
        payload: JSON.stringify(payload),
      })
      .onConflictDoUpdate({
        target: schema.erpCollections.key,
        set: {
          data: JSON.stringify(payload),
          payload: JSON.stringify(payload),
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
        },
      });

    return c.json({ success: true, key });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi đồng bộ collection' }, 500);
  }
});

// Sync All Collections into D1 with Database Transaction
app.post('/api/db/sync-all', async (c) => {
  try {
    const { collections } = await c.req.json();
    if (!collections || typeof collections !== 'object') {
      return c.json({ success: false, error: 'Dữ liệu không hợp lệ' }, 400);
    }

    const db = getDb(c.env);
    const env = c.env as any;
    const d1Binding = env.khodb || env.DB || env.DATABASE;
    
    // Validate và serialize
    const entries: { key: string; data: string; payload: string }[] = [];
    for (const [key, value] of Object.entries(collections)) {
      if (value === undefined) continue;
      try {
        const serialized = JSON.stringify(value);
        entries.push({ key, data: serialized, payload: serialized });
      } catch (serErr: any) {
        console.error('[sync-all] JSON.stringify failed for key:', key, serErr);
        return c.json({ success: false, error: `Lỗi serialize key "${key}": ${serErr.message}` }, 400);
      }
    }

    if (entries.length === 0) {
      return c.json({ success: true, orm: 'drizzle', database: 'cloudflare-d1', count: 0 });
    }

    // Dùng D1 batch API trực tiếp (tránh SQL BEGIN TRANSACTION không hỗ trợ)
    if (d1Binding && typeof d1Binding.batch === 'function') {
      const statements = entries.map(entry => 
        d1Binding.prepare(`
          INSERT INTO erp_collections (key, data, payload, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET
            data = excluded.data,
            payload = excluded.payload,
            updated_at = CURRENT_TIMESTAMP
        `).bind(entry.key, entry.data, entry.payload)
      );
      await d1Binding.batch(statements);
    } else {
      // Fallback: chạy tuần tự (không transaction)
      for (const entry of entries) {
        await db
          .insert(schema.erpCollections)
          .values(entry)
          .onConflictDoUpdate({
            target: schema.erpCollections.key,
            set: {
              data: entry.data,
              payload: entry.payload,
              updatedAt: sql`(CURRENT_TIMESTAMP)`,
            },
          });
      }
    }

    return c.json({ success: true, orm: 'drizzle', database: 'cloudflare-d1', count: entries.length });
  } catch (err: any) {
    const errorDetail = {
      message: err?.message,
      stack: err?.stack?.split('\n').slice(0, 5).join('\n'),
      cause: err?.cause?.message || String(err?.cause),
      name: err?.name,
      code: err?.code,
    };
    console.error('[sync-all] Error:', errorDetail);
    return c.json({ success: false, error: err?.message || 'Lỗi đồng bộ dữ liệu vào Cloudflare D1', debug: errorDetail }, 500);
  }
});

// Xóa dữ liệu mẫu, làm sạch hệ thống
app.post('/api/db/purge-mock', async (c) => {
  try {
    const db = getDb(c.env);
    await db.transaction(async (tx) => {
      // Đảm bảo chỉ giữ tài khoản quản trị viên thật
      const allUsers = await tx.select().from(schema.users);
      const mockUsernames = ['demo', 'user1', 'u-kho', 'u-ketoan', 'u-sales', 'test'];
      for (const u of allUsers) {
        if (mockUsernames.includes(u.username.toLowerCase())) {
          await tx.delete(schema.users).where(eq(schema.users.id, u.id));
        }
      }
    });
    return c.json({ success: true, message: 'Đã lọc sạch tài khoản mẫu thành công.' });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Lỗi làm sạch dữ liệu' }, 500);
  }
});

// Write to actual business tables (company_info, system_config, etc.)
app.put('/api/db/table/:name', async (c) => {
  try {
    const tableName = c.req.param('name');
    const body = await c.req.json();
    const db = getDb(c.env);
    
    const allowedTables: Record<string, any> = {
      company_info: { table: schema.companyInfo, pk: ['id'] },
      system_config: { table: schema.systemConfig, pk: ['id'] },
      categories: { table: schema.categories, pk: ['id'] },
      uoms: { table: schema.uoms, pk: ['id'] },
      warehouses: { table: schema.warehouses, pk: ['id'] },
      suppliers: { table: schema.suppliers, pk: ['id'] },
      customers: { table: schema.customers, pk: ['id'] },
      products: { table: schema.products, pk: ['id'] },
      inventory_stock: { table: schema.inventoryStock, pk: ['warehouse_id', 'product_id'] },
      stock_transactions: { table: schema.stockTransactions, pk: ['id'] },
      stock_transaction_details: { table: schema.stockTransactionDetails, pk: ['id'] },
      chart_of_accounts: { table: schema.chartOfAccounts, pk: ['code'] },
      account_mappings: { table: schema.accountMappings, pk: ['key'] },
      quotations: { table: schema.quotations, pk: ['id'] },
      quotation_details: { table: schema.quotationDetails, pk: ['id'] },
      journal_entries: { table: schema.journalEntries, pk: ['id'] },
      journal_entry_lines: { table: schema.journalEntryLines, pk: ['id'] },
      debts: { table: schema.debts, pk: ['id'] },
      payments: { table: schema.payments, pk: ['id'] },
      vat_ledger: { table: schema.vatLedger, pk: ['id'] },
      fiscal_closings: { table: schema.fiscalClosings, pk: ['id'] },
      webshop_store_config: { table: schema.webshopStoreConfig, pk: ['id'] },
      webshop_product_configs: { table: schema.webshopProductConfigs, pk: ['product_id'] },
      webshop_orders: { table: schema.webshopOrders, pk: ['id'] },
      webshop_order_items: { table: schema.webshopOrderItems, pk: ['id'] },
      webshop_customer_accounts: { table: schema.webshopCustomerAccounts, pk: ['id'] },
      sequence_configs: { table: schema.sequenceConfigs, pk: ['type'] },
      print_templates: { table: schema.printTemplates, pk: ['type'] },
      roles: { table: schema.roles, pk: ['id'] },
      users: { table: schema.users, pk: ['id'] },
      erp_collections: { table: schema.erpCollections, pk: ['key'] },
    };
    
    const tableConfig = allowedTables[tableName];
    if (!tableConfig) {
      return c.json({ success: false, error: 'Bảng không được phép ghi' }, 400);
    }
    
    const table = tableConfig.table;
    const pkArray = tableConfig.pk;
    
    // Convert snake_case keys to camelCase for Drizzle
    const toCamelCase = (obj: any) => {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = value;
      }
      return result;
    };
    
    // Convert pk array to camelCase
    const pkCamelArray = pkArray.map(pk => pk.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()));
    
    // Single record upsert (by primary key)
    const data = Array.isArray(body) ? body : [body];
    let updated = 0;
    
    for (const record of data) {
      const camelRecord = toCamelCase(record);
      
      // Build WHERE clause for composite keys
      const whereConditions = pkCamelArray.map(pk => eq((table as any)[pk], camelRecord[pk]));
      const whereClause = whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions);
      
       // Create update record EXCLUDING primary key columns
       const { ...updateRecord } = camelRecord;
       for (const pk of pkCamelArray) {
         delete updateRecord[pk];
       }

       // Convert any array fields to JSON strings (for SQLite JSON storage)
       for (const [key, value] of Object.entries(updateRecord)) {
         if (Array.isArray(value)) {
           updateRecord[key] = JSON.stringify(value);
         }
       }

       // Try update first
       const result = await db.update(table).set(updateRecord).where(whereClause);
      if ((result as any).changes === 0) {
        // Not found, insert with all fields
        await db.insert(table).values(camelRecord);
      }
      updated++;
    }
    
    return c.json({ success: true, table: tableName, updated });
  } catch (err: any) {
    console.error('[PUT table] Error:', err);
    return c.json({ success: false, error: err?.message || 'Lỗi ghi bảng' }, 500);
  }
});
