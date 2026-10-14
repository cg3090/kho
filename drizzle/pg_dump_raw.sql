-- Data for Name: chart_of_accounts
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('111', 'Tiền mặt (Cash)', 'ASSET', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('112', 'Tiền gửi Ngân hàng (Bank Deposit)', 'ASSET', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('131', 'Phải thu của khách hàng (Accounts Receivable)', 'ASSET', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('1331', 'Thuế GTGT được khấu trừ (VAT Input 1331)', 'ASSET', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('1561', 'Giá mua hàng hóa (Inventory 1561)', 'ASSET', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('331', 'Phải trả cho người bán (Accounts Payable)', 'LIABILITY', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('3331', 'Thuế GTGT phải nộp (VAT Output 3331)', 'LIABILITY', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('411', 'Vốn góp của chủ sở hữu (Owner Equity)', 'EQUITY', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('421', 'Lợi nhuận sau thuế chưa phân phối (Retained Earnings)', 'EQUITY', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('511', 'Doanh thu bán hàng và cung cấp dịch vụ (Revenue)', 'REVENUE', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('632', 'Giá vốn hàng bán (Cost of Goods Sold - COGS)', 'EXPENSE', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('642', 'Chi phí quản lý doanh nghiệp (Admin Expense)', 'EXPENSE', NULL, false);
INSERT INTO public.chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('911', 'Xác định kết quả kinh doanh (P&L Summary)', 'OFF_BALANCE', NULL, false);

-- Data for Name: account_mappings
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('AP_PAYMENT', '331', 'Tài khoản phải trả nhà cung cấp');
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('AR_PAYMENT', '131', 'Tài khoản phải thu khách hàng');
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('BANK', '112', 'Tài khoản ngân hàng');
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('CASH', '111', 'Tài khoản tiền mặt');
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('COGS', '632', 'Tài khoản giá vốn hàng bán');
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('SALE', '511', 'Tài khoản doanh thu bán hàng');
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('STOCK_IN', '1561', 'Tài khoản hàng hóa trong kho');
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('VAT_INPUT', '1331', 'Tài khoản thuế GTGT đầu vào được khấu trừ');
INSERT INTO public.account_mappings (key, account_code, description) VALUES ('VAT_OUTPUT', '3331', 'Tài khoản thuế GTGT đầu ra phải nộp');

-- Data for Name: categories
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790945794265', 'BÌA', NULL);
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790945775913', 'BÌA LỖ', NULL);
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790945810944', 'BÌA NÚT', NULL);
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790945824357', 'GIẤY TRẮNG', NULL);
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790946043567-t8je', 'Hàng hóa chung', 'Tự động khởi tạo khi Import Excel');
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790939630827', 'KẸP BƯỚM', NULL);
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790939649457', 'KẸP BƯỚM MÀU', NULL);
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790945838536', 'KHÁC', NULL);
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790945762757', 'NHỰA ÉP', NULL);
INSERT INTO public.categories (id, name, description) VALUES ('cat-1790945744706', 'NOTE', NULL);

-- Data for Name: company_info
INSERT INTO public.company_info (id, name, tax_code, address, bank_account, bank_name, logo_url, updated_at) VALUES (1, 'CÔNG TY TNHH V-SMART', '0315894123', 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh', '19034567891012', 'Techcombank - CN Sài Gòn', 'data:image/jpeg;base64,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', '2026-10-08 16:49:21.386');

-- Data for Name: warehouses
INSERT INTO public.warehouses (id, name, location) VALUES ('wh-1790939712257', 'HCM', NULL);

-- Data for Name: uoms
INSERT INTO public.uoms (id, name) VALUES ('uom-1790945686281', 'Cái');
INSERT INTO public.uoms (id, name) VALUES ('uom-1790939575136', 'Hộp');
INSERT INTO public.uoms (id, name) VALUES ('uom-1790945680661', 'Ram');
INSERT INTO public.uoms (id, name) VALUES ('uom-1790955801503', 'Thùng');
INSERT INTO public.uoms (id, name) VALUES ('uom-1790945671855', 'Xấp');

-- Data for Name: system_config
INSERT INTO public.system_config (id, allow_negative_stock, default_vat_rate, auto_approve_quotation, theme_color, updated_at) VALUES (1, true, 0.00, false, '#f59e0b', '2026-10-08 16:49:21.368');

-- Data for Name: roles
INSERT INTO public.roles (id, name, description, color, is_system, permissions) VALUES ('ACCOUNTANT', 'Kế toán tổng hợp', 'Quản lý công nợ, sổ sách kế toán, bảng kê thuế VAT, báo cáo tài chính và giá vốn hạch toán', '#3b82f6', true, '["VIEW_WEBSHOP", "MANAGE_WEBSHOP_ORDERS", "VIEW_PURCHASE_COST", "VIEW_DIRECTORIES", "VIEW_STOCK_IN", "VIEW_STOCK_OUT", "VIEW_QUOTATIONS", "VIEW_DEBT", "CREATE_PAYMENTS", "VIEW_ACCOUNTING", "VIEW_VAT_LEDGER", "VIEW_REPORTS"]');
INSERT INTO public.roles (id, name, description, color, is_system, permissions) VALUES ('ADMIN', 'Quản trị (Admin)', 'Toàn quyền điều hành cao nhất hệ thống, xem toàn bộ giá mua, giá vốn, doanh thu, lợi nhuận và cấu hình RBAC', '#10b981', true, '["VIEW_WEBSHOP", "MANAGE_WEBSHOP_ORDERS", "CONFIG_WEBSHOP", "VIEW_PURCHASE_COST", "EDIT_PRODUCT_COST", "VIEW_DIRECTORIES", "MANAGE_DIRECTORIES", "VIEW_STOCK_IN", "CREATE_STOCK_IN", "VIEW_STOCK_OUT", "CREATE_STOCK_OUT", "CONFIRM_TRANSACTIONS", "VIEW_QUOTATIONS", "CREATE_QUOTATIONS", "VIEW_DEBT", "CREATE_PAYMENTS", "VIEW_ACCOUNTING", "VIEW_VAT_LEDGER", "VIEW_REPORTS", "MANAGE_USERS", "MANAGE_ROLES", "MANAGE_SETTINGS"]');
INSERT INTO public.roles (id, name, description, color, is_system, permissions) VALUES ('SALES', 'Nhân viên kinh doanh (Sales)', 'Lập báo giá cho khách hàng, tạo phiếu xuất bán hàng và thu tiền khách. KHÔNG THẤY giá mua hoặc giá vốn nhập vào', '#ec4899', true, '["VIEW_WEBSHOP", "MANAGE_WEBSHOP_ORDERS", "CONFIG_WEBSHOP", "VIEW_DIRECTORIES", "VIEW_STOCK_OUT", "CREATE_STOCK_OUT", "VIEW_QUOTATIONS", "CREATE_QUOTATIONS", "VIEW_DEBT"]');
INSERT INTO public.roles (id, name, description, color, is_system, permissions) VALUES ('VIEWER', 'Nhân viên thực tập / Xem', 'Chỉ có quyền xem thông tin cơ bản danh mục và phiếu xuất. Không được thao tác sửa hay xem giá vốn', '#8b5cf6', false, '["VIEW_WEBSHOP", "VIEW_DIRECTORIES", "VIEW_STOCK_OUT"]');
INSERT INTO public.roles (id, name, description, color, is_system, permissions) VALUES ('WAREHOUSE', 'Thủ kho / Quản lý kho', 'Chuyên trách xuất - nhập vật lý, theo dõi số lượng tồn kho và thẻ kho. KHÔNG THẤY giá mua, tiền mua và giá trị tiền tồn kho', '#f59e0b', true, '["VIEW_WEBSHOP", "MANAGE_WEBSHOP_ORDERS", "VIEW_DIRECTORIES", "MANAGE_DIRECTORIES", "VIEW_STOCK_IN", "CREATE_STOCK_IN", "VIEW_STOCK_OUT", "CREATE_STOCK_OUT", "CONFIRM_TRANSACTIONS", "VIEW_QUOTATIONS"]');

-- Data for Name: sequence_configs
INSERT INTO public.sequence_configs (type, prefix, digits, current_number) VALUES ('BG', 'BG', 4, 1);
INSERT INTO public.sequence_configs (type, prefix, digits, current_number) VALUES ('PC', 'PC', 4, 1);
INSERT INTO public.sequence_configs (type, prefix, digits, current_number) VALUES ('PN', 'PN', 4, 1);
INSERT INTO public.sequence_configs (type, prefix, digits, current_number) VALUES ('PT', 'PT', 4, 1);
INSERT INTO public.sequence_configs (type, prefix, digits, current_number) VALUES ('PX', 'PX', 4, 1);

-- Data for Name: users
INSERT INTO public.users (id, username, password, full_name, email, phone, role_id, status, avatar_url, created_at, last_login) VALUES ('u-admin', 'admin', 'pbkdf2-sha256$210000$0071606f335b53fd0358581c6d2c6266$b4589efc5a68c22fd1c84fadd89e52a16c3a2afb02c485a2704592b040584a96', 'Admin', 'admin@verp.vn', '0901 888 999', 'ADMIN', 'ACTIVE', NULL, '2026-01-01', '2026-10-03T11:12:50.010Z');

-- Data for Name: webshop_store_config
INSERT INTO public.webshop_store_config (id, store_name, store_slogan, hotline, email, address, default_warehouse_id, auto_create_stock_out, allow_order_when_out_of_stock, bank_name, bank_account, bank_owner, banner_title, banner_subtitle, zalo_number, support_hours, chat_welcome_message, enable_support_widget) VALUES (1, '', '', '', '', '', '', true, false, '', '', '', '', '', '', '', '', true);
