-- =========================================================================
-- DRIZZLE ORM / CLOUDFLARE D1 MIGRATION: 0000_init_wms_d1.sql
-- Hệ thống Quản trị Kho Thông minh (WMS) & Kế toán Doanh nghiệp (TT 133/200)
-- Chuẩn số nguyên VNĐ (INTEGER) trên Cloudflare D1 SQLite
-- =========================================================================

-- 0. Bảng lưu trữ đồng bộ Collection JSON (State KV)
CREATE TABLE IF NOT EXISTS erp_collections (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '[]',
  payload TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

-- 1. Cấu hình Hệ thống (System Config)
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  allow_negative_stock INTEGER DEFAULT 0,
  default_vat_rate REAL DEFAULT 10.0,
  auto_approve_quotation INTEGER DEFAULT 0,
  theme_color TEXT DEFAULT '#10b981',
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

-- 2. Thông tin Doanh nghiệp / Pháp nhân
CREATE TABLE IF NOT EXISTS company_info (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT '',
  tax_code TEXT DEFAULT '',
  address TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  logo_url TEXT,
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

-- 3. Quy tắc Đánh số Chứng từ Tự động
CREATE TABLE IF NOT EXISTS sequence_configs (
  type TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  digits INTEGER DEFAULT 4,
  current_number INTEGER DEFAULT 1
);

-- 4. Mẫu in Chứng từ
CREATE TABLE IF NOT EXISTS print_templates (
  type TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  header_html TEXT NOT NULL DEFAULT '',
  footer_html TEXT NOT NULL DEFAULT ''
);

-- 5. Vai trò & Phân quyền (RBAC Roles)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10b981',
  is_system INTEGER DEFAULT 0,
  permissions TEXT NOT NULL DEFAULT '[]'
);

-- 6. Tài khoản Người dùng (Users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT '123',
  full_name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role_id TEXT REFERENCES roles(id),
  status TEXT DEFAULT 'ACTIVE',
  avatar_url TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  last_login TEXT,
  must_change_password INTEGER DEFAULT 0,
  is_temporary_password INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 7. Danh mục Nhóm Hàng hóa
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- 8. Danh mục Đơn vị tính (UOM)
CREATE TABLE IF NOT EXISTS uoms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- 9. Danh mục Kho bãi
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT
);

-- 10. Danh mục Nhà cung cấp
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tax_code TEXT DEFAULT '',
  phone TEXT,
  address TEXT
);

-- 11. Danh mục Khách hàng
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tax_code TEXT DEFAULT '',
  phone TEXT,
  address TEXT
);

-- 12. Danh mục Sản phẩm / Hàng hóa
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  uom_id TEXT REFERENCES uoms(id),
  alt_uom_id TEXT REFERENCES uoms(id),
  uom_conversion_rate REAL DEFAULT 1.0,
  description TEXT,
  current_qty REAL DEFAULT 0.0,
  average_cost INTEGER DEFAULT 0,
  image_url TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 13. Tồn kho chi tiết theo Kho
CREATE TABLE IF NOT EXISTS inventory_stock (
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity REAL NOT NULL DEFAULT 0.0,
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (warehouse_id, product_id)
);

-- 14. Hệ thống Tài khoản Kế toán (Chart of Accounts - TT 133/200)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_code TEXT,
  is_custom INTEGER DEFAULT 0
);

-- 15. Thiết lập Ánh xạ Tài khoản Tự động
CREATE TABLE IF NOT EXISTS account_mappings (
  key TEXT PRIMARY KEY,
  account_code TEXT REFERENCES chart_of_accounts(code),
  description TEXT
);

-- 16. Báo giá Khách hàng
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  reference_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL DEFAULT (CURRENT_DATE),
  customer_id TEXT REFERENCES customers(id),
  subtotal INTEGER NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0.0,
  vat_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'PENDING'
);

-- 17. Chi tiết Báo giá
CREATE TABLE IF NOT EXISTS quotation_details (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  qty REAL NOT NULL DEFAULT 0.0,
  uom_id TEXT REFERENCES uoms(id),
  unit_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  conversion_rate REAL DEFAULT 1.0
);

