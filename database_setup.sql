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

-- 27. WEBSHOP PRODUCT CONFIGS (Cấu hình giá bán lẻ & hiển thị sản phẩm trên Webshop)
CREATE TABLE IF NOT EXISTS webshop_product_configs (
    product_id VARCHAR(50) PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT TRUE,
    retail_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    promo_price DECIMAL(18,2),
    is_featured BOOLEAN DEFAULT FALSE,
    badge VARCHAR(50),
    short_description TEXT
);

-- 28. WEBSHOP ORDERS (Đơn đặt hàng trực tuyến từ khách hàng)
CREATE TABLE IF NOT EXISTS webshop_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_code VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT NOT NULL,
    customer_id VARCHAR(50),
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

-- 29. WEBSHOP ORDER ITEMS (Chi tiết sản phẩm trong đơn đặt hàng Webshop)
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

INSERT INTO webshop_store_config (id, store_name, store_slogan, auto_create_stock_out, allow_order_when_out_of_stock, enable_support_widget)
VALUES (1, '', '', TRUE, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 1. Hệ thống Tài khoản Kế toán chuẩn Thông tư 133/200
INSERT INTO chart_of_accounts (code, name, type, is_custom) VALUES
('111', 'Tiền mặt (Cash)', 'ASSET', FALSE),
('112', 'Tiền gửi Ngân hàng (Bank Deposit)', 'ASSET', FALSE),
('131', 'Phải thu của khách hàng (Accounts Receivable)', 'ASSET', FALSE),
('1331', 'Thuế GTGT được khấu trừ (VAT Input 1331)', 'ASSET', FALSE),
('151', 'Hàng mua đi đường (Goods in Transit)', 'ASSET', FALSE),
('152', 'Nguyên liệu, vật liệu (Raw Materials)', 'ASSET', FALSE),
('153', 'Công cụ, dụng cụ (Tools & Supplies)', 'ASSET', FALSE),
('155', 'Thành phẩm (Finished Products)', 'ASSET', FALSE),
('1561', 'Giá mua hàng hóa (Inventory 1561)', 'ASSET', FALSE),
('1562', 'Chi phí thu mua hàng hóa (Purchase Expenses)', 'ASSET', FALSE),
('157', 'Hàng gửi đi bán (Consignment Goods)', 'ASSET', FALSE),
('331', 'Phải trả cho người bán (Accounts Payable)', 'LIABILITY', FALSE),
('3331', 'Thuế GTGT phải nộp (VAT Output 3331)', 'LIABILITY', FALSE),
('411', 'Vốn góp của chủ sở hữu (Owner Equity)', 'EQUITY', FALSE),
('421', 'Lợi nhuận sau thuế chưa phân phối (Retained Earnings)', 'EQUITY', FALSE),
('511', 'Doanh thu bán hàng và cung cấp dịch vụ (Revenue)', 'REVENUE', FALSE),
('521', 'Doanh thu bán hàng bị giảm trừ (Sales Returns & Allowances)', 'REVENUE', FALSE),
('5213', 'Hàng bán bị trả lại (Returned Goods from Customers)', 'REVENUE', FALSE),
('621', 'Chi phí sản xuất kinh doanh (Production & Business Expense)', 'EXPENSE', FALSE),
('632', 'Giá vốn hàng bán (Cost of Goods Sold - COGS)', 'EXPENSE', FALSE),
('642', 'Chi phí quản lý doanh nghiệp (Admin Expense)', 'EXPENSE', FALSE),
('911', 'Xác định kết quả kinh doanh (P&L Summary)', 'OFF_BALANCE', FALSE)
ON CONFLICT (code) DO NOTHING;

-- 2. Quy tắc ánh xạ tài khoản tự động
INSERT INTO account_mappings (key, account_code, description) VALUES
('STOCK_IN', '1561', 'Tài khoản giá mua hàng hóa trong kho'),
('STOCK_IN_MATERIALS', '152', 'Tài khoản nguyên liệu, vật liệu'),
('STOCK_IN_TOOLS', '153', 'Tài khoản công cụ, dụng cụ'),
('STOCK_IN_FINISHED', '155', 'Tài khoản thành phẩm'),
('STOCK_IN_CONSIGNMENT', '157', 'Tài khoản hàng gửi đi bán'),
('PURCHASE_EXPENSES', '1562', 'Tài khoản chi phí thu mua hàng hóa'),
('PURCHASE_IN_TRANSIT', '151', 'Tài khoản hàng mua đi đường'),
('STOCK_TRANSFER', '1561', 'Tài khoản chuyển kho nội bộ'),
('INTERNAL_CONSUMPTION', '642', 'Tài khoản xuất dùng nội bộ'),
('PRODUCTION_EXPENSE', '621', 'Tài khoản chi phí sản xuất kinh doanh'),
('STOCK_SURPLUS', '911', 'Tài khoản hàng thừa khi kiểm kê'),
('STOCK_SHORTAGE', '632', 'Tài khoản hàng thiếu khi kiểm kê'),
('SALES_RETURN', '5213', 'Tài khoản hàng trả lại từ khách hàng'),
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
('ADMIN', 'Quản trị viên (Admin)', 'Toàn quyền cao nhất hệ thống, xem toàn bộ giá mua, giá vốn, doanh thu, lợi nhuận và cấu hình RBAC', '#307a9f', TRUE, '["VIEW_WEBSHOP","MANAGE_WEBSHOP_ORDERS","CONFIG_WEBSHOP","VIEW_PURCHASE_COST","EDIT_PRODUCT_COST","VIEW_DIRECTORIES","MANAGE_DIRECTORIES","VIEW_STOCK_IN","CREATE_STOCK_IN","VIEW_STOCK_OUT","CREATE_STOCK_OUT","CONFIRM_TRANSACTIONS","VIEW_QUOTATIONS","CREATE_QUOTATIONS","VIEW_DEBT","CREATE_PAYMENTS","VIEW_ACCOUNTING","VIEW_VAT_LEDGER","VIEW_REPORTS","MANAGE_USERS","MANAGE_ROLES","MANAGE_SETTINGS"]'::jsonb),
('ACCOUNTANT', 'Kế toán tổng hợp', 'Quản lý công nợ, sổ sách kế toán, bảng kê thuế VAT, báo cáo tài chính và giá vốn hạch toán', '#3b82f6', TRUE, '["VIEW_WEBSHOP","MANAGE_WEBSHOP_ORDERS","VIEW_PURCHASE_COST","VIEW_DIRECTORIES","VIEW_STOCK_IN","VIEW_STOCK_OUT","VIEW_QUOTATIONS","VIEW_DEBT","CREATE_PAYMENTS","VIEW_ACCOUNTING","VIEW_VAT_LEDGER","VIEW_REPORTS"]'::jsonb),
('WAREHOUSE', 'Thủ kho / Quản lý kho', 'Chuyên trách xuất - nhập vật lý, theo dõi số lượng tồn kho và thẻ kho. Không xem giá mua, tiền mua và giá trị tiền tồn kho', '#f59e0b', TRUE, '["VIEW_WEBSHOP","MANAGE_WEBSHOP_ORDERS","VIEW_DIRECTORIES","MANAGE_DIRECTORIES","VIEW_STOCK_IN","CREATE_STOCK_IN","VIEW_STOCK_OUT","CREATE_STOCK_OUT","CONFIRM_TRANSACTIONS","VIEW_QUOTATIONS"]'::jsonb),
('SALES', 'Nhân viên kinh doanh (Sales)', 'Lập báo giá cho khách hàng, tạo phiếu xuất bán hàng và thu tiền khách. Không xem giá mua hoặc giá vốn nhập vào', '#ec4899', TRUE, '["VIEW_WEBSHOP","MANAGE_WEBSHOP_ORDERS","CONFIG_WEBSHOP","VIEW_DIRECTORIES","VIEW_STOCK_OUT","CREATE_STOCK_OUT","VIEW_QUOTATIONS","CREATE_QUOTATIONS","VIEW_DEBT"]'::jsonb),
('VIEWER', 'Nhân viên Xem báo cáo', 'Chỉ có quyền xem thông tin cơ bản danh mục và phiếu xuất', '#8b5cf6', FALSE, '["VIEW_WEBSHOP","VIEW_DIRECTORIES","VIEW_STOCK_OUT"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, password, full_name, email, phone, role_id, status, created_at) VALUES
('u-admin', 'admin', 'pbkdf2-sha256$210000$0071606f335b53fd0358581c6d2c6266$b4589efc5a68c22fd1c84fadd89e52a16c3a2afb02c485a2704592b040584a96', 'Admin', 'admin@erp.local', '', 'ADMIN', 'ACTIVE', CURRENT_DATE::text)
ON CONFLICT (id) DO NOTHING;
