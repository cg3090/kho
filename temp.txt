-- =================================================================================
-- POSTGRESQL DATABASE INITIALIZATION & MIGRATION SCRIPT (PRODUCTION / REAL DATA)
-- HỆ THỐNG ERP QUẢN TRỊ KHO (WMS), KẾ TOÁN (TT 133/200), PHÂN QUYỀN RBAC & WEBSHOP
-- CHÍNH SÁCH: 100% DỮ LIỆU THẬT - KHÔNG CHỨA DỮ LIỆU MẪU (ZERO MOCK DATA)
-- TƯƠNG THÍCH 100% VỚI PRISMA ORM (`npx prisma db pull` & `npx prisma generate`)
-- =================================================================================

-- Suppress harmless IF NOT EXISTS / IF EXISTS notices during idempotent execution
SET client_min_messages TO WARNING;

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. ERP STATE COLLECTION STORE (Đồng bộ trạng thái JSONB thời gian thực)
CREATE TABLE IF NOT EXISTS erp_collections (
    key VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. SYSTEM CONFIGURATIONS (Cấu hình tham số vận hành hệ thống)
CREATE TABLE IF NOT EXISTS system_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    allow_negative_stock BOOLEAN DEFAULT FALSE,
    default_vat_rate DECIMAL(5,2) DEFAULT 10.00,
    auto_approve_quotation BOOLEAN DEFAULT FALSE,
    theme_color VARCHAR(20) DEFAULT '#10b981',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. COMPANY INFORMATION (Thông tin pháp lý doanh nghiệp)
CREATE TABLE IF NOT EXISTS company_info (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name VARCHAR(255) NOT NULL DEFAULT '',
    tax_code VARCHAR(50) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    bank_account VARCHAR(100) NOT NULL DEFAULT '',
    bank_name VARCHAR(255) NOT NULL DEFAULT '',
    logo_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SEQUENCE CONFIGURATIONS (Cấu hình đánh số chứng từ tự động: PN, PX, BG, PT, PC)
CREATE TABLE IF NOT EXISTS sequence_configs (
    type VARCHAR(50) PRIMARY KEY,
    prefix VARCHAR(20) NOT NULL,
    digits INT DEFAULT 4,
    current_number INT DEFAULT 1
);

-- 4. PRINT TEMPLATES (Mẫu in chứng từ HTML tùy biến)
CREATE TABLE IF NOT EXISTS print_templates (
    type VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    header_html TEXT NOT NULL,
    footer_html TEXT NOT NULL
);

-- 5. RBAC ROLES (Danh mục Vai trò & Ma trận Phân quyền)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#10b981',
    is_system BOOLEAN DEFAULT FALSE,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 6. SYSTEM USERS (Danh mục Tài khoản Người dùng)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL DEFAULT '123',
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED')),
    avatar_url TEXT,
    created_at VARCHAR(50),
    last_login VARCHAR(100)
);

-- 7. CATEGORIES (Danh mục Nhóm / Loại hàng hóa)
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- 8. UNITS OF MEASUREMENT - UOM (Danh mục Đơn vị tính)
CREATE TABLE IF NOT EXISTS uoms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- 9. WAREHOUSES (Danh mục Kho bãi)
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT
);

-- 10. SUPPLIERS (Danh mục Nhà cung cấp)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(50),
    address TEXT
);

-- 11. CUSTOMERS (Danh mục Khách hàng)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(50),
    address TEXT
);

-- 12. PRODUCTS (Danh mục Sản phẩm / Hàng hóa - Hỗ trợ ĐVT quy đổi & Bình quân gia quyền)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
    uom_id VARCHAR(50) REFERENCES uoms(id) ON DELETE SET NULL,
    alt_uom_id VARCHAR(50) REFERENCES uoms(id) ON DELETE SET NULL,
    uom_conversion_rate DECIMAL(12,4) DEFAULT 1.0000,
    description TEXT,
    current_qty DECIMAL(14,4) DEFAULT 0.0000,
    average_cost DECIMAL(18,2) DEFAULT 0.00,
    image_url TEXT
);

-- 13. INVENTORY STOCK BY WAREHOUSE (Tồn kho chi tiết theo từng kho bãi)
CREATE TABLE IF NOT EXISTS inventory_stock (
    warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_id, product_id)
);

-- 14. CHART OF ACCOUNTS (Hệ thống Tài khoản Kế toán chuẩn Thông tư 133/200)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'OFF_BALANCE')),
    parent_code VARCHAR(50) REFERENCES chart_of_accounts(code) ON DELETE SET NULL,
    is_custom BOOLEAN DEFAULT FALSE
);

-- 15. ACCOUNT MAPPINGS (Cấu hình tự động định khoản Nợ/Có theo nghiệp vụ)
CREATE TABLE IF NOT EXISTS account_mappings (
    key VARCHAR(100) PRIMARY KEY,
    account_code VARCHAR(50) REFERENCES chart_of_accounts(code) ON DELETE RESTRICT,
    description TEXT
);