-- 18. Chứng từ Giao dịch Kho (IN, OUT, OPENING)
CREATE TABLE IF NOT EXISTS stock_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (CURRENT_DATE),
  warehouse_id TEXT REFERENCES warehouses(id),
  supplier_id TEXT REFERENCES suppliers(id),
  customer_id TEXT REFERENCES customers(id),
  reference_no TEXT NOT NULL UNIQUE,
  vat_rate REAL NOT NULL DEFAULT 0.0,
  vat_type TEXT NOT NULL DEFAULT 'ITEMIZED',
  subtotal INTEGER NOT NULL DEFAULT 0,
  vat_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  is_confirmed INTEGER DEFAULT 0,
  is_reversed INTEGER DEFAULT 0,
  reversal_reference TEXT,
  notes TEXT,
  prepaid_amount INTEGER DEFAULT 0,
  prepaid_method TEXT,
  due_date TEXT,
  fiscal_year INTEGER,
  is_carry_forward INTEGER DEFAULT 0,
  linked_closing_year INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_tx_ref ON stock_transactions(reference_no);
CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON stock_transactions(date);
CREATE INDEX IF NOT EXISTS idx_stock_tx_type ON stock_transactions(type);
CREATE INDEX IF NOT EXISTS idx_stock_tx_fiscal_year ON stock_transactions(fiscal_year);

-- 19. Chi tiết Chứng từ Giao dịch Kho
CREATE TABLE IF NOT EXISTS stock_transaction_details (
  id TEXT PRIMARY KEY,
  tx_id TEXT NOT NULL REFERENCES stock_transactions(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  qty REAL NOT NULL DEFAULT 0.0,
  unit_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0.0,
  vat_amount INTEGER NOT NULL DEFAULT 0,
  alt_uom_id TEXT REFERENCES uoms(id),
  alt_qty REAL,
  alt_unit_price INTEGER,
  cogs_unit_cost INTEGER DEFAULT 0,
  cogs_total INTEGER DEFAULT 0,
  carton_qty REAL DEFAULT 0.0
);
CREATE INDEX IF NOT EXISTS idx_stock_tx_details_tx ON stock_transaction_details(tx_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_details_prod ON stock_transaction_details(product_id);

-- 20. Sổ Nhật ký chung Kế toán (Journal Entries)
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL DEFAULT (CURRENT_DATE),
  reference_no TEXT NOT NULL,
  description TEXT NOT NULL,
  is_reversed INTEGER DEFAULT 0,
  reversal_reference TEXT,
  is_closing_entry INTEGER DEFAULT 0,
  fiscal_year INTEGER
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);

-- 21. Chi tiết Bút toán Nợ / Có (Journal Entry Lines)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT REFERENCES chart_of_accounts(code),
  debit INTEGER NOT NULL DEFAULT 0,
  credit INTEGER NOT NULL DEFAULT 0,
  partner_id TEXT,
  partner_type TEXT
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_code);

-- 22. Quản lý Công nợ Phải thu (AR) & Phải trả (AP)
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  tx_id TEXT REFERENCES stock_transactions(id),
  reference_no TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (CURRENT_DATE),
  amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'UNPAID',
  is_reversed INTEGER DEFAULT 0,
  reversal_reference TEXT,
  due_date TEXT
);
CREATE INDEX IF NOT EXISTS idx_debts_partner ON debts(partner_id, type);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);

-- 23. Phiếu Thu / Phiếu Chi (Payments)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  debt_id TEXT REFERENCES debts(id),
  partner_id TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (CURRENT_DATE),
  amount INTEGER NOT NULL DEFAULT 0,
  method TEXT NOT NULL,
  reference_no TEXT NOT NULL UNIQUE,
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_ref ON payments(reference_no);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);

