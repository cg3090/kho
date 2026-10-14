/**
 * DRIZZLE ORM SCHEMA FOR CLOUDFLARE D1 (SQLITE)
 * Hệ thống ERP Quản trị Kho Thông minh (WMS) & Kế toán Doanh nghiệp (TT 133/200)
 *
 * CHUẨN KIỂU SỐ TIỀN VNĐ (VIETNAMESE DONG):
 * - Đơn vị tiền tệ Việt Nam Đồng (VNĐ) không sử dụng đơn vị tiền lẻ (xu/cent/hào).
 * - Tất cả các cột tiền tệ (unit_price, total_amount, subtotal, vat_amount, paid_amount,
 *   cogs_total, debit, credit, retail_price...) ĐƯỢC ĐỊNH NGHĨA CHUẨN integer({ mode: 'number' })
 *   nhằm triệt tiêu 100% sai số làm tròn số thực (floating-point IEEE-754) trên Cloudflare D1.
 * - Các cột số lượng (qty, current_qty, carton_qty, uom_conversion_rate, vat_rate) sử dụng real()
 *   để hỗ trợ số lượng thập phân (ví dụ: 1.5 kg, 0.25 m2).
 */

import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/** Helper: Đảm bảo số tiền VNĐ luôn là số nguyên (Integer) chuẩn */
export function toVndInteger(val: number | string | undefined | null): number {
  if (val === undefined || val === null || isNaN(Number(val))) return 0;
  return Math.round(Number(val));
}