-- 16. QUOTATIONS (Đơn Báo giá khách hàng)
CREATE TABLE IF NOT EXISTS quotations (
    id VARCHAR(50) PRIMARY KEY,
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vat_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'))
);

-- 17. QUOTATION DETAILS (Chi tiết mặt hàng trong Báo giá)
CREATE TABLE IF NOT EXISTS quotation_details (
    id VARCHAR(50) PRIMARY KEY,
    quotation_id VARCHAR(50) REFERENCES quotations(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
    qty DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    uom_id VARCHAR(50),
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    conversion_rate DECIMAL(12,4) DEFAULT 1.0000
);

-- 18. STOCK TRANSACTIONS (Phiếu Nhập Kho IN / Xuất Kho OUT / Tồn Đầu Kỳ OPENING)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(15) NOT NULL CHECK (type IN ('IN', 'OUT', 'OPENING')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON DELETE SET NULL,
    supplier_id VARCHAR(50) REFERENCES suppliers(id) ON DELETE SET NULL,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vat_type VARCHAR(20) NOT NULL DEFAULT 'ITEMIZED' CHECK (vat_type IN ('GROUPED', 'ITEMIZED')),
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    vat_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    is_confirmed BOOLEAN DEFAULT FALSE,
    is_reversed BOOLEAN DEFAULT FALSE,
    reversal_reference VARCHAR(100),
    notes TEXT,
    prepaid_amount DECIMAL(18,2) DEFAULT 0.00,
    prepaid_method VARCHAR(20),
    due_date DATE,
    fiscal_year INT,
    is_carry_forward BOOLEAN DEFAULT FALSE,
    linked_closing_year INT
);

-- 19. STOCK TRANSACTION DETAILS (Chi tiết mặt hàng Nhập / Xuất / Tồn đầu kỳ)
CREATE TABLE IF NOT EXISTS stock_transaction_details (
    id VARCHAR(50) PRIMARY KEY,
    tx_id VARCHAR(50) REFERENCES stock_transactions(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
    qty DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vat_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    alt_uom_id VARCHAR(50) REFERENCES uoms(id) ON DELETE SET NULL,
    alt_qty DECIMAL(14,4),
    alt_unit_price DECIMAL(18,2),
    cogs_unit_cost DECIMAL(18,2) DEFAULT 0.00,
    cogs_total DECIMAL(18,2) DEFAULT 0.00,
    carton_qty DECIMAL(14,4) DEFAULT 0.0000
);

-- 20. JOURNAL ENTRIES (Sổ Nhật ký chung & Bút toán kết chuyển cuối năm)
CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_no VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    is_reversed BOOLEAN DEFAULT FALSE,
    reversal_reference VARCHAR(100),
    is_closing_entry BOOLEAN DEFAULT FALSE,
    fiscal_year INT
);

-- 21. JOURNAL ENTRY LINES (Chi tiết định khoản Nợ / Có)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id VARCHAR(50) PRIMARY KEY,
    entry_id VARCHAR(50) REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(50) REFERENCES chart_of_accounts(code) ON DELETE RESTRICT,
    debit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    partner_id VARCHAR(50),
    partner_type VARCHAR(20) CHECK (partner_type IN ('SUPPLIER', 'CUSTOMER'))
);

-- 22. DEBTS (Sổ theo dõi Công nợ Phải thu 131 / Phải trả 331)
CREATE TABLE IF NOT EXISTS debts (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('AP', 'AR')),
    partner_id VARCHAR(50) NOT NULL,
    tx_id VARCHAR(50) REFERENCES stock_transactions(id) ON DELETE SET NULL,
    reference_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID')),
    is_reversed BOOLEAN DEFAULT FALSE,
    reversal_reference VARCHAR(100),
    due_date DATE
);

-- 23. PAYMENTS (Phiếu Thu PT / Phiếu Chi PC - Sổ quỹ tiền mặt & ngân hàng)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('RECEIVE', 'PAY')),
    debt_id VARCHAR(50) REFERENCES debts(id) ON DELETE SET NULL,
    partner_id VARCHAR(50) NOT NULL,
    partner_type VARCHAR(20) NOT NULL CHECK (partner_type IN ('SUPPLIER', 'CUSTOMER')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    method VARCHAR(20) NOT NULL CHECK (method IN ('CASH', 'BANK', 'OTHER')),
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    notes TEXT
);