-- 24. Sổ theo dõi Thuế GTGT (VAT Ledger)
CREATE TABLE IF NOT EXISTS vat_ledger (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (CURRENT_DATE),
  tx_id TEXT REFERENCES stock_transactions(id),
  invoice_no TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  partner_tax_code TEXT NOT NULL,
  amount_before_vat INTEGER NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0.0,
  vat_amount INTEGER NOT NULL DEFAULT 0,
  account_code TEXT REFERENCES chart_of_accounts(code),
  is_reversed INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_vat_ledger_type ON vat_ledger(type);
CREATE INDEX IF NOT EXISTS idx_vat_ledger_date ON vat_ledger(date);

-- 25. Khóa sổ Cuối năm & Kết chuyển (Fiscal Closings)
CREATE TABLE IF NOT EXISTS fiscal_closings (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL UNIQUE,
  closing_date TEXT NOT NULL,
  closed_at TEXT NOT NULL,
  closed_by TEXT NOT NULL,
  status TEXT DEFAULT 'LOCKED',
  closing_journal_entry_id TEXT,
  next_year_opening_tx_ids TEXT NOT NULL DEFAULT '[]',
  total_revenue_transferred INTEGER DEFAULT 0,
  total_cogs_transferred INTEGER DEFAULT 0,
  total_expense_transferred INTEGER DEFAULT 0,
  tax_amount_transferred INTEGER DEFAULT 0,
  net_profit_transferred INTEGER DEFAULT 0,
  total_closing_stock_qty REAL DEFAULT 0.0,
  total_closing_stock_value INTEGER DEFAULT 0,
  stock_snapshots TEXT NOT NULL DEFAULT '[]',
  notes TEXT
);

-- 26. Cấu hình Cửa hàng Webshop (Webshop Store Config)
CREATE TABLE IF NOT EXISTS webshop_store_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  store_name TEXT DEFAULT '',
  store_slogan TEXT DEFAULT '',
  hotline TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  default_warehouse_id TEXT DEFAULT '',
  auto_create_stock_out INTEGER DEFAULT 1,
  allow_order_when_out_of_stock INTEGER DEFAULT 0,
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_owner TEXT DEFAULT '',
  banner_title TEXT DEFAULT '',
  banner_subtitle TEXT DEFAULT '',
  zalo_number TEXT DEFAULT '',
  support_hours TEXT DEFAULT '',
  chat_welcome_message TEXT DEFAULT '',
  enable_support_widget INTEGER DEFAULT 1
);