// 0. Bảng lưu trữ đồng bộ Collection JSON (State KV)
export const erpCollections = sqliteTable('erp_collections', {
  key: text('key', { length: 100 }).primaryKey(),
  data: text('data').notNull().default('[]'),
  payload: text('payload').notNull().default('[]'),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// 1. Cấu hình Hệ thống (System Config)
export const systemConfig = sqliteTable('system_config', {
  id: integer('id').primaryKey({ autoIncrement: false }).default(1),
  allowNegativeStock: integer('allow_negative_stock', { mode: 'boolean' }).default(false),
  defaultVatRate: real('default_vat_rate').default(10.0),
  autoApproveQuotation: integer('auto_approve_quotation', { mode: 'boolean' }).default(false),
  themeColor: text('theme_color', { length: 20 }).default('#10b981'),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// 2. Thông tin Doanh nghiệp / Pháp nhân
export const companyInfo = sqliteTable('company_info', {
  id: integer('id').primaryKey({ autoIncrement: false }).default(1),
  name: text('name', { length: 255 }).default(''),
  taxCode: text('tax_code', { length: 50 }).default(''),
  address: text('address').default(''),
  bankAccount: text('bank_account', { length: 100 }).default(''),
  bankName: text('bank_name', { length: 255 }).default(''),
  logoUrl: text('logo_url'),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// 3. Quy tắc Đánh số Chứng từ Tự động (Sequence Configs)
export const sequenceConfigs = sqliteTable('sequence_configs', {
  type: text('type', { length: 50 }).primaryKey(), // PN, PX, BG, PT, PC, WS
  prefix: text('prefix', { length: 20 }).notNull(),
  digits: integer('digits').default(4),
  currentNumber: integer('current_number').default(1),
});

// 4. Mẫu in Chứng từ (Print Templates)
export const printTemplates = sqliteTable('print_templates', {
  type: text('type', { length: 50 }).primaryKey(),
  name: text('name', { length: 100 }).notNull(),
  title: text('title', { length: 255 }).notNull(),
  headerHtml: text('header_html').notNull().default(''),
  footerHtml: text('footer_html').notNull().default(''),
});

// 5. Vai trò & Phân quyền (RBAC Roles)
export const roles = sqliteTable('roles', {
  id: text('id', { length: 50 }).primaryKey(),
  name: text('name', { length: 100 }).notNull(),
  description: text('description'),
  color: text('color', { length: 20 }).default('#10b981'),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
  permissions: text('permissions').notNull().default('[]'), // JSON array string
});

// 6. Tài khoản Người dùng (Users)
export const users = sqliteTable('users', {
  id: text('id', { length: 50 }).primaryKey(),
  username: text('username', { length: 100 }).notNull().unique(),
  password: text('password', { length: 255 }).notNull().default('123'),
  fullName: text('full_name', { length: 255 }).notNull(),
  email: text('email', { length: 255 }).default(''),
  phone: text('phone', { length: 50 }).default(''),
  roleId: text('role_id', { length: 50 }).references(() => roles.id),
  status: text('status', { length: 20 }).default('ACTIVE'), // ACTIVE | LOCKED
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at', { length: 50 }).default(sql`(CURRENT_TIMESTAMP)`),
  lastLogin: text('last_login', { length: 100 }),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).default(false),
  isTemporaryPassword: integer('is_temporary_password', { mode: 'boolean' }).default(false),
}, (table) => [
  uniqueIndex('idx_users_username').on(table.username),
]);

// 7. Nhóm Hàng hóa (Categories)
export const categories = sqliteTable('categories', {
  id: text('id', { length: 50 }).primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  description: text('description'),
});

// 8. Đơn vị tính (UOM)
export const uoms = sqliteTable('uoms', {
  id: text('id', { length: 50 }).primaryKey(),
  name: text('name', { length: 50 }).notNull(),
});

// 9. Kho bãi (Warehouses)
export const warehouses = sqliteTable('warehouses', {
  id: text('id', { length: 50 }).primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  location: text('location'),
});

// 10. Nhà cung cấp (Suppliers)
export const suppliers = sqliteTable('suppliers', {
  id: text('id', { length: 50 }).primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  taxCode: text('tax_code', { length: 100 }).default(''),
  phone: text('phone', { length: 50 }),
  address: text('address'),
});

// 11. Khách hàng (Customers)
export const customers = sqliteTable('customers', {
  id: text('id', { length: 50 }).primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  taxCode: text('tax_code', { length: 100 }).default(''),
  phone: text('phone', { length: 50 }),
  address: text('address'),
});

// 12. Danh mục Sản phẩm (Products)
export const products = sqliteTable('products', {
  id: text('id', { length: 50 }).primaryKey(),
  sku: text('sku', { length: 100 }).notNull().unique(),
  name: text('name', { length: 255 }).notNull(),
  categoryId: text('category_id', { length: 50 }).references(() => categories.id),
  uomId: text('uom_id', { length: 50 }).references(() => uoms.id),
  altUomId: text('alt_uom_id', { length: 50 }).references(() => uoms.id),
  uomConversionRate: real('uom_conversion_rate').default(1.0),
  description: text('description'),
  currentQty: real('current_qty').default(0.0),
  averageCost: integer('average_cost', { mode: 'number' }).default(0), // VNĐ Integer
  imageUrl: text('image_url'),
}, (table) => [
  uniqueIndex('idx_products_sku').on(table.sku),
  index('idx_products_category').on(table.categoryId),
]);

// 13. Tồn kho chi tiết theo Kho (Inventory Stock)
export const inventoryStock = sqliteTable('inventory_stock', {
  warehouseId: text('warehouse_id', { length: 50 }).notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: text('product_id', { length: 50 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: real('quantity').notNull().default(0.0),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  primaryKey({ columns: [table.warehouseId, table.productId] }),
]);

// 14. Hệ thống Tài khoản Kế toán (Chart of Accounts - TT 133/200)
export const chartOfAccounts = sqliteTable('chart_of_accounts', {
  code: text('code', { length: 50 }).primaryKey(), // 111, 112, 131, 156, 331, 511, 632...
  name: text('name', { length: 255 }).notNull(),
  type: text('type', { length: 20 }).notNull(), // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE | OFF_BALANCE
  parentCode: text('parent_code', { length: 50 }),
  isCustom: integer('is_custom', { mode: 'boolean' }).default(false),
});

// 15. Thiết lập Ánh xạ Tài khoản Tự động (Account Mappings)
export const accountMappings = sqliteTable('account_mappings', {
  key: text('key', { length: 100 }).primaryKey(),
  accountCode: text('account_code', { length: 50 }).references(() => chartOfAccounts.code),
  description: text('description'),
});

// 16. Báo giá Khách hàng (Quotations)
export const quotations = sqliteTable('quotations', {
  id: text('id', { length: 50 }).primaryKey(),
  referenceNo: text('reference_no', { length: 100 }).notNull().unique(),
  date: text('date').notNull().default(sql`(CURRENT_DATE)`),
  customerId: text('customer_id', { length: 50 }).references(() => customers.id),
  subtotal: integer('subtotal', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  vatRate: real('vat_rate').notNull().default(0.0),
  vatAmount: integer('vat_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  totalAmount: integer('total_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  notes: text('notes'),
  status: text('status', { length: 20 }).default('PENDING'), // PENDING | ACCEPTED | REJECTED
});

// 17. Chi tiết Báo giá (Quotation Details)
export const quotationDetails = sqliteTable('quotation_details', {
  id: text('id', { length: 50 }).primaryKey(),
  quotationId: text('quotation_id', { length: 50 }).notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  productId: text('product_id', { length: 50 }).references(() => products.id),
  qty: real('qty').notNull().default(0.0),
  uomId: text('uom_id', { length: 50 }).references(() => uoms.id),
  unitPrice: integer('unit_price', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  totalPrice: integer('total_price', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  conversionRate: real('conversion_rate').default(1.0),
});

// 18. Chứng từ Giao dịch Kho (Stock Transactions: Nhập, Xuất, Tồn đầu)
export const stockTransactions = sqliteTable('stock_transactions', {
  id: text('id', { length: 50 }).primaryKey(),
  type: text('type', { length: 15 }).notNull(), // IN | OUT | OPENING
  date: text('date').notNull().default(sql`(CURRENT_DATE)`),
  warehouseId: text('warehouse_id', { length: 50 }).references(() => warehouses.id),
  supplierId: text('supplier_id', { length: 50 }).references(() => suppliers.id),
  customerId: text('customer_id', { length: 50 }).references(() => customers.id),
  referenceNo: text('reference_no', { length: 100 }).notNull().unique(),
  vatRate: real('vat_rate').notNull().default(0.0),
  vatType: text('vat_type', { length: 20 }).notNull().default('ITEMIZED'), // ITEMIZED | GROUPED
  subtotal: integer('subtotal', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  vatAmount: integer('vat_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  totalAmount: integer('total_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  isConfirmed: integer('is_confirmed', { mode: 'boolean' }).default(false),
  isReversed: integer('is_reversed', { mode: 'boolean' }).default(false),
  reversalReference: text('reversal_reference', { length: 100 }),
  notes: text('notes'),
  prepaidAmount: integer('prepaid_amount', { mode: 'number' }).default(0), // VNĐ Integer
  prepaidMethod: text('prepaid_method', { length: 20 }), // CASH | BANK
  dueDate: text('due_date'),
  fiscalYear: integer('fiscal_year'),
  isCarryForward: integer('is_carry_forward', { mode: 'boolean' }).default(false),
  linkedClosingYear: integer('linked_closing_year'),
}, (table) => [
  uniqueIndex('idx_stock_tx_ref').on(table.referenceNo),
  index('idx_stock_tx_date').on(table.date),
  index('idx_stock_tx_type').on(table.type),
  index('idx_stock_tx_fiscal_year').on(table.fiscalYear),
]);

// 19. Chi tiết Chứng từ Giao dịch Kho (Stock Transaction Details)
export const stockTransactionDetails = sqliteTable('stock_transaction_details', {
  id: text('id', { length: 50 }).primaryKey(),
  txId: text('tx_id', { length: 50 }).notNull().references(() => stockTransactions.id, { onDelete: 'cascade' }),
  productId: text('product_id', { length: 50 }).references(() => products.id),
  qty: real('qty').notNull().default(0.0),
  unitPrice: integer('unit_price', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  totalPrice: integer('total_price', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  vatRate: real('vat_rate').notNull().default(0.0),
  vatAmount: integer('vat_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  altUomId: text('alt_uom_id', { length: 50 }).references(() => uoms.id),
  altQty: real('alt_qty'),
  altUnitPrice: integer('alt_unit_price', { mode: 'number' }), // VNĐ Integer
  cogsUnitCost: integer('cogs_unit_cost', { mode: 'number' }).default(0), // VNĐ Integer
  cogsTotal: integer('cogs_total', { mode: 'number' }).default(0), // VNĐ Integer
  cartonQty: real('carton_qty').default(0.0),
}, (table) => [
  index('idx_stock_tx_details_tx').on(table.txId),
  index('idx_stock_tx_details_prod').on(table.productId),
]);

// 20. Sổ Nhật ký chung Kế toán (Journal Entries - TT 133/200)
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id', { length: 50 }).primaryKey(),
  date: text('date').notNull().default(sql`(CURRENT_DATE)`),
  referenceNo: text('reference_no', { length: 100 }).notNull(),
  description: text('description').notNull(),
  isReversed: integer('is_reversed', { mode: 'boolean' }).default(false),
  reversalReference: text('reversal_reference', { length: 100 }),
  isClosingEntry: integer('is_closing_entry', { mode: 'boolean' }).default(false),
  fiscalYear: integer('fiscal_year'),
}, (table) => [
  index('idx_journal_entries_date').on(table.date),
]);

// 21. Chi tiết Bút toán Nợ / Có (Journal Entry Lines)
export const journalEntryLines = sqliteTable('journal_entry_lines', {
  id: text('id', { length: 50 }).primaryKey(),
  entryId: text('entry_id', { length: 50 }).notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountCode: text('account_code', { length: 50 }).references(() => chartOfAccounts.code),
  debit: integer('debit', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  credit: integer('credit', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  partnerId: text('partner_id', { length: 50 }),
  partnerType: text('partner_type', { length: 20 }), // SUPPLIER | CUSTOMER
}, (table) => [
  index('idx_journal_lines_entry').on(table.entryId),
  index('idx_journal_lines_account').on(table.accountCode),
]);

// 22. Quản lý Công nợ Phải thu & Phải trả (Debts: AR / AP)
export const debts = sqliteTable('debts', {
  id: text('id', { length: 50 }).primaryKey(),
  type: text('type', { length: 10 }).notNull(), // AR (Phải thu) | AP (Phải trả)
  partnerId: text('partner_id', { length: 50 }).notNull(),
  txId: text('tx_id', { length: 50 }).references(() => stockTransactions.id),
  referenceNo: text('reference_no', { length: 100 }).notNull(),
  date: text('date').notNull().default(sql`(CURRENT_DATE)`),
  amount: integer('amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  paidAmount: integer('paid_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  status: text('status', { length: 20 }).default('UNPAID'), // UNPAID | PARTIAL | PAID
  isReversed: integer('is_reversed', { mode: 'boolean' }).default(false),
  reversalReference: text('reversal_reference', { length: 100 }),
  dueDate: text('due_date'),
}, (table) => [
  index('idx_debts_partner').on(table.partnerId, table.type),
  index('idx_debts_status').on(table.status),
]);

// 23. Phiếu Thu / Phiếu Chi (Payments: PT / PC)
export const payments = sqliteTable('payments', {
  id: text('id', { length: 50 }).primaryKey(),
  type: text('type', { length: 10 }).notNull(), // RECEIVE (Thu) | PAY (Chi)
  debtId: text('debt_id', { length: 50 }).references(() => debts.id),
  partnerId: text('partner_id', { length: 50 }).notNull(),
  partnerType: text('partner_type', { length: 20 }).notNull(), // SUPPLIER | CUSTOMER
  date: text('date').notNull().default(sql`(CURRENT_DATE)`),
  amount: integer('amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  method: text('method', { length: 20 }).notNull(), // CASH | BANK | OTHER
  referenceNo: text('reference_no', { length: 100 }).notNull().unique(),
  notes: text('notes'),
}, (table) => [
  uniqueIndex('idx_payments_ref').on(table.referenceNo),
  index('idx_payments_date').on(table.date),
]);

// 24. Sổ theo dõi Thuế GTGT (VAT Ledger)
export const vatLedger = sqliteTable('vat_ledger', {
  id: text('id', { length: 50 }).primaryKey(),
  type: text('type', { length: 10 }).notNull(), // INPUT (Đầu vào) | OUTPUT (Đầu ra)
  date: text('date').notNull().default(sql`(CURRENT_DATE)`),
  txId: text('tx_id', { length: 50 }).references(() => stockTransactions.id),
  invoiceNo: text('invoice_no', { length: 100 }).notNull(),
  partnerName: text('partner_name', { length: 255 }).notNull(),
  partnerTaxCode: text('partner_tax_code', { length: 100 }).notNull(),
  amountBeforeVat: integer('amount_before_vat', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  vatRate: real('vat_rate').notNull().default(0.0),
  vatAmount: integer('vat_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  accountCode: text('account_code', { length: 50 }).references(() => chartOfAccounts.code),
  isReversed: integer('is_reversed', { mode: 'boolean' }).default(false),
}, (table) => [
  index('idx_vat_ledger_type').on(table.type),
  index('idx_vat_ledger_date').on(table.date),
]);

// 25. Khóa sổ Cuối năm & Kết chuyển (Fiscal Year Closings)
export const fiscalClosings = sqliteTable('fiscal_closings', {
  id: text('id', { length: 50 }).primaryKey(),
  fiscalYear: integer('fiscal_year').notNull().unique(),
  closingDate: text('closing_date').notNull(),
  closedAt: text('closed_at', { length: 50 }).notNull(),
  closedBy: text('closed_by', { length: 100 }).notNull(),
  status: text('status', { length: 20 }).default('LOCKED'), // LOCKED | UNLOCKED
  closingJournalEntryId: text('closing_journal_entry_id', { length: 50 }),
  nextYearOpeningTxIds: text('next_year_opening_tx_ids').notNull().default('[]'),
  totalRevenueTransferred: integer('total_revenue_transferred', { mode: 'number' }).default(0), // VNĐ Integer
  totalCogsTransferred: integer('total_cogs_transferred', { mode: 'number' }).default(0), // VNĐ Integer
  totalExpenseTransferred: integer('total_expense_transferred', { mode: 'number' }).default(0), // VNĐ Integer
  taxAmountTransferred: integer('tax_amount_transferred', { mode: 'number' }).default(0), // VNĐ Integer
  netProfitTransferred: integer('net_profit_transferred', { mode: 'number' }).default(0), // VNĐ Integer
  totalClosingStockQty: real('total_closing_stock_qty').default(0.0),
  totalClosingStockValue: integer('total_closing_stock_value', { mode: 'number' }).default(0), // VNĐ Integer
  stockSnapshots: text('stock_snapshots').notNull().default('[]'),
  notes: text('notes'),
});

// 26. Cấu hình Cửa hàng Webshop (Webshop Store Config)
export const webshopStoreConfig = sqliteTable('webshop_store_config', {
  id: integer('id').primaryKey({ autoIncrement: false }).default(1),
  storeName: text('store_name', { length: 255 }).default(''),
  storeSlogan: text('store_slogan').default(''),
  hotline: text('hotline', { length: 100 }).default(''),
  email: text('email', { length: 255 }).default(''),
  address: text('address').default(''),
  defaultWarehouseId: text('default_warehouse_id', { length: 50 }).default(''),
  autoCreateStockOut: integer('auto_create_stock_out', { mode: 'boolean' }).default(true),
  allowOrderWhenOutOfStock: integer('allow_order_when_out_of_stock', { mode: 'boolean' }).default(false),
  bankName: text('bank_name', { length: 255 }).default(''),
  bankAccount: text('bank_account', { length: 100 }).default(''),
  bankOwner: text('bank_owner', { length: 255 }).default(''),
  bannerTitle: text('banner_title').default(''),
  bannerSubtitle: text('banner_subtitle').default(''),
  zaloNumber: text('zalo_number', { length: 50 }).default(''),
  supportHours: text('support_hours', { length: 100 }).default(''),
  chatWelcomeMessage: text('chat_welcome_message').default(''),
  enableSupportWidget: integer('enable_support_widget', { mode: 'boolean' }).default(true),
});

// 27. Tài khoản Khách hàng Webshop (Webshop Customer Accounts)
export const webshopCustomerAccounts = sqliteTable('webshop_customer_accounts', {
  id: text('id', { length: 50 }).primaryKey(),
  username: text('username', { length: 100 }).notNull().unique(),
  email: text('email', { length: 255 }).notNull().unique(),
  phone: text('phone', { length: 50 }).notNull().unique(),
  fullName: text('full_name', { length: 255 }).notNull(),
  address: text('address'),
  password: text('password', { length: 255 }).notNull(),
  customerId: text('customer_id', { length: 50 }).references(() => customers.id, { onDelete: 'set null' }),
  wishlist: text('wishlist').default('[]'),
  createdAt: text('created_at', { length: 50 }).default(sql`(CURRENT_TIMESTAMP)`),
  lastLogin: text('last_login', { length: 50 }),
}, (table) => [
  uniqueIndex('idx_ws_cust_accounts_username').on(table.username),
  uniqueIndex('idx_ws_cust_accounts_phone').on(table.phone),
  uniqueIndex('idx_ws_cust_accounts_email').on(table.email),
  index('idx_ws_cust_accounts_customer').on(table.customerId),
]);

// 28. Cấu hình Sản phẩm Webshop (Webshop Product Configs)
export const webshopProductConfigs = sqliteTable('webshop_product_configs', {
  productId: text('product_id', { length: 50 }).primaryKey().references(() => products.id, { onDelete: 'cascade' }),
  isPublished: integer('is_published', { mode: 'boolean' }).default(true),
  retailPrice: integer('retail_price', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  promoPrice: integer('promo_price', { mode: 'number' }), // VNĐ Integer
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  badge: text('badge', { length: 50 }),
  shortDescription: text('short_description'),
});

// 29. Đơn Đặt hàng Webshop (Webshop Orders)
export const webshopOrders = sqliteTable('webshop_orders', {
  id: text('id', { length: 50 }).primaryKey(),
  orderCode: text('order_code', { length: 100 }).notNull().unique(),
  date: text('date').notNull().default(sql`(CURRENT_DATE)`),
  customerName: text('customer_name', { length: 255 }).notNull(),
  customerPhone: text('customer_phone', { length: 50 }).notNull(),
  customerEmail: text('customer_email', { length: 255 }),
  customerAddress: text('customer_address').notNull(),
  customerId: text('customer_id', { length: 50 }),
  accountId: text('account_id', { length: 50 }).references(() => webshopCustomerAccounts.id, { onDelete: 'set null' }),
  shippingMethod: text('shipping_method', { length: 30 }).default('STANDARD'),
  paymentMethod: text('payment_method', { length: 30 }).default('COD'),
  paymentStatus: text('payment_status', { length: 20 }).default('UNPAID'), // UNPAID | PAID
  orderStatus: text('order_status', { length: 20 }).default('PENDING'), // PENDING | CONFIRMED | SHIPPED | COMPLETED | CANCELLED
  warehouseId: text('warehouse_id', { length: 50 }),
  subtotal: integer('subtotal', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  discountAmount: integer('discount_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  shippingFee: integer('shipping_fee', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  vatRate: real('vat_rate').notNull().default(0.0),
  vatAmount: integer('vat_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  totalAmount: integer('total_amount', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  stockTxId: text('stock_tx_id', { length: 50 }),
  notes: text('notes'),
  createdAt: text('created_at', { length: 50 }).default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at', { length: 50 }),
}, (table) => [
  uniqueIndex('idx_webshop_orders_code').on(table.orderCode),
  index('idx_webshop_orders_status').on(table.orderStatus),
  index('idx_webshop_orders_account').on(table.accountId),
]);

// 30. Chi tiết Mặt hàng Đơn hàng Webshop (Webshop Order Items)
export const webshopOrderItems = sqliteTable('webshop_order_items', {
  id: text('id', { length: 50 }).primaryKey(),
  orderId: text('order_id', { length: 50 }).notNull().references(() => webshopOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id', { length: 50 }),
  productSku: text('product_sku', { length: 100 }),
  productName: text('product_name', { length: 255 }),
  qty: real('qty').notNull().default(0.0),
  uomId: text('uom_id', { length: 50 }),
  uomName: text('uom_name', { length: 50 }),
  unitPrice: integer('unit_price', { mode: 'number' }).notNull().default(0), // VNĐ Integer
  totalPrice: integer('total_price', { mode: 'number' }).notNull().default(0), // VNĐ Integer
});