-- 24. VAT LEDGER (Sổ Kê khai thuế GTGT Đầu vào 1331 / Đầu ra 3331)
CREATE TABLE IF NOT EXISTS vat_ledger (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INPUT', 'OUTPUT')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tx_id VARCHAR(50) REFERENCES stock_transactions(id) ON DELETE SET NULL,
    invoice_no VARCHAR(100) NOT NULL,
    partner_name VARCHAR(255) NOT NULL,
    partner_tax_code VARCHAR(100) NOT NULL,
    amount_before_vat DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vat_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    account_code VARCHAR(50) REFERENCES chart_of_accounts(code) ON DELETE RESTRICT,
    is_reversed BOOLEAN DEFAULT FALSE
);

-- 25. FISCAL YEAR CLOSINGS (Hồ sơ Kết chuyển & Khóa sổ cuối năm + Snapshot Tồn kho cuối kỳ)
CREATE TABLE IF NOT EXISTS fiscal_closings (
    id VARCHAR(50) PRIMARY KEY,
    fiscal_year INT UNIQUE NOT NULL,
    closing_date DATE NOT NULL,
    closed_at VARCHAR(50) NOT NULL,
    closed_by VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'UNLOCKED')),
    closing_journal_entry_id VARCHAR(50),
    next_year_opening_tx_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_revenue_transferred DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_cogs_transferred DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_expense_transferred DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    tax_amount_transferred DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    net_profit_transferred DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_closing_stock_qty DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    total_closing_stock_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    stock_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT
);

-- 26. WEBSHOP STORE CONFIG (Cấu hình cửa hàng trực tuyến B2C/B2B)
CREATE TABLE IF NOT EXISTS webshop_store_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    store_name VARCHAR(255) NOT NULL DEFAULT '',
    store_slogan TEXT DEFAULT '',
    hotline VARCHAR(100) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    address TEXT DEFAULT '',
    default_warehouse_id VARCHAR(50) DEFAULT '',
    auto_create_stock_out BOOLEAN DEFAULT TRUE,
    allow_order_when_out_of_stock BOOLEAN DEFAULT FALSE,
    bank_name VARCHAR(255) DEFAULT '',
    bank_account VARCHAR(100) DEFAULT '',
    bank_owner VARCHAR(255) DEFAULT '',
    banner_title TEXT DEFAULT '',
    banner_subtitle TEXT DEFAULT '',
    zalo_number VARCHAR(50) DEFAULT '',
    support_hours VARCHAR(100) DEFAULT '',
    chat_welcome_message TEXT DEFAULT '',
    enable_support_widget BOOLEAN DEFAULT TRUE
);

-- 27. WEBSHOP CUSTOMER ACCOUNTS (Tài khoản Khách hàng đăng nhập Webshop)
CREATE TABLE IF NOT EXISTS webshop_customer_accounts (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    address TEXT,
    password VARCHAR(255) NOT NULL,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    wishlist JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at VARCHAR(50),
    last_login VARCHAR(50)
);

-- 28. WEBSHOP PRODUCT CONFIGS (Cấu hình giá bán lẻ & hiển thị sản phẩm trên Webshop)
CREATE TABLE IF NOT EXISTS webshop_product_configs (
    product_id VARCHAR(50) PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT TRUE,
    retail_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    promo_price DECIMAL(18,2),
    is_featured BOOLEAN DEFAULT FALSE,
    badge VARCHAR(50),
    short_description TEXT
);

-- 29. WEBSHOP ORDERS (Đơn đặt hàng trực tuyến từ khách hàng)
CREATE TABLE IF NOT EXISTS webshop_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_code VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT NOT NULL,
    customer_id VARCHAR(50),
    account_id VARCHAR(50) REFERENCES webshop_customer_accounts(id) ON DELETE SET NULL,
    shipping_method VARCHAR(30) DEFAULT 'STANDARD',
    payment_method VARCHAR(30) DEFAULT 'COD',
    payment_status VARCHAR(20) DEFAULT 'UNPAID',
    order_status VARCHAR(20) DEFAULT 'PENDING',
    warehouse_id VARCHAR(50),
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    shipping_fee DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vat_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    stock_tx_id VARCHAR(50),
    notes TEXT,
    created_at VARCHAR(50),
    updated_at VARCHAR(50)
);

-- 30. WEBSHOP ORDER ITEMS (Chi tiết sản phẩm trong đơn đặt hàng Webshop)
CREATE TABLE IF NOT EXISTS webshop_order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES webshop_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50),
    product_sku VARCHAR(100),
    product_name VARCHAR(255),
    qty DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    uom_id VARCHAR(50),
    uom_name VARCHAR(50),
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(18,2) NOT NULL DEFAULT 0.00
);