-- 27. Tài khoản Khách hàng Webshop (Webshop Customer Accounts)
CREATE TABLE IF NOT EXISTS webshop_customer_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  address TEXT,
  password TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  wishlist TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  last_login TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_cust_accounts_username ON webshop_customer_accounts(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_cust_accounts_phone ON webshop_customer_accounts(phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_cust_accounts_email ON webshop_customer_accounts(email);
CREATE INDEX IF NOT EXISTS idx_ws_cust_accounts_customer ON webshop_customer_accounts(customer_id);

-- 28. Cấu hình Sản phẩm Webshop (Webshop Product Configs)
CREATE TABLE IF NOT EXISTS webshop_product_configs (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  is_published INTEGER DEFAULT 1,
  retail_price INTEGER NOT NULL DEFAULT 0,
  promo_price INTEGER,
  is_featured INTEGER DEFAULT 0,
  badge TEXT,
  short_description TEXT
);

-- 29. Đơn Đặt hàng Webshop (Webshop Orders)
CREATE TABLE IF NOT EXISTS webshop_orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL DEFAULT (CURRENT_DATE),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  customer_id TEXT,
  account_id TEXT REFERENCES webshop_customer_accounts(id) ON DELETE SET NULL,
  shipping_method TEXT DEFAULT 'STANDARD',
  payment_method TEXT DEFAULT 'COD',
  payment_status TEXT DEFAULT 'UNPAID',
  order_status TEXT DEFAULT 'PENDING',
  warehouse_id TEXT,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  shipping_fee INTEGER NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0.0,
  vat_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  stock_tx_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webshop_orders_code ON webshop_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_webshop_orders_status ON webshop_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_webshop_orders_account ON webshop_orders(account_id);

-- 30. Chi tiết Mặt hàng Đơn hàng Webshop (Webshop Order Items)
CREATE TABLE IF NOT EXISTS webshop_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES webshop_orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_sku TEXT,
  product_name TEXT,
  qty REAL NOT NULL DEFAULT 0.0,
  uom_id TEXT,
  uom_name TEXT,
  unit_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0
);

-- =========================================================================
-- KHỞI TẠO DỮ LIỆU BAN ĐẦU (SEED DATA CHUẨN DOANH NGHIỆP)
-- =========================================================================

-- Cấu hình mặc định
INSERT OR IGNORE INTO system_config (id, allow_negative_stock, default_vat_rate, auto_approve_quotation, theme_color)
VALUES (1, 0, 10.0, 0, '#10b981');

INSERT OR IGNORE INTO company_info (id, name, tax_code, address, bank_account, bank_name)
VALUES (1, 'CÔNG TY TNHH HỆ THỐNG QUẢN TRỊ THÔNG MINH', '0316888999', 'Việt Nam', '1903666888', 'Techcombank');

INSERT OR IGNORE INTO webshop_store_config (id, store_name, store_slogan, hotline, email, auto_create_stock_out)
VALUES (1, 'Webshop Trực Tuyến', 'Giao hàng toàn quốc - Chất lượng cam kết', '1900 8888', 'shop@verp.vn', 1);

-- Quy tắc đánh số chứng từ
INSERT OR IGNORE INTO sequence_configs (type, prefix, digits, current_number) VALUES
('PN', 'PN', 4, 1),
('PX', 'PX', 4, 1),
('BG', 'BG', 4, 1),
('PT', 'PT', 4, 1),
('PC', 'PC', 4, 1),
('WS', 'WS', 4, 1);

-- Vai trò hệ thống
INSERT OR IGNORE INTO roles (id, name, description, color, is_system, permissions) VALUES
('ADMIN', 'Quản trị viên cấp cao', 'Toàn quyền điều hành và thiết lập hệ thống', '#ef4444', 1, '["*"]'),
('KHO', 'Thủ kho / Nhân viên kho', 'Quản lý danh mục hàng hóa, nhập xuất kho, kiểm kê', '#f59e0b', 0, '["stock.*", "products.*", "categories.*", "warehouses.*"]'),
('KETOAN', 'Kế toán tổng hợp', 'Quản lý sổ sách kế toán, công nợ, phiếu thu chi, thuế VAT', '#3b82f6', 0, '["accounting.*", "debts.*", "payments.*", "vat.*"]'),
('BANHANG', 'Nhân viên kinh doanh', 'Báo giá, chăm sóc khách hàng, quản lý đơn đặt hàng webshop', '#10b981', 0, '["sales.*", "customers.*", "webshop.*"]');

-- Tài khoản quản trị khởi tạo (Mật khẩu: 123)
INSERT OR IGNORE INTO users (id, username, password, full_name, email, role_id, status)
VALUES ('usr-admin', 'admin', '123', 'Quản Trị Viên', 'admin@verp.vn', 'ADMIN', 'ACTIVE');

-- Hệ thống tài khoản kế toán chuẩn Thông tư 133 / 200
INSERT OR IGNORE INTO chart_of_accounts (code, name, type, parent_code) VALUES
('111', 'Tiền mặt', 'ASSET', NULL),
('112', 'Tiền gửi ngân hàng', 'ASSET', NULL),
('131', 'Phải thu của khách hàng', 'ASSET', NULL),
('156', 'Hàng hóa', 'ASSET', NULL),
('331', 'Phải trả cho người bán', 'LIABILITY', NULL),
('3331', 'Thuế GTGT phải nộp (Đầu ra)', 'LIABILITY', NULL),
('1331', 'Thuế GTGT được khấu trừ (Đầu vào)', 'ASSET', NULL),
('511', 'Doanh thu bán hàng và cung cấp dịch vụ', 'REVENUE', NULL),
('632', 'Giá vốn hàng bán', 'EXPENSE', NULL),
('642', 'Chi phí quản lý doanh nghiệp / bán hàng', 'EXPENSE', NULL),
('911', 'Xác định kết quả kinh doanh', 'EQUITY', NULL),
('421', 'Lợi nhuận sau thuế chưa phân phối', 'EQUITY', NULL);

-- Ánh xạ tài khoản mặc định
INSERT OR IGNORE INTO account_mappings (key, account_code, description) VALUES
('STOCK_IN', '156', 'Tài khoản ghi nợ khi nhập kho hàng hóa'),
('SALE', '511', 'Tài khoản ghi nhận doanh thu bán hàng'),
('COGS', '632', 'Tài khoản ghi nhận giá vốn hàng xuất'),
('AR_PAYMENT', '131', 'Tài khoản công nợ phải thu khách hàng'),
('AP_PAYMENT', '331', 'Tài khoản công nợ phải trả nhà cung cấp'),
('VAT_INPUT', '1331', 'Tài khoản thuế GTGT đầu vào được khấu trừ'),
('VAT_OUTPUT', '3331', 'Tài khoản thuế GTGT đầu ra phải nộp');