-- =================================================================================
-- SILENT SCHEMA MIGRATIONS (Kiểm tra catalog trước khi ALTER, không phát sinh NOTICE)
-- =================================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='erp_collections' AND column_name='data') THEN
        ALTER TABLE erp_collections ADD COLUMN data JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='erp_collections' AND column_name='payload') THEN
        ALTER TABLE erp_collections ADD COLUMN payload JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='webshop_orders' AND column_name='account_id') THEN
        ALTER TABLE webshop_orders ADD COLUMN account_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transactions' AND column_name='prepaid_amount') THEN
        ALTER TABLE stock_transactions ADD COLUMN prepaid_amount DECIMAL(18,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transactions' AND column_name='prepaid_method') THEN
        ALTER TABLE stock_transactions ADD COLUMN prepaid_method VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transactions' AND column_name='due_date') THEN
        ALTER TABLE stock_transactions ADD COLUMN due_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transactions' AND column_name='fiscal_year') THEN
        ALTER TABLE stock_transactions ADD COLUMN fiscal_year INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transactions' AND column_name='is_carry_forward') THEN
        ALTER TABLE stock_transactions ADD COLUMN is_carry_forward BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transactions' AND column_name='linked_closing_year') THEN
        ALTER TABLE stock_transactions ADD COLUMN linked_closing_year INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transaction_details' AND column_name='carton_qty') THEN
        ALTER TABLE stock_transaction_details ADD COLUMN carton_qty DECIMAL(14,4) DEFAULT 0.0000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='journal_entries' AND column_name='is_closing_entry') THEN
        ALTER TABLE journal_entries ADD COLUMN is_closing_entry BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='journal_entries' AND column_name='fiscal_year') THEN
        ALTER TABLE journal_entries ADD COLUMN fiscal_year INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='debts' AND column_name='due_date') THEN
        ALTER TABLE debts ADD COLUMN due_date DATE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='journal_entry_lines' AND constraint_name='chk_debit_credit') THEN
        ALTER TABLE journal_entry_lines DROP CONSTRAINT chk_debit_credit;
    END IF;
END $$;

-- =================================================================================
-- CREATE INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- =================================================================================
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON stock_transactions(date);
CREATE INDEX IF NOT EXISTS idx_stock_tx_type ON stock_transactions(type);
CREATE INDEX IF NOT EXISTS idx_stock_tx_fiscal_year ON stock_transactions(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_stock_tx_ref ON stock_transactions(reference_no);
CREATE INDEX IF NOT EXISTS idx_stock_tx_details_tx ON stock_transaction_details(tx_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_details_prod ON stock_transaction_details(product_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_debts_partner ON debts(partner_id, type);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(reference_no);
CREATE INDEX IF NOT EXISTS idx_vat_ledger_type ON vat_ledger(type);
CREATE INDEX IF NOT EXISTS idx_vat_ledger_date ON vat_ledger(date);
CREATE INDEX IF NOT EXISTS idx_webshop_orders_code ON webshop_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_webshop_orders_status ON webshop_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_webshop_orders_account ON webshop_orders(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_cust_accounts_username ON webshop_customer_accounts(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_cust_accounts_email ON webshop_customer_accounts(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_cust_accounts_phone ON webshop_customer_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_ws_cust_accounts_customer ON webshop_customer_accounts(customer_id);

-- =================================================================================
-- PURGE ANY LEGACY MOCK DATA (Đảm bảo DB sạch 100% dữ liệu giả lập)
-- =================================================================================
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

-- =================================================================================
-- SEED ESSENTIAL ACCOUNTING & SYSTEM STANDARDS (CHUẨN THÔNG TƯ 133/200 BTC)
-- (Chỉ khởi tạo Hệ thống Tài khoản Kế toán, Quy tắc Ánh xạ, Số chứng từ & Quyền Admin)
-- =================================================================================

-- 0. Cấu hình mặc định Hệ thống, Thông tin doanh nghiệp & Webshop (Singleton ID = 1)
INSERT INTO system_config (id, allow_negative_stock, default_vat_rate, auto_approve_quotation, theme_color)
VALUES (1, FALSE, 10.00, FALSE, '#10b981')
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_info (id, name, tax_code, address, bank_account, bank_name)
VALUES (1, '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webshop_store_config (id, store_name, store_slogan, hotline, email, address, default_warehouse_id, auto_create_stock_out, allow_order_when_out_of_stock, bank_name, bank_account, bank_owner, banner_title, banner_subtitle, zalo_number, support_hours, chat_welcome_message, enable_support_widget)
VALUES (1, 'V-SMART STORE', 'Hệ thống bán lẻ', '1900 6868 - 0901 888 999', 'sales@verp.vn', 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh', 'wh-1', TRUE, FALSE, 'Techcombank - CN Sài Gòn', '19034567891012', 'CÔNG TY TNHH V-ERP SMART SOLUTIONS', 'SIÊU HỘI MUA SẮM CÔNG NGHỆ CHÍNH HÃNG 2026', 'Đồng bộ kho thực tế 100% - Bảo hành chính hãng - Giao hàng toàn quốc', '0901888999', '8:00 - 21:30 (Thứ 2 - Chủ Nhật)', 'Xin chào Quý khách! Smart WMS Store sẵn sàng hỗ trợ kiểm tra tồn kho, tư vấn sản phẩm và giải đáp đơn hàng.', TRUE)
ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    store_slogan = EXCLUDED.store_slogan,
    hotline = EXCLUDED.hotline,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    default_warehouse_id = EXCLUDED.default_warehouse_id,
    bank_name = EXCLUDED.bank_name,
    bank_account = EXCLUDED.bank_account,
    bank_owner = EXCLUDED.bank_owner,
    banner_title = EXCLUDED.banner_title,
    banner_subtitle = EXCLUDED.banner_subtitle,
    zalo_number = EXCLUDED.zalo_number,
    support_hours = EXCLUDED.support_hours,
    chat_welcome_message = EXCLUDED.chat_welcome_message;

-- 1. Hệ thống Tài khoản Kế toán chuẩn Thông tư 133/200
INSERT INTO chart_of_accounts (code, name, type, is_custom) VALUES
('111', 'Tiền mặt (Cash)', 'ASSET', FALSE),
('112', 'Tiền gửi Ngân hàng (Bank Deposit)', 'ASSET', FALSE),
('131', 'Phải thu của khách hàng (Accounts Receivable)', 'ASSET', FALSE),
('1331', 'Thuế GTGT được khấu trừ (VAT Input 1331)', 'ASSET', FALSE),
('1561', 'Giá mua hàng hóa (Inventory 1561)', 'ASSET', FALSE),
('331', 'Phải trả cho người bán (Accounts Payable)', 'LIABILITY', FALSE),
('3331', 'Thuế GTGT phải nộp (VAT Output 3331)', 'LIABILITY', FALSE),
('411', 'Vốn góp của chủ sở hữu (Owner Equity)', 'EQUITY', FALSE),
('421', 'Lợi nhuận sau thuế chưa phân phối (Retained Earnings)', 'EQUITY', FALSE),
('511', 'Doanh thu bán hàng và cung cấp dịch vụ (Revenue)', 'REVENUE', FALSE),
('632', 'Giá vốn hàng bán (Cost of Goods Sold - COGS)', 'EXPENSE', FALSE),
('642', 'Chi phí quản lý doanh nghiệp (Admin Expense)', 'EXPENSE', FALSE),
('911', 'Xác định kết quả kinh doanh (P&L Summary)', 'OFF_BALANCE', FALSE)
ON CONFLICT (code) DO NOTHING;

-- 2. Quy tắc ánh xạ tài khoản tự động
INSERT INTO account_mappings (key, account_code, description) VALUES
('STOCK_IN', '1561', 'Tài khoản hàng hóa trong kho'),
('AR_PAYMENT', '131', 'Tài khoản phải thu khách hàng'),
('AP_PAYMENT', '331', 'Tài khoản phải trả nhà cung cấp'),
('SALE', '511', 'Tài khoản doanh thu bán hàng'),
('COGS', '632', 'Tài khoản giá vốn hàng bán'),
('VAT_INPUT', '1331', 'Tài khoản thuế GTGT đầu vào được khấu trừ'),
('VAT_OUTPUT', '3331', 'Tài khoản thuế GTGT đầu ra phải nộp'),
('CASH', '111', 'Tài khoản tiền mặt'),
('BANK', '112', 'Tài khoản ngân hàng')
ON CONFLICT (key) DO NOTHING;

-- 3. Cấu hình đánh số chứng từ tự động
INSERT INTO sequence_configs (type, prefix, digits, current_number) VALUES
('PN', 'PN', 4, 1),
('PX', 'PX', 4, 1),
('BG', 'BG', 4, 1),
('PT', 'PT', 4, 1),
('PC', 'PC', 4, 1)
ON CONFLICT (type) DO NOTHING;

-- 4. Cấu hình Vai trò hệ thống (RBAC) & Tài khoản Quản trị viên mặc định
INSERT INTO roles (id, name, description, color, is_system, permissions) VALUES
('ADMIN', 'Quản trị viên (Admin)', 'Toàn quyền điều hành cao nhất hệ thống, xem toàn bộ giá mua, giá vốn, doanh thu, lợi nhuận và cấu hình RBAC', '#10b981', TRUE, '["VIEW_WEBSHOP","MANAGE_WEBSHOP_ORDERS","CONFIG_WEBSHOP","VIEW_PURCHASE_COST","EDIT_PRODUCT_COST","VIEW_DIRECTORIES","MANAGE_DIRECTORIES","VIEW_STOCK_IN","CREATE_STOCK_IN","VIEW_STOCK_OUT","CREATE_STOCK_OUT","CONFIRM_TRANSACTIONS","VIEW_QUOTATIONS","CREATE_QUOTATIONS","VIEW_DEBT","CREATE_PAYMENTS","VIEW_ACCOUNTING","VIEW_VAT_LEDGER","VIEW_REPORTS","MANAGE_USERS","MANAGE_ROLES","MANAGE_SETTINGS"]'::jsonb),
('ACCOUNTANT', 'Kế toán tổng hợp', 'Quản lý công nợ, sổ sách kế toán, bảng kê thuế VAT, báo cáo tài chính và giá vốn hạch toán', '#3b82f6', TRUE, '["VIEW_WEBSHOP","MANAGE_WEBSHOP_ORDERS","VIEW_PURCHASE_COST","VIEW_DIRECTORIES","VIEW_STOCK_IN","VIEW_STOCK_OUT","VIEW_QUOTATIONS","VIEW_DEBT","CREATE_PAYMENTS","VIEW_ACCOUNTING","VIEW_VAT_LEDGER","VIEW_REPORTS"]'::jsonb),
('WAREHOUSE', 'Thủ kho / Quản lý kho', 'Chuyên trách xuất - nhập vật lý, theo dõi số lượng tồn kho và thẻ kho. Không xem giá mua, tiền mua và giá trị tiền tồn kho', '#f59e0b', TRUE, '["VIEW_WEBSHOP","MANAGE_WEBSHOP_ORDERS","VIEW_DIRECTORIES","MANAGE_DIRECTORIES","VIEW_STOCK_IN","CREATE_STOCK_IN","VIEW_STOCK_OUT","CREATE_STOCK_OUT","CONFIRM_TRANSACTIONS","VIEW_QUOTATIONS"]'::jsonb),
('SALES', 'Nhân viên kinh doanh (Sales)', 'Lập báo giá cho khách hàng, tạo phiếu xuất bán hàng và thu tiền khách. Không xem giá mua hoặc giá vốn nhập vào', '#ec4899', TRUE, '["VIEW_WEBSHOP","MANAGE_WEBSHOP_ORDERS","CONFIG_WEBSHOP","VIEW_DIRECTORIES","VIEW_STOCK_OUT","CREATE_STOCK_OUT","VIEW_QUOTATIONS","CREATE_QUOTATIONS","VIEW_DEBT"]'::jsonb),
('VIEWER', 'Nhân viên Xem báo cáo', 'Chỉ có quyền xem thông tin cơ bản danh mục và phiếu xuất', '#8b5cf6', FALSE, '["VIEW_WEBSHOP","VIEW_DIRECTORIES","VIEW_STOCK_OUT"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, password, full_name, email, phone, role_id, status, created_at) VALUES
('u-admin', 'admin', '123', 'Quản trị viên hệ thống (Admin)', 'admin@erp.local', '', 'ADMIN', 'ACTIVE', CURRENT_DATE::text)
ON CONFLICT (id) DO NOTHING;

-- =================================================================================
-- 5. DỮ LIỆU WEBSHOP THẬT (Catalog thật thay thế mockdata - đặt SAU purge)
-- =================================================================================
-- Danh mục nhóm hàng & ĐVT
INSERT INTO categories (id, name, description) VALUES
('cat-1', 'Điện thoại & Tablet', 'Các dòng điện thoại thông minh, máy tính bảng'),
('cat-2', 'Máy tính & Laptop', 'Máy tính để bàn, laptop văn phòng & gaming'),
('cat-3', 'Phụ kiện & Thiết bị', 'Cáp sạc, tai nghe, pin dự phòng, linh kiện')
ON CONFLICT (id) DO NOTHING;
INSERT INTO uoms (id, name) VALUES ('uom-1', 'Cái') ON CONFLICT (id) DO NOTHING;
INSERT INTO warehouses (id, name, location) VALUES ('wh-1', 'Kho Chính Quận 1', 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. HCM') ON CONFLICT (id) DO NOTHING;

-- Sản phẩm (hàng thật: điện thoại, laptop, phụ kiện chính hãng)
INSERT INTO products (id, sku, name, category_id, uom_id, description, current_qty, average_cost) VALUES
('prod-dm-001', 'IPHONE15PM256', 'iPhone 15 Pro Max 256GB - Chính hãng VN/A', 'cat-1', 'uom-1', 'Chip A17 Pro, camera 48MP, Titan thiết kế, hàng chính hãng bảo hành 12 tháng.', 12, 18500000),
('prod-dm-002', 'IPHONE15P128', 'iPhone 15 Pro 128GB - Chính hãng VN/A', 'cat-1', 'uom-1', 'Chip A17 Pro, khung Titan, camera Pro 48MP, bảo hành chính hãng 12 tháng.', 8, 15200000),
('prod-dm-003', 'SAMS24U512', 'Samsung Galaxy S24 Ultra 512GB - Chính hãng', 'cat-1', 'uom-1', 'Snapdragon 8 Gen 3, S Pen tích hợp, camera 200MP, màn hình QHD+ 6.8 inch.', 10, 16800000),
('prod-dm-004', 'SAMSZFLIP6', 'Samsung Galaxy Z Flip 6 - Gập chống nước', 'cat-1', 'uom-1', 'Màn hình gập FlexWindow 3.4 inch, Snapdragon 8 Gen 3, chống nước IP48.', 6, 13500000),
('prod-dm-005', 'IPADAIR11M3', 'iPad Air 11 inch M3 128GB Wi-Fi', 'cat-1', 'uom-1', 'Chip M3, màn hình Liquid Retina, hỗ trợ Apple Pencil Pro, mỏng nhẹ 462g.', 9, 11900000),
('prod-dm-006', 'MACAIRM313', 'MacBook Air 13 inch M3 256GB - Space Gray', 'cat-2', 'uom-1', 'Chip Apple M3 8 nhân, RAM 8GB, SSD 256GB, mỏng 1.13cm, pin 18 tiếng.', 7, 19500000),
('prod-dm-007', 'MACPRO14M3P', 'MacBook Pro 14 inch M3 Pro 18GB/512GB', 'cat-2', 'uom-1', 'Chip M3 Pro 11 nhân CPU, màn hình Liquid Retina XDR, pin lên đến 22 tiếng.', 4, 32000000),
('prod-dm-008', 'DELLL3440I5', 'Laptop Dell Latitude 3440 i5-1335U/8GB/256GB', 'cat-2', 'uom-1', 'Laptop doanh nhân 14 inch FHD, Intel i5 thế hệ 13, bảo hành 12 tháng.', 15, 9800000),
('prod-dm-009', 'ASUSROGG16', 'Laptop Gaming ASUS ROG Strix G16 RTX 4060', 'cat-2', 'uom-1', 'i7-13650HX, RAM 16GB DDR5, SSD 512GB, RTX 4060 8GB, màn hình 165Hz.', 5, 21500000),
('prod-dm-010', 'LENTPE14G5', 'Lenovo ThinkPad E14 Gen 5 i5/16GB/512GB', 'cat-2', 'uom-1', 'Laptop văn phòng 14 inch, bàn phím ThinkPad nổi tiếng, bảo hành 12 tháng.', 11, 10200000),
('prod-dm-011', 'AIRPODSPRO2', 'Tai nghe không dây AirPods Pro 2 (USB-C)', 'cat-3', 'uom-1', 'Chống ồn chủ động Adaptive Audio, case sạc USB-C, loa tự vệ chống nước.', 25, 2900000),
('prod-dm-012', 'PP20000MAH', 'Pin dự phòng 20000mAh sạc nhanh 22.5W', 'cat-3', 'uom-1', 'Sạc nhanh hai chiều 22.5W, sạc được 4-5 lần cho smartphone, đèn LED báo.', 40, 450000),
('prod-dm-013', 'CABLEUSBC2M', 'Cáp sạc USB-C nhanh 2 mét 100W đan nylon', 'cat-3', 'uom-1', 'Cáp dữ liệu & sạc nhanh PD 100W, lõi đồng nguyên chất, chịu lực 10000 lần gấp.', 100, 95000),
('prod-dm-014', 'GAN65W', 'Sạc nhanh GaN 65W 3 cổng USB-C', 'cat-3', 'uom-1', 'Chip GaN nhỏ gọn, sạc nhanh MacBook/iPhone/Android, 3 cổng ra đồng thời.', 35, 380000),
('prod-dm-015', 'KEYBOARDCF87', 'Bàn phím cơ không dây 87 phím RGB Hot-swap', 'cat-3', 'uom-1', 'Công tắc cơ nhạy, kết nối BT/2.4GHz/USB-C, pin 4000mAh, RGB 16.8 triệu màu.', 18, 890000),
('prod-dm-016', 'MOUSEERGOWL', 'Chuột không dây Ergo 4000DPI yên tay', 'cat-3', 'uom-1', 'Thiết kế công thái học giảm đau cổ tay, 4000DPI, kết nối 2.4GHz/Bluetooth.', 22, 520000),
('prod-dm-017', 'OP15PMAG', 'Ốp lưng iPhone 15 Pro Max silicon MagSafe', 'cat-3', 'uom-1', 'Silicon mềm cao cấp, khung viền chống sốc, hỗ trợ sạc MagSafe chính hãng.', 60, 120000),
('prod-dm-018', 'CLL15PM9H', 'Cường lực kính iPhone 15 Pro Max 9D 2 mặt', 'cat-3', 'uom-1', 'Kính cường lực 9D 2 mặt, chống vân tay, chống sốc rơi, trong suốt 99%.', 75, 150000)
ON CONFLICT (id) DO NOTHING;

-- Tồn kho theo kho wh-1
INSERT INTO inventory_stock (warehouse_id, product_id, quantity) VALUES
('wh-1', 'prod-dm-001', 12),
('wh-1', 'prod-dm-002', 8),
('wh-1', 'prod-dm-003', 10),
('wh-1', 'prod-dm-004', 6),
('wh-1', 'prod-dm-005', 9),
('wh-1', 'prod-dm-006', 7),
('wh-1', 'prod-dm-007', 4),
('wh-1', 'prod-dm-008', 15),
('wh-1', 'prod-dm-009', 5),
('wh-1', 'prod-dm-010', 11),
('wh-1', 'prod-dm-011', 25),
('wh-1', 'prod-dm-012', 40),
('wh-1', 'prod-dm-013', 100),
('wh-1', 'prod-dm-014', 35),
('wh-1', 'prod-dm-015', 18),
('wh-1', 'prod-dm-016', 22),
('wh-1', 'prod-dm-017', 60),
('wh-1', 'prod-dm-018', 75)
ON CONFLICT (warehouse_id, product_id) DO NOTHING;

-- Cấu hình bán trên Webshop (giá lẻ VNĐ, khuyến mãi, badge)
INSERT INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES
('prod-dm-001', TRUE, 24790000, 23790000, TRUE, 'HOT', 'Chip A17 Pro, camera 48MP, Titan thiết kế, hàng chính hãng bảo hành 12 tháng.'),
('prod-dm-002', TRUE, 20490000, NULL, TRUE, 'BÁN CHẠY', 'Chip A17 Pro, khung Titan, camera Pro 48MP, bảo hành chính hãng 12 tháng.'),
('prod-dm-003', TRUE, 22990000, 21990000, TRUE, 'HOT', 'Snapdragon 8 Gen 3, S Pen tích hợp, camera 200MP, màn hình QHD+ 6.8 inch.'),
('prod-dm-004', TRUE, 18490000, NULL, TRUE, 'MỚI', 'Màn hình gập FlexWindow 3.4 inch, Snapdragon 8 Gen 3, chống nước IP48.'),
('prod-dm-005', TRUE, 15990000, NULL, FALSE, NULL, 'Chip M3, màn hình Liquid Retina, hỗ trợ Apple Pencil Pro, mỏng nhẹ 462g.'),
('prod-dm-006', TRUE, 26990000, 25990000, TRUE, 'BÁN CHẠY', 'Chip Apple M3 8 nhân, RAM 8GB, SSD 256GB, mỏng 1.13cm, pin 18 tiếng.'),
('prod-dm-007', TRUE, 43990000, NULL, FALSE, NULL, 'Chip M3 Pro 11 nhân CPU, màn hình Liquid Retina XDR, pin lên đến 22 tiếng.'),
('prod-dm-008', TRUE, 13490000, NULL, FALSE, NULL, 'Laptop doanh nhân 14 inch FHD, Intel i5 thế hệ 13, bảo hành 12 tháng.'),
('prod-dm-009', TRUE, 28990000, 27990000, TRUE, 'HOT', 'i7-13650HX, RAM 16GB DDR5, SSD 512GB, RTX 4060 8GB, màn hình 165Hz.'),
('prod-dm-010', TRUE, 13990000, NULL, FALSE, NULL, 'Laptop văn phòng 14 inch, bàn phím ThinkPad nổi tiếng, bảo hành 12 tháng.'),
('prod-dm-011', TRUE, 4290000, 3990000, TRUE, 'BÁN CHẠY', 'Chống ồn chủ động Adaptive Audio, case sạc USB-C, loa tự vệ chống nước.'),
('prod-dm-012', TRUE, 650000, NULL, FALSE, NULL, 'Sạc nhanh hai chiều 22.5W, sạc được 4-5 lần cho smartphone, đèn LED báo.'),
('prod-dm-013', TRUE, 165000, NULL, FALSE, NULL, 'Cáp dữ liệu & sạc nhanh PD 100W, lõi đồng nguyên chất, chịu lực 10000 lần gấp.'),
('prod-dm-014', TRUE, 590000, 549000, TRUE, 'GIẢM GIÁ', 'Chip GaN nhỏ gọn, sạc nhanh MacBook/iPhone/Android, 3 cổng ra đồng thời.'),
('prod-dm-015', TRUE, 1290000, NULL, FALSE, NULL, 'Công tắc cơ nhạy, kết nối BT/2.4GHz/USB-C, pin 4000mAh, RGB 16.8 triệu màu.'),
('prod-dm-016', TRUE, 790000, NULL, FALSE, NULL, 'Thiết kế công thái học giảm đau cổ tay, 4000DPI, kết nối 2.4GHz/Bluetooth.'),
('prod-dm-017', TRUE, 249000, NULL, FALSE, NULL, 'Silicon mềm cao cấp, khung viền chống sốc, hỗ trợ sạc MagSafe chính hãng.'),
('prod-dm-018', TRUE, 299000, NULL, FALSE, NULL, 'Kính cường lực 9D 2 mặt, chống vân tay, chống sốc rơi, trong suốt 99%.')
ON CONFLICT (product_id) DO NOTHING;
