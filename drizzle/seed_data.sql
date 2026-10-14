-- =========================================================================
-- CLOUDFLARE D1 SQL DATA SEED: drizzle/seed_data.sql
-- Dữ liệu đã chuyển đổi từ PostgreSQL Dump sang SQLite D1
-- Chuẩn số nguyên VNĐ, tương thích Cloudflare D1
-- =========================================================================


-- Data for Name: chart_of_accounts
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('111', 'Tiền mặt (Cash)', 'ASSET', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('112', 'Tiền gửi Ngân hàng (Bank Deposit)', 'ASSET', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('131', 'Phải thu của khách hàng (Accounts Receivable)', 'ASSET', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('1331', 'Thuế GTGT được khấu trừ (VAT Input 1331)', 'ASSET', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('1561', 'Giá mua hàng hóa (Inventory 1561)', 'ASSET', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('331', 'Phải trả cho người bán (Accounts Payable)', 'LIABILITY', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('3331', 'Thuế GTGT phải nộp (VAT Output 3331)', 'LIABILITY', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('411', 'Vốn góp của chủ sở hữu (Owner Equity)', 'EQUITY', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('421', 'Lợi nhuận sau thuế chưa phân phối (Retained Earnings)', 'EQUITY', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('511', 'Doanh thu bán hàng và cung cấp dịch vụ (Revenue)', 'REVENUE', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('632', 'Giá vốn hàng bán (Cost of Goods Sold - COGS)', 'EXPENSE', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('642', 'Chi phí quản lý doanh nghiệp (Admin Expense)', 'EXPENSE', NULL, 0);
INSERT OR REPLACE INTO chart_of_accounts (code, name, type, parent_code, is_custom) VALUES ('911', 'Xác định kết quả kinh doanh (P&L Summary)', 'OFF_BALANCE', NULL, 0);

-- Data for Name: account_mappings
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('AP_PAYMENT', '331', 'Tài khoản phải trả nhà cung cấp');
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('AR_PAYMENT', '131', 'Tài khoản phải thu khách hàng');
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('BANK', '112', 'Tài khoản ngân hàng');
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('CASH', '111', 'Tài khoản tiền mặt');
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('COGS', '632', 'Tài khoản giá vốn hàng bán');
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('SALE', '511', 'Tài khoản doanh thu bán hàng');
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('STOCK_IN', '1561', 'Tài khoản hàng hóa trong kho');
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('VAT_INPUT', '1331', 'Tài khoản thuế GTGT đầu vào được khấu trừ');
INSERT OR REPLACE INTO account_mappings (key, account_code, description) VALUES ('VAT_OUTPUT', '3331', 'Tài khoản thuế GTGT đầu ra phải nộp');

-- Data for Name: categories
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790945794265', 'BÌA', NULL);
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790945775913', 'BÌA LỖ', NULL);
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790945810944', 'BÌA NÚT', NULL);
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790945824357', 'GIẤY TRẮNG', NULL);
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790946043567-t8je', 'Hàng hóa chung', 'Tự động khởi tạo khi Import Excel');
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790939630827', 'KẸP BƯỚM', NULL);
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790939649457', 'KẸP BƯỚM MÀU', NULL);
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790945838536', 'KHÁC', NULL);
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790945762757', 'NHỰA ÉP', NULL);
INSERT OR REPLACE INTO categories (id, name, description) VALUES ('cat-1790945744706', 'NOTE', NULL);

-- Data for Name: company_info
INSERT OR REPLACE INTO company_info (id, name, tax_code, address, bank_account, bank_name, logo_url, updated_at) VALUES (1, 'CÔNG TY TNHH V-SMART', '0315894123', 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh', '19034567891012', 'Techcombank - CN Sài Gòn', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAuAC0DASIAAhEBAxEB/8QAGgAAAwADAQAAAAAAAAAAAAAABQYHAwQIAv/EADEQAAEDAgQEBAYBBQAAAAAAAAECAxEEBQAGEiETFDFBBxVhcRYiMkJRkYEjQ4Kx8f/EABgBAAMBAQAAAAAAAAAAAAAAAAIEBQYD/8QAKREAAgEDAgQFBQAAAAAAAAAAAQIDABEhBEEiMWHBBRITYnFRgdHh8f/aAAwDAQACEQMRAD8A6AZaRwW/kT9I7Yy8BETw0x7YW7xeri1c6Cy2ClpXri/TmqW5WKUlploHTJ07kk4SF2zM17zNV1tqqV2++UrqqS4A1JLLQKZSpsmToUPtgwQCPSmkPmySBUh5/JhVJNUcXyyefeS82x5pOnl9Cp1adUTETHrgymnQd+ECInZMmPbEpHhXczVc+czDzTVxOPwlzr/OvVqn1jGjdhWZfrkHNNyedGpk3CubcVrdRqJbpmeh6J1rO3b0k2gjawje5+N+lAuokW5lSw+duvOmu8Z7YYyYq9UNv4FSqqVSs0txbKFOFJhSkgbmP4gyOvUx4e1lwu2WU1t8aQmsXUOp0cEN6EpIATpj8g9d8LliSrOdwosyXqjS2+HHRamVSoLRIKHFp7IRBM/cTPYYo1JzQpGRXLQ5UhP9RSBsThSSaMN6CrxDJOw9vem44pGHrs3CcAfX3dqmWf7raae7Wbl7jVU+YG1GmDluUhbjSFR8jiFGCCTsJkb4XbXmC45Bz5crXe3Obo6moC6iocHzqB+l4H2O46dRjD4rWSmy3e7bmZipW45V1oedpnIlJTpVKe5TtG/TbDJ44WVF4y0xmS3Q4ujQHCU78WlXvP8AiTPsVYpRmMKitlWFj8/2pkgkLO64ZSCOot+KqAAmApJT11TtH59sJ/HTmHMzCKdhhKEkgPKaSpYQIlUkHSTA6R2wk5Y8QE1OQfLXVnzBgBjid1U8bGfz9mHvw/ZTbMvuXi5qS2H0moUpX9thO4/cE/rGV8QE8utGjQkBcsRi/T7961GhES6M6xwCWwoOx/Xag/h1nZF/zDdm7vXIpK5L3K0NuKwlHDE7J7rXI3JPsBilYgPgxl6lzPmSvzO9VraXRV/HapW9MqKiVSqdwncDbrvi/DF3UoiPZKjaZ3eO71Ps65BoM5PW2oqat+jep2i0VMoCi4g7gbnaCT+8T7I+c6rK1/fyRdGU3y3pql0LSmlQUSSlQGrYo3MgnbeDi1M1aA23sr6R/rA8Wmwi7vXUWphNxfaUy5UIQEqUlQhXeNRH3RPrgxLwFGyNulCYuMOuDvXN9PYWUX3mzzvwMLjwPNgyoI4OuOvWO0/8w6Z9zrW5rzC1ki3NJslvXVponlvKkrhQCQdOwR0gCZ2kxg18MZo8l+BPMbZ8PETznDXzXLa9ejT9Gqe8/A4ovk9gN5ZuyrUwu5MtJZbqFolSUp2T3jUB90Tjo84LBmFyOXY0CQEKVXAPPuKF+Hvhzb8lV9dV0tZUVj9QgNJU8gJLaJlQ26yQN/TDxjUFa3+F/rHrnG4+lX6GE3Yubsbmm0UILKMV//Z', '2026-10-08 16:49:21.386');

-- Data for Name: warehouses
INSERT OR REPLACE INTO warehouses (id, name, location) VALUES ('wh-1790939712257', 'HCM', NULL);

-- Data for Name: uoms
INSERT OR REPLACE INTO uoms (id, name) VALUES ('uom-1790945686281', 'Cái');
INSERT OR REPLACE INTO uoms (id, name) VALUES ('uom-1790939575136', 'Hộp');
INSERT OR REPLACE INTO uoms (id, name) VALUES ('uom-1790945680661', 'Ram');
INSERT OR REPLACE INTO uoms (id, name) VALUES ('uom-1790955801503', 'Thùng');
INSERT OR REPLACE INTO uoms (id, name) VALUES ('uom-1790945671855', 'Xấp');

-- Data for Name: system_config
INSERT OR REPLACE INTO system_config (id, allow_negative_stock, default_vat_rate, auto_approve_quotation, theme_color, updated_at) VALUES (1, 1, 0.00, 0, '#f59e0b', '2026-10-08 16:49:21.368');

-- Data for Name: roles
INSERT OR REPLACE INTO roles (id, name, description, color, is_system, permissions) VALUES ('ACCOUNTANT', 'Kế toán tổng hợp', 'Quản lý công nợ, sổ sách kế toán, bảng kê thuế VAT, báo cáo tài chính và giá vốn hạch toán', '#3b82f6', 1, '["VIEW_WEBSHOP", "MANAGE_WEBSHOP_ORDERS", "VIEW_PURCHASE_COST", "VIEW_DIRECTORIES", "VIEW_STOCK_IN", "VIEW_STOCK_OUT", "VIEW_QUOTATIONS", "VIEW_DEBT", "CREATE_PAYMENTS", "VIEW_ACCOUNTING", "VIEW_VAT_LEDGER", "VIEW_REPORTS"]');
INSERT OR REPLACE INTO roles (id, name, description, color, is_system, permissions) VALUES ('ADMIN', 'Quản trị (Admin)', 'Toàn quyền điều hành cao nhất hệ thống, xem toàn bộ giá mua, giá vốn, doanh thu, lợi nhuận và cấu hình RBAC', '#10b981', 1, '["VIEW_WEBSHOP", "MANAGE_WEBSHOP_ORDERS", "CONFIG_WEBSHOP", "VIEW_PURCHASE_COST", "EDIT_PRODUCT_COST", "VIEW_DIRECTORIES", "MANAGE_DIRECTORIES", "VIEW_STOCK_IN", "CREATE_STOCK_IN", "VIEW_STOCK_OUT", "CREATE_STOCK_OUT", "CONFIRM_TRANSACTIONS", "VIEW_QUOTATIONS", "CREATE_QUOTATIONS", "VIEW_DEBT", "CREATE_PAYMENTS", "VIEW_ACCOUNTING", "VIEW_VAT_LEDGER", "VIEW_REPORTS", "MANAGE_USERS", "MANAGE_ROLES", "MANAGE_SETTINGS"]');
INSERT OR REPLACE INTO roles (id, name, description, color, is_system, permissions) VALUES ('SALES', 'Nhân viên kinh doanh (Sales)', 'Lập báo giá cho khách hàng, tạo phiếu xuất bán hàng và thu tiền khách. KHÔNG THẤY giá mua hoặc giá vốn nhập vào', '#ec4899', 1, '["VIEW_WEBSHOP", "MANAGE_WEBSHOP_ORDERS", "CONFIG_WEBSHOP", "VIEW_DIRECTORIES", "VIEW_STOCK_OUT", "CREATE_STOCK_OUT", "VIEW_QUOTATIONS", "CREATE_QUOTATIONS", "VIEW_DEBT"]');
INSERT OR REPLACE INTO roles (id, name, description, color, is_system, permissions) VALUES ('VIEWER', 'Nhân viên thực tập / Xem', 'Chỉ có quyền xem thông tin cơ bản danh mục và phiếu xuất. Không được thao tác sửa hay xem giá vốn', '#8b5cf6', 0, '["VIEW_WEBSHOP", "VIEW_DIRECTORIES", "VIEW_STOCK_OUT"]');
INSERT OR REPLACE INTO roles (id, name, description, color, is_system, permissions) VALUES ('WAREHOUSE', 'Thủ kho / Quản lý kho', 'Chuyên trách xuất - nhập vật lý, theo dõi số lượng tồn kho và thẻ kho. KHÔNG THẤY giá mua, tiền mua và giá trị tiền tồn kho', '#f59e0b', 1, '["VIEW_WEBSHOP", "MANAGE_WEBSHOP_ORDERS", "VIEW_DIRECTORIES", "MANAGE_DIRECTORIES", "VIEW_STOCK_IN", "CREATE_STOCK_IN", "VIEW_STOCK_OUT", "CREATE_STOCK_OUT", "CONFIRM_TRANSACTIONS", "VIEW_QUOTATIONS"]');

-- Data for Name: sequence_configs
INSERT OR REPLACE INTO sequence_configs (type, prefix, digits, current_number) VALUES ('BG', 'BG', 4, 1);
INSERT OR REPLACE INTO sequence_configs (type, prefix, digits, current_number) VALUES ('PC', 'PC', 4, 1);
INSERT OR REPLACE INTO sequence_configs (type, prefix, digits, current_number) VALUES ('PN', 'PN', 4, 1);
INSERT OR REPLACE INTO sequence_configs (type, prefix, digits, current_number) VALUES ('PT', 'PT', 4, 1);
INSERT OR REPLACE INTO sequence_configs (type, prefix, digits, current_number) VALUES ('PX', 'PX', 4, 1);

-- Data for Name: users
INSERT OR REPLACE INTO users (id, username, password, full_name, email, phone, role_id, status, avatar_url, created_at, last_login) VALUES ('u-admin', 'admin', 'pbkdf2-sha256$210000$0071606f335b53fd0358581c6d2c6266$b4589efc5a68c22fd1c84fadd89e52a16c3a2afb02c485a2704592b040584a96', 'Admin', 'admin@verp.vn', '0901 888 999', 'ADMIN', 'ACTIVE', NULL, '2026-01-01', '2026-10-03T11:12:50.010Z');

-- Data for Name: webshop_store_config
INSERT OR REPLACE INTO webshop_store_config (id, store_name, store_slogan, hotline, email, address, default_warehouse_id, auto_create_stock_out, allow_order_when_out_of_stock, bank_name, bank_account, bank_owner, banner_title, banner_subtitle, zalo_number, support_hours, chat_welcome_message, enable_support_widget) VALUES (1, 'V-SMART DIGITAL STORE', 'Hệ thống bán lẻ', '1900 6868 - 0901 888 999', 'sales@verp.vn', 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh', 'wh-1', 1, 0, 'Techcombank - CN Sài Gòn', '19034567891012', 'CÔNG TY TNHH V-ERP SMART SOLUTIONS', 'SIÊU HỘI MUA SẮM CÔNG NGHỆ CHÍNH HÃNG 2026', 'Đồng bộ kho thực tế 100% - Bảo hành chính hãng - Giao hàng toàn quốc', '0901888999', '8:00 - 21:30 (Thứ 2 - Chủ Nhật)', 'Xin chào Quý khách! Smart WMS Store sẵn sàng hỗ trợ kiểm tra tồn kho, tư vấn sản phẩm và giải đáp đơn hàng.', 1);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-30', 'CTY  XÂY LẤP HỒNG ĐỨC I', 'KH-506694-30', NULL, 'LIÊN HƯƠNG ,TUY PHONG, BÌNH THUẬN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-48', 'CTY .  QUẢNG CÁO PHAT NIÊN GIÁM', 'KH-506694-48', NULL, '178 VÕ THỊ SÁU , P 7. Q 3 TP. HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-43', 'CTY :  BẢO HỘ Á CHAU', 'KH-506694-43', NULL, 'SỐ 29  ĐƯỜNG SỐ 2  .CX BÌNH THỚI P . 8 Q . 11 TPHCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-41', 'CTY : CMA CRM', 'KH-506694-41', NULL, '81-85 HÀM NGHI Q. 1 TP : HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-42', 'CTY : NAM A', 'KH-506694-42', NULL, '34 -DƯỜNG 33 AN DƯƠNG VƯƠNG P.10 Q. 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-50', 'CTY : PHÚ THỊNH', 'KH-506694-50', NULL, '436 B /106/25 , ĐƯỜNG 3-2 , P12 , Q 10');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-44', 'CTY : TNHH SX TM A KIM', 'KH-506694-44', NULL, 'SỐ 343/32 SƯ VẠN HẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-9', 'CTY : TNHH XNK KHÔI NGUYÊN', '03 09 37 00 13', NULL, '27 B NGÔ TẤT TỐ , P22 , Q BÌNH THẠNH, MST : 03 09 37 00 13');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-40', 'CTY ; TNHH-TM PHAN NHÂN', 'KH-506694-40', NULL, '107 Đ 2 P .25 .Q. BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-26', 'CTY CHIAKI', 'KH-506694-26', NULL, '24 DUY TÂN  PHÚ NHUẬN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-25', 'CTY CPTMDV DAU TU VA PHAT TRIỂN HOÀNG ANH', 'KH-506694-25', NULL, '22/7 K.P.1. HUYNH TAN PHAT Q 7');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-28', 'CTY HỒNG NGUYỄN', 'KH-506694-28', NULL, '22 ĐƯỜNG 19 XÃ BÌNH HƯNG H B- CHÁNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-10', 'CTY THUẬN THẮNG', 'KH-506693-10', NULL, '105 DƯỜNG Đ 2.P 25. Q BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-34', 'CTY TNHH LONG ANH', 'KH-506694-34', NULL, '1073. TRẦN HƯNG ĐẠO - TP: QUY NHƠN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-35', 'CTY TNHH TM  LIÊN ANH', 'KH-506694-35', NULL, '129 .TĂNG BẠC HỔ - TP : QUY NHƠN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-53', 'CTY: ĐỒNG TiẾN', 'KH-506694-53', NULL, '49- TÔN ĐỨC THẮNG TP : QUY NHƠN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-58', 'CTY: PHƯƠNG NAM ( NGUYÊN OANH )', '0301860552', NULL, '940 ĐƯỜNG  3-2 , P15 , Q 11 , MST : 0301860552');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-38', 'CTY: TNHH MTV TM DV KỸ THUẬT HOÀNG SƠN', 'KH-506694-38', NULL, '79 ĐƯỜNG D2 , P 25 Q, BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-67', 'CTY: TNHH TM DV QuẢNG CÁO GIA CÁT', 'KH-506694-67', NULL, '35 VÕ THÀNH TRANG , P, 11, Q TÂN BÌNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-24', 'CTY: TNHH TM VA DV CHAU LE', 'KH-506694-24', NULL, 'C5/9A PHAM HUNG , H BINH CHANH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-66', 'CTY: TNHH TM XUÂN VY', 'KH-506695-110', NULL, '405/4 TRƯỜNG CHINH , P 14 , Q TÂN BÌNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-45', 'CTY; QUOC HUY ANH', 'KH-506694-45', NULL, '54 NGUYỄN BÁ TUYỂN . P12 . Q TAN BINH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-46', 'CTY; TNHH- MTV . VPP-  HUY MINH', 'KH-506694-46', NULL, '192 VINH VIEN P.9 Q . 10');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-65', 'DĐỊA CHỈ : 232/15 TÔ HiỆU, P HIÊP TÂN, T PHÚ', 'KH-506694-65', NULL, '232/15 , TÔ HiỆU , P HiỆP TÂN , TÂN PHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-3', 'Duy  HỢP', '0310245112', NULL, '272 NƠ TRANG LONG .P12.Q BÌNH THẠNH . MST : 0310245112');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-39', 'HUYNH GIANG', 'KH-506694-39', NULL, '88 ĐƯỜNG VÀNH ĐAI , P10 , Q 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-37', 'NGỌC THỦY', 'KH-506694-37', NULL, '89 . LÝ THÁI TỔ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-54', 'NHÀ SÁCH : NGUYỄN VĂN CỪ ( HÀ NỘI )', 'KH-506694-54', NULL, '356 - LÊ QUANG SUNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-57', 'NHÀ SÁCH : PHÚC NHÂN', 'KH-506694-57', NULL, 'F1/63 - ĐƯỜNG QUÁCH ĐIÊU , XÃ VĨNH LỘC A, BÌNH CHÁNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-23', 'Nhà sách Nguyễn Văn Cừ  ( lê văn việt )', 'KH-506694-23', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-22', 'Nhà sách Nguyễn Văn Cừ  ( sinh viên )', 'KH-506694-22', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-15', 'Nhà sách Nguyễn Văn Cừ  Đồng nai )', 'KH-506693-15', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-32', 'NHÀ SÁCH NGUYỄN VĂN CỪ ( BẾN TRE)', 'KH-506694-32', NULL, '356 LE QUANG SUNG , Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-16', 'Nhà sách Nguyễn Văn Cừ ( bình thuận )', 'KH-506693-16', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-18', 'Nhà sách Nguyễn Văn Cừ ( nguyễn tất  thành )', 'KH-506693-18', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-17', 'Nhà sách Nguyễn Văn Cừ ( phú yên )', 'KH-506693-17', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-33', 'NHÀ SÁCH NGUYỄN VĂN CỪ ( Q . 2 )', 'KH-506694-33', NULL, '356 LE QUANG SUNG , Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-5', 'Nhà sách Nguyễn Văn Cừ ( Q. 1 )', 'KH-506693-5', NULL, '235 C Nguyễn Văn Cừ Q1');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-31', 'NHÀ SÁCH NGUYỄN VĂN CỪ ( TÂY NINH )', 'KH-506694-31', NULL, '356 LE QUANG SUNG , Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-2', 'Nhà sách Nguyễn Văn Cừ ( tổng kho )', 'KH-506693-2', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-14', 'Nhà sách Nguyễn Văn Cừ (6)', 'KH-506693-14', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-13', 'Nhà sách Nguyễn Văn Cừ (sa Đét )', 'KH-506693-13', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-19', 'Nhà sách Nguyễn Văn Cừ( 2)', 'KH-506693-19', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-12', 'Nhà sách Nguyễn Văn Cừ( 4)', 'KH-506693-12', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-11', 'Nhà sách Nguyễn Văn Cừ( Q12)', 'KH-506693-11', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-4', 'Nhà sách Tân Tạo', 'KH-506693-4', NULL, '1032 Quốc lộ 1A .Q Bình Tân');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-20', 'nhaà sách nguyễn văn cừ ( quãng ngãi )', 'KH-506693-20', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-21', 'nhaà sách nguyễn văn cừ ( tiền giang )', 'KH-506694-21', NULL, '356 Lê Quang Sung ,Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-36', 'PHOTO QUOC NGUYÊN', 'KH-506694-36', NULL, '……838… HỒNG BÀNG Q. 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-6', 'Thế Giới Phẳng', 'KH-506693-6', NULL, '491 Tô Hiến Thành . Q10');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-52', 'VĂN CỪ ( QUÃNG TRỊ )', 'KH-506694-52', NULL, '356  - LÊ QUANG SUNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-8', 'VĂN CỪ :  (BÌNH CHÁNH)', 'KH-506693-8', NULL, '356 LÊ QUANG SUNG , Q 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-59', 'VĂN CỪ : ( BẢO LỘC )', 'KH-506694-59', NULL, '356 LÊ QUANG SUNG , Q 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-51', 'VĂN CỪ : ( QuẢNG NAM )', 'KH-506694-51', NULL, '356 LÊ QUANG SUNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-64', 'VĂN CỪ : THANH HÓA', 'KH-506694-64', NULL, '356 LEÊ QUANG SUNG , Q 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-49', 'VĂN PHÒNG PHẨM . THANH HOA', 'KH-506694-49', NULL, '62 - ĐƯỜNG TRẦN CHÁNH CHIẾU , P14 ,Q5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-56', 'VĂN PHÒNG PHẨM : PI TY', 'KH-506694-56', NULL, '131/661/29 - ĐƯỜNG LÊ LỢI . P3 . Q GÒ VẤP');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-55', 'VPP ; 45/88/10A - ( BÌNH TIÊN )', 'KH-506694-55', NULL, 'VPP : 45/88/10A - BÌNH TIÊN  - Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-7', 'C ty Tân Bảo Tính', 'KH-506693-7', NULL, '126A Y Ngong . TP Buôn mê Thuột');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-103', 'CTY : TNHH ViỆT BẢO LONG', 'KH-506695-103', NULL, '280/40 BÙI HỮU NGHĨA , P 2 , Q BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-126', 'CTY:  TNHH DV TM SAO BĂNG', 'KH-506696-126', NULL, '195/15/8 ĐIỆN BIÊN PHỦ . P 15 .Q BÌNH THẠNH*');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-93', 'CTY:  TNHH MTV ViỆT TRẦN', 'KH-506695-93', NULL, 'LÔ A ĐƯỜNG SỐ 1 , KCN LONG ĐỨC. XÃ LONG ĐỨC ,TP TRÀ VINH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-94', 'CTY:  TNHH TM - DV NHÂN DŨNG', 'KH-506695-94', NULL, '237/115 TRẦN VĂN ĐANG , P 11 , Q 3 , TP HCM ( 0303 851 296');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-78', 'CTY: BẢO ÂN', 'KH-506694-78', NULL, '80/3 KHIẾU NĂNG TỈNH , P AN LẠC , Q , BÌNH TÂN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-121', 'CTY: CỔ  PHẦN QUANG HƯNG PHÁT', 'KH-506695-121', NULL, '479, BÌNH DÔNG . P 13. Q 8');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-73', 'CTY: CỔ PHẦN CAO SU BẾN THÀNH', 'KH-506694-73', NULL, 'LÔ B3 - 1 KHU CÔNG NGHIỆP TÂY BẮC CỦ CHI TP, HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-97', 'CTY: CỔ PHẦN NGỌC DOANH', '0309788675', NULL, '152 NGUYỄN SĨ SÁCH , P 15 , Q TÂN BÌNH, MST : 0309788675');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-76', 'CTY: CỔ PHẦN PHÁT TRIỄN CÔNG NGHỆ NGHI ANH', 'KH-506694-76', NULL, '76 NGUYỄN XUÂN KHOÁI . P TÂN THÀNH . Q TÂN PHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-82', 'CTY: cổ phần thương mại và phát triền nguyễn anh', 'KH-506694-82', NULL, '530 DT 742 . P phú mỹ . Thủ dầu một . Bình dương');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-128', 'CTY: CỔ PHẦN TRƯỜNG XUÂN', 'KH-506696-128', NULL, '74 LÊ LỢI , PLEIKU');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-91', 'CTY: CÔNG NGHỆ XANH', 'KH-506695-115', NULL, '76/31/22 NGUYỄN SƠN . P PHÚ THỌ HOÀ . Q TÂN PHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-109', 'CTY: CPTVKT VÀ XÂY DỰNG TP HCM', 'KH-506695-109', NULL, '98 TRẦN QUANG KHẢI . P TÂN DỊNH. Q 1 . TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-80', 'CTY: ĐẶNG THÀNH', 'KH-506694-80', NULL, '326/74 A ĐOÀN VĂN BƠ ; P16 , Q 4');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-96', 'CTY: HƯNG THÀNH', 'KH-506695-96', NULL, '74 LÝ THÁI TỔ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-112', 'CTY: TNHH  -TM - DV  MINH TRỊ', 'KH-506695-112', NULL, '12 A ĐƯỜNG D52 . P 12 . Q TÂN BINH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-99', 'CTY: TNHH  ĐiỆN - ĐiỆN TỬ MÊ TRẦN', 'KH-506695-99', NULL, '84 A2 , LÝ CHIÊU HOÀNG , P 10 , Q, 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-125', 'CTY: TNHH  HƯƠNG LINH', 'KH-506695-125', NULL, '116 ĐƯỜNG SỐ 41 , P TÂN QUY , Q7 , TPHCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-83', 'CTY: TNHH IN BAO BÌ TÂN ĐƯỢC LỢI', 'KH-506694-83', NULL, '7/1B KỲ ĐỒNG , P, 9 ,Q 3 TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-104', 'CTY: TNHH MTV TM DV KỸ THUẬT MAI ANH', 'KH-506695-104', NULL, '119 ĐƯỜNG D2 , P 25, Q BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-87', 'CTY: TNHH NAM THÔNG BẢO', 'KH-506694-87', NULL, '101 ĐƯỜNG SỐ 44 KDC BÌNH PHÚ . P 10 . Q 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-105', 'CTY: TNHH SÀI GÒN ĐỒ GỖ QuỐC TẾ S M I', 'KH-506695-105', NULL, '26/4 ĐƯƠNG LAM SƠN , P7 , Q BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-122', 'CTY: TNHH SX TM DV TIẾN CHUNG', 'KH-506695-122', NULL, '31/1A nguyễN Ảnh thủ - tây lân - bà điểm  HM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-107', 'CTY: TNHH SX TM, KIM HOÀN VŨ', 'KH-506695-107', NULL, 'H31 BIS K300 CỘNG HÒA , P12, Q TÂN BÌNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-129', 'CTY: TNHH SX XNK VPP  GIA LONG', 'KH-506696-129', NULL, '131/6 NGUYỄN CUU DAM P TANSƠN NHI , Q TAN PHU');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-111', 'CTY: TNHH TÂN NAM TRƯỜNG THỊNH', 'KH-506695-111', NULL, '56A LÊ CAO LÃNG . P PHÚ THẠNH . Q TÂN PHÚ TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-98', 'CTY: TNHH TM & DV NGUYỄN PHƯƠNG', 'KH-506695-98', NULL, '43 ĐƯƠNG SỐ1, P. BÌNH TRỊ ĐÔNG B , Q BÌNH TÂN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-75', 'CTY: TNHH TM & DV TĂNG HUY', 'KH-506694-75', NULL, '99/24 B LÊ ĐỨC THỌ , P17 , Q GÒ VẤP , TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-86', 'CTY: TNHH TM DV - VH ViỆT Ý', 'KH-506694-86', NULL, '743/26 HỒNG BÀNG . P 6 , Q, 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-127', 'CTY: TNHH TM DV PHÁT THÀNH LỘC', 'KH-506696-127', NULL, '24/ 14/19 TRƯƠNG PHƯỚC PHAN . P BÌNH TRỊ ĐÔNG Q , BT');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-84', 'CTY: TNHH TM DV QC XD TÂN HÙNG THUẬN', 'KH-506694-84', NULL, '107/4A NGÔ ĐỨC KẾ , P, 12 Q BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-74', 'CTY: TNHH TM DV THUẬN BẢO', 'KH-506694-74', NULL, '541/17 ĐƯỜNG ĐiỆN BIÊN PHỦ , P3 , Q3');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-85', 'CTY: TNHHTMDV- XNK SAO MAI VINA', 'KH-506694-85', NULL, '72 PHỔ QUANG , P 2 , Q TÂN BÌNH , TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-68', 'CTY: VĨNH MINH HƯNG', 'KH-506694-68', NULL, '110/43/8 , BÀ HOM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-102', 'CỬA HÀNG NGỌC MAI', 'KH-506695-102', NULL, '127 : NGUYỄN TRẢI . P 2 . Q5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-108', 'DN TN GiẤY ViỆT QUANG', 'KH-506695-108', NULL, '14 NGUYỄN DUY . P . 14. Q. 8');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-90', 'DNTN : NAM GiẤY', 'KH-506695-90', NULL, '36 LÊ NiỆM : Q TÂN PHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-95', 'DNTN : ViỆT NHẬT', 'KH-506695-95', NULL, '10/8KP ĐỒNG AN , P , BÌNH HÒA , TX .THUẬN AN , T BD');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-116', 'DNTN THÀNH THUẬN PHÁT', 'KH-506695-116', NULL, '279 TRẦN NHÂN TÔN .P2 . Q 10');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-100', 'DNTN TM DV HOÀNG SƠN', 'KH-506695-100', NULL, '133/2 NGÔ ĐỨC KẾ , P 12 , Q, BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-79', 'NS : BÍCH KIM', 'KH-506694-79', NULL, '49-49 QuỐC LỘ 91, THỊ XÃ CHÂU ĐỐC, TỈNH AN GIANG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-88', 'NS : VĂN LANG', 'KH-506694-88', NULL, '29/7 ĐƯỜNG QUANG TRUNG , P 8 , Q GÒ VẤP');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-119', 'TRƯỜNG CAO ĐẲNG  GIAO THÔNG VẬN TẢI 3', 'KH-506695-119', NULL, '189 KINH DƯƠNG VƯƠNG . P 13 Q 6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-120', 'VI TINH HOANG MINH', 'KH-506695-120', NULL, '158 B .F      .');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-89', 'VPP : CHỊ THẢO', 'KH-506695-89', NULL, '132 C  PHÙNG HƯNG . Q5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-130', 'VPP : CHÚ PHÚC', 'KH-506696-130', NULL, '198 A PHÙNG HƯNG , Q5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-101', 'VPP: ANH HAI ,', 'KH-506695-101', NULL, '240 HẢI THUỢNG LÃN ÔNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-123', 'VPP: ĐĂNG KHOA', 'KH-506695-123', NULL, '123 ĐÀO CAM MỘC . P 4 , Q8');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-124', 'VPP: HƯNG LỢI', 'KH-506695-124', NULL, '149 HẢI THƯỢNG LÃN ÔNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-69', 'VPP: HUYỀN LONG XUYÊN', 'KH-506694-69', NULL, '124 PHÓ ĐỨC CHÍNH , BÌNG KHÁNH 3 ,BÌNH KHÁNH L XUYÊN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-92', 'VPP: KHANH DANH', 'KH-506695-92', NULL, '320 LÝ THÁI TỔ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-114', 'VPP: SAO MỚI', 'KH-506695-114', NULL, 'SÔ 65 ĐƯỜNG SỐ 5 , P11 . Q6');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-117', 'VPP: TÂN SANH', 'KH-506695-117', NULL, 'HẢI THƯỢNG LÃN ÔNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-77', 'VPP: TOÀN HÀ', 'KH-506694-77', NULL, '56 LÊ LỢI');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-81', 'VPP: TRANG NHI', 'KH-506694-81', NULL, '97 CƯ XÁ TRẦN QUANG DiỆU , P 14 , Q 3,');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-72', 'CTY : TNHH TM - DV  ĐỖ GIA', '0306139672', NULL, '16/8 KỲ ĐỒNG , P9 , Q 3 - MST : 0306139672');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-160', 'CÔNG TY KIM NGÂN PHÁT', 'KH-506698-160', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-178', 'CTY : SA SINH', 'KH-506700-178', NULL, '56 nguyễn văn thủ , q thuận phước, đà nẵng');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-142', 'CTY CP VPP TRI LUAT', 'KH-506696-142', NULL, '63C-C XA PHU HOA -P 5 -Q 11');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-171', 'CTY ĐỨC HÂN PHÁT', 'KH-506699-171', NULL, '207/56 Hồ Học Lãm ,phường An lạc A ,quận Bình Tân TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-167', 'CTY NAM THÔNG BẢO', 'KH-506699-167', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-169', 'CTY PHẠM NGUYÊN', 'KH-506699-169', NULL, '613 TRẦN ĐẠI NGHĨA');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-133', 'CTY: CO PHAN TAP DOAN & KHOA HOC CONG NGHE', 'KH-506696-133', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-180', 'CTY: ĐĂNG PHONG', 'KH-506700-180', NULL, '16/4D AN BÌNH , Q5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-191', 'CTY: ĐÔNG HẢI ANH', 'KH-506704-191', NULL, '4/10 VƯỜN LÀI , P TÂN THÀNH , Q TÂN PHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-190', 'CTY: DŨNG NGUYÊN', 'KH-506703-190', NULL, '263/29A NGUYỄN TRẢI ,P NGUYỄN CƯ TRINH , Q1');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-146', 'CTY: HOA DĂNG', 'KH-506697-146', NULL, '130/8 LÊ DÌNH CẨN ,');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-181', 'CTY: HOÀNG NGUYỄN', 'KH-506700-181', NULL, '282 LÝ THƯỜNG KiỆT, P6 , TP CÀ MAU');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-182', 'CTY: JINPACK', 'KH-506700-182', NULL, '78/7A , QuỐC LỘ 1A, PTÂN THỚI NHẤT Q, 12');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-194', 'CTY: KHÔNG GIAN', 'KH-506704-194', NULL, '140 TRẦN QUANG KHẢI , P TÂN ĐỊNH Q 1');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-183', 'CTY: KIÊN THUỶ', 'KH-506700-183', NULL, '7D TRƯƠNG QuỐC DUNG , P8 , Q PHÚ NHUẬN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-192', 'CTY: LONDON', 'KH-506704-192', NULL, '94C CAO THẮNG, P04 ,Q3');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-154', 'CTY: LONG VÂN', 'KH-506697-154', NULL, '635 ĐIỆN BIÊN PHỦ , P1 , Q3');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-188', 'CTY: MAI ANH', 'KH-506701-188', NULL, '188/2A CAO ĐẠT, P1 Q, Q5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-179', 'CTY: MẠNH PHÁT', 'KH-506700-179', NULL, 'TẦNG 1.52 ĐÔNG DU , P BẾN NGHÉ, Q1');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-132', 'CTY: NHƯ HƯNG', 'KH-506696-132', NULL, '490/49/36 HƯƠNG LỘ 2 , P BÌNH TRỊ ĐÔNG . Q BÌNH TÂN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-185', 'CTY: PHẨM ViỆT', 'KH-506701-185', NULL, '42/1 NGUYỄN CỮU ĐÀM , P TÂN SƠN NHÌ , QTPHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506703-189', 'CTY: PHÚ THỊNH', 'KH-506701-189', NULL, 'C5/9A PHẠM HÙNG, HUYỆN BÌNH CHÁNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-141', 'CTY: THẢO KHANG', 'KH-506696-141', NULL, '30B TRẦN KHÁNH DƯ ,  PLEIKU, GIA LAI');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-187', 'CTY: THỊNH PHÁT ĐẠT', 'KH-506701-187', NULL, '220/4A HOÀNG HOA THÁM , P5 , Q BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-186', 'CTY: THÔNG MINH', 'KH-506701-186', NULL, '51 NGUYỄN ĐÌNH KIÊN , PTÂN TẠO A, QBÌNH TÂN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-193', 'CTY: THUƯỢNG ĐỈNH', 'KH-506704-193', NULL, '94C CAO THẮNG , 04 , Q3');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-177', 'CTY: THUỶ TIÊN', 'KH-506700-177', NULL, '98 PHAN VĂN TRỊ , P. 10 Q, GÒ VẤP');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-139', 'CTY: TNHH ĐĂNG KHOA BAN MÊ', 'KH-506696-139', NULL, '03 THĂNG LONG , BUÔN MA THUỘT');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-136', 'CTY: TNHH ĐÔNG THỊNH PHÁT', 'KH-506696-136', NULL, '002 LÔ E HỒNG LẠC .P10 . Q TÂN BÌNH . TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-134', 'CTY: TNHH IN THIẾT KẾ VÀ TM TOÀN CẦU', 'KH-506696-134', NULL, '32 NGUYỄN DU , QUI NHƠN . BÌNH ĐỊNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-143', 'CTY: TNHH MTV DV SONG MÃ', 'KH-506697-143', NULL, '375B1/8A AN PHÚ TÂY, Q BÌNH CHÁNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-138', 'CTY: TNHH MTV KHOA HỌC & CN IGC VIỆT NAM', 'KH-506696-138', NULL, '856 TRẦN HƯNG ĐẠO , P 7 , Q5, ĐC: GAO HÀNG 208 TÊN LỮA');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-151', 'CTY: TNHH MTV SX TM & DV NHẬT VŨ', 'KH-506697-151', NULL, '034 B NGUYỄN THÁI HỌC , P2, THỊ XÃ TÂY NINH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-153', 'CTY: TNHH TRẦN VINH', 'KH-506697-153', NULL, '225 BA CU , P4 , TP VŨNG TÀU');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-184', 'CTY: TRƯƠNG HOÀN MỸ', 'KH-506701-184', NULL, '159/1/17 TRẦN VĂN ĐANG, P11 ,Q3');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-148', 'CTY: VĂN HÙNG', 'KH-506697-148', NULL, '66 PHAN ĐÌNH PHÙNG , NHA TRANG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-135', 'CTY:CỔ PHẨN TM DV QUẢNG CÁO AN HƯNG', 'KH-506696-135', NULL, '211 NGÔ TẤT TỐ , P 22 , Q BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-173', 'CỬA HÀNG  NGỌC TUYỀN', 'KH-506699-173', NULL, '151 HẢI THƯỢNG LÃN ÔNG, P13, Q 5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-172', 'CỬA HÀNG MINH PHƯƠNG', 'KH-506699-172', NULL, '48 MAI XUÂN THƯỞNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-152', 'CỬA HÀNG VĂN HOÁ TỔNG HỢP NGỌC HÂN', 'KH-506697-152', NULL, 'K 4 LÝ THƯỜNG KIỆT , TP BUÔN MA THUỘT');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-147', 'DNTN : NAM THẠNH', 'KH-506697-147', NULL, '82 B , TRƯNG TRẮC - PHAN THIẾT , BÌNH THUẬN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-158', 'DNTN TM &DV VẠN KIM', 'KH-506698-158', NULL, '250/38A KP2, P.THỐNG NHẤT, BIÊN HÒA, ĐỒNG NAI');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-170', 'DTY TNHH TM DV PT QUỐC HOÀNG', 'KH-506699-170', NULL, '1/7 ĐƯỜNG DÂN CHỦ, P.TÂN THÀNH, Q.TÂN PHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-165', 'KIM KIẾN THÀNH', 'KH-506698-165', NULL, '178/33--ĐƯỜNG 3/2, P.HƯNG LỢI, Q.NINH KIỀU,TP.CẦN THƠ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-163', 'KIM THƯ', 'KH-506698-163', NULL, '34 NGÔ SĨ LIÊN -PHAN THIẾT-BÌNH THUẬN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-162', 'Long- bình tiên', 'KH-506698-162', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-137', 'NS : TÂN HƯNG ( LÀNG VĂN)', 'KH-506696-137', NULL, '3/44Đ LÊ ĐỨC THỌ , F15 , Q GÒ VẤP');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-176', 'PHOTO -DƯỜNG SỐ 1', 'KH-506705-216', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-166', 'THU THẢO', 'KH-506699-166', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-161', 'VĂN HÙNG - (NHA TRANG)', 'KH-506698-161', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-175', 'VPP 125 LÊ LỢI', 'KH-506700-175', NULL, '125 LÊ LỢI, P.BẾN THÀNH , Q 1');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-159', 'VPP 2-9', 'KH-506698-159', NULL, '….TRAN HUNG DAO,LONG XUYEN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-164', 'VPP.CẨM THÀNH', 'KH-506698-164', NULL, '122 HOÀNG VĂN THỤ- NHA TRANG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-144', 'VPP: CỦ CHI', 'KH-506697-144', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-157', 'VPP: HIỀN', 'KH-506698-157', NULL, '1023 NGUYỄN TRÃI , Q5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-149', 'VPP: HUƯƠNG', 'KH-506697-149', NULL, '133 PHÙNG HƯNG , Q5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-145', 'VPP: MỸ LIÊN', 'KH-506697-145', NULL, '214 HẢI THƯỢNG LÃN ÔNG , P14, Q5 , TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-155', 'VPP: TRẦN PHÚ', 'KH-506697-155', NULL, '39 TRẦN PHÚ , PLEIKU , GIA LAI');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-140', 'VPP: VĨ HÙNG', 'KH-506696-140', NULL, '205 HẢI THƯỢNG LÃN ÔNG , P13 , Q 5');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-131', 'VPP:4 GIA HÒA', 'KH-506696-131', NULL, 'ĐỒNG NAI');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-168', 'CÔNG TY GIẤY KHẢI HOÀNG', 'KH-506699-168', NULL, '33/8/19A PHẠM VĂN CHIÊU, P14, Q.GÒ VẤP');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-247', 'CTY  TNHH IN PAXA VIET NAM', 'KH-506707-247', NULL, '118/22 LÊ VĂN THỌ , P .11 , Q. GO VÂP');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-229', 'CTY : cổ phần tư vấn -sx - tm- dv -DƯỜNG ViỆT', 'KH-506705-229', NULL, '27 đường số 6, KDC thăng long, P. bình trị đông B , Q. bình tân');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-241', 'CTY : KIM HOÀN VŨ', 'KH-506707-241', NULL, 'ĐC ;100 ĐƯỜNG A4 P 12, Q TÂN BÌNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-222', 'CTY : KIM HOÀN VỦ', 'KH-506705-222', NULL, 'ĐC: 100 ĐƯỜNG A4 , P 12, Q TÂN BÌNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-239', 'CTY : PHƯƠNG NGUYÊN', 'KH-506707-239', NULL, '137/30 GÒ DẦU , P TÂN QUÝ , Q TÂN PHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-221', 'CTY : THANG LOI SAI GO', 'KH-506705-221', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-238', 'CTY : THIÊN PHÚC PHÚ QUỐC', 'KH-506706-238', NULL, 'Tổ 4, ấp cây thông ngoài,xã cửa dương, thành phố phú quốc, t kiên giang.');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-228', 'CTY : THU TRANG', 'KH-506705-228', NULL, '45 ĐƯỜNG D1, F .TÂN HƯNG , Q7');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-231', 'CTY : TNHH SẢN XUẤT TM DV XNK  Giang Đông', 'KH-506706-231', NULL, '108 Trần Đình Xu , P nguyễn cư trinh ,Q 1 , tphcm');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-227', 'CTY : TNHH SX - TM MINH KHA', 'KH-506705-227', NULL, '110/43/51 BÀ HOM , P 13 , Q. 6 , TP.HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-232', 'CTY ĐÔNG THỊNH PHÁT', 'KH-506706-232', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-234', 'CTY TÂN PHƯƠNG HƯNG', 'KH-506706-236', NULL, 'số 22 đường XL 13. tổ 3, ấp hóa nhậ,.xã tân vĩnh hiệp, bình dương');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-244', 'cty thhh 01 thành viên hong hyun yuma', 'KH-506707-244', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-245', 'CTY TNHH - MTV NAM ĐÔNG', 'KH-506707-245', NULL, '24 phú thuận , phường phú thuận quận 7 , tp hcm');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-217', 'CTY TNHH ĐẦU TƯ VÀ PHÁT TRIỄN LÊ PHONG', 'KH-506705-217', NULL, '26/11 Khu Phố Tây A, P Đông Hòa, Thành Phố Dĩ An, Tỉnh Bình Dương');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-254', 'cty tnhh dv thiết kế in ấn Ngọc Tâm', 'KH-506708-254', NULL, '170 lê đức thọ, p 6.q Gò Vấp TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-211', 'CTY TNHH HƯNG GIA LONG', 'KH-506705-211', NULL, '893B PHẠM VĂN THUẬN ,KP3- TAM HiỆP , BIÊN HOÀ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-237', 'cty tnhh tam vinh phat', 'KH-506706-237', NULL, '58 phùng tá ch');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-243', 'cty tnhh thuong mai - dich vu đinh thư', 'KH-506707-243', NULL, '239 vo công tồn kp3, tt bến lức , huyện bến lức , tỉnh long an');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-246', 'CTY tnhh thuương mại dịch vụ văn phòng phẩm fast', 'KH-506707-246', NULL, '600/2/18 đưởng hồng bàng , P. 16 , Q.11 , TP. HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-248', 'Cty TNHH TK MT Và Tin Học Huynh Đệ Anh Khoa', 'KH-506707-248', NULL, '409/16 Nguyễn Trọng Tuyển, P2, QTân Bình, tp . Hcm');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-253', 'CTY TNHH VPP HÙNG PHÁT', 'KH-506707-253', NULL, '14L phạm văn chí , P.7 , Q. 6, TP.HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-230', 'CTY: AN PHÁT THỊNH', 'KH-506706-230', NULL, '269 PHAN ANH , P. BÌNH TRỊ ĐÔNG , Q. BÌNH TÂN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-201', 'CTY: BẮC MỸ', 'KH-506704-201', NULL, '104 CAO THẮNG , P 4 , 3');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-202', 'CTY: CHÂU LÊ', 'KH-506704-202', NULL, 'C5/9A PHẠM HÙNG, HUYỆN BÌNH CHÁNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-195', 'CTY: CHÍ TuẤN ĐẠT', 'KH-506704-195', NULL, '51 NGUYỄN ĐÌNH KIÊN , PTÂN TẠO A, QBÌNH TÂN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-223', 'CTY: ĐẠI LỢI PHÁT', 'KH-506705-223', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-213', 'CTY: ĐỨC LONG', 'KH-506705-213', NULL, '24 DƯỜNG 26 , KHO PHỐ 7 , P , LINH ĐÔNG , Q THỦ ĐỨC');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-219', 'CTY: DUNG NHI', 'KH-506705-219', NULL, '1.21 LÔ G. KHU MiẾU NỔI. VŨ HUY TuẤN . P.3 Q. BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-200', 'CTY: GIAO TiẾP QuỐC TẾ', 'KH-506704-200', NULL, '104 CAO THẮNG , P 4 , 3');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-199', 'CTY: IN DAKLAK', 'KH-506704-199', NULL, '45 NGUYỄN TẤT THÀNH , P TÂN AN ,TP BUÔN MA THUỘC');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-204', 'CTY: KHANG TuẤN', 'KH-506704-204', NULL, '11/1 NGUYỄN KHOÁI , P1 , Q4 ,TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-198', 'CTY: NGUYỄN THÀNH', 'KH-506705-214', NULL, '357 TÔN ĐẢNG , P 15, Q 4');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-203', 'CTY: PHÚC THỊNH', 'KH-506704-203', NULL, '292/33/5 BÌNH LỢI , P13 ,Q BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-210', 'CTY: PHƯỚC SƠN PHÁT', 'KH-506704-210', NULL, '450/28K DƯƠNG BÁ TRẠC, P 1 , Q8');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-207', 'CTY: QuỐC TOÀN PHÁT', 'KH-506704-207', NULL, '108 LÊ CÔNG PHÉP , P. AN LẠC A , Q .BÌNH TÂN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-197', 'CTY: THÀNH ĐẠI PHÁT', 'KH-506704-197', NULL, '98/16/3 ĐƯỜNG TÂY THẠNH ,PTÂY THẠNH , QTPHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-215', 'CTY: THANH VÂN', 'KH-506705-215', NULL, '47/10 ĐƯỜNG NGUYỄN VĂN SĂNG , P.TSN, Q TPHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-233', 'CTY: THHH HOÀN LINH KHÔI', 'KH-506706-233', NULL, '33 TRƯƠNG CÔNG ĐỊNH , P. 14 , Q .TÂN BÌNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-196', 'CTY: THIÊN ÂN', 'KH-506704-196', NULL, '315 LÝ THÁI TỔ ,P9 , Q10');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-212', 'CTY: THUẬN GIAO', 'KH-506705-212', NULL, '355/26 NGUYỄN TRỌNG TUYỂN , P1 , Q TÂN BÌNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-209', 'CTY: THUẬN PHÁT', 'KH-506704-209', NULL, '170 BÀ HẠT , P9 , Q10');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-225', 'CTY: TNHH IN BAO BI ANPHA', 'KH-506705-225', NULL, '215/6 NGUYỄN VĂN LUÔNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-242', 'CTY: TNHH MTV- ĐỨC HÂN PHÁT', 'KH-506707-242', NULL, '115/20/AB LÊ TRỌNG TẤN , P . SƠN KỲ , Q. TÂN PHÚ');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-206', 'CTY: TNHH SX-Giấy Văn Phòng Phẩm Hoa Sen', 'KH-506704-206', NULL, '160/78 Phan Huy ích, Phường 12, Quận Gò Vấp ,TP hồ chí minh,');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-224', 'CTY: TNHH SX TM DV LỘC GIA PHÁT', 'KH-506705-224', NULL, 'M5 CƯ XÁ PHÚ LÂM C, ĐỖ NĂNG TẾ , P. A LẠC A , Q. BÌNH TÂN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-220', 'CTY: TNHH TM DV VPP QUANG LÂM', 'KH-506705-220', NULL, 'SỐ7 , DƯƠNG ĐÌNH NGHỆ , P.8 , Q.11 , TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-250', 'CY TNHH DỊCH VỤ IN VĂN HOÁ', 'KH-506707-250', NULL, '85/6/2  cách mạng tháng tám , P. 12, Q. 10 , TP. HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-205', 'HƯNG GIA LONG', 'KH-506704-205', NULL, '9/1 A PHAN BỘI CHÂU , P2 , BÌNH THẠNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-226', 'PHOTO : HÀ HUY', 'KH-506705-226', NULL, '596 KINH DƯƠNG VƯƠNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-251', 'VPP MiỀN ĐÔNG', 'KH-506707-251', NULL, '109 Ỷ LAN , P PHÚ THẠNH, THÀNH PHỐ HỒ CHÍ MINH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-218', 'VPP SÀI GÒN', 'KH-506705-218', NULL, '77/6 Khu Phố 4 ,Đường Trần Xuân Soạn , P Tân Hưng Q7, tp  .hcm');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-240', 'VPP: THU HƯƠNG', 'KH-506707-240', NULL, '521 KINH DƯƠNG VƯƠNG');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-208', 'VPP: TOÀN PHÁT', 'KH-506704-208', NULL, 'HỒ DỨC AN - GIA LAI');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-252', 'BÁN LẺ', 'KH-506707-252', NULL, NULL);
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-106', 'ANH THỌ', 'KH-506695-106', NULL, '27 CAO VĂN LẦU');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-27', 'C TY  CỔ PHẦN 365', 'KH-506694-27', NULL, '1A NHIÊU TỨ PHÚ NHUẬN');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-174', 'CHÂU PHONG', 'KH-506700-174', NULL, '413 A CỘNG HÒA');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-156', 'CƠ SỞ :  TRUNG HIẾU', 'KH-506698-156', NULL, '357 D1 , ĐƯỜNG NGUYỄN VĂN TƯ , P7 , THỊ XÃ BẾN TRE');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-249', 'Công Ty TNHH Sản Xuất In Ấn Bao Bì LUGIFA', 'KH-506707-249', NULL, '35 Đường Số 1- KDC Hai Thành.Phường Tân Tạo,TP Hồ Chí Minh');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-256', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ GiẤY PHƯƠNG NAM PHÁT', 'KH-506708-256', NULL, 'Số 42 lô A1,khu phố Tân Triều,thành phố Đồng Nai ,Việt nam');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-258', 'CÔNG TY TNHH TM DV HƯNG GIA LONG', 'KH-506708-258', NULL, '79/4 Đường số 4, Phường Bình Hưng Hòa, TP Hồ Chí Minh, Việt Nam.');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-259', 'Công ty TNHH văn phòng phẩm THẢO NGUYÊN', 'KH-506708-259', NULL, '18 PHÓ CƠ ĐiỀU');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-257', 'CTY LÂM SONG MINH', 'KH-506708-257', NULL, '193/18 Nam Kỳ Khởi Nghĩa');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-29', 'CTY TNHH MTV TM DV XNK HuỲNH GIA', 'KH-506694-29', NULL, '58 ĐƯỜNG SỐ 5 XÃ BÌNH HƯNG - BÌNH CHÁNH');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-255', 'CTY TNHH TM & XNK TRẦN NGUYỄN TNECHO', 'KH-506708-255', NULL, '44 đường 8B ,KDC Đại Phúc,Green Villas Phạm Hùng xã Bình Hưng TP HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-118', 'CTY:  TNHH MTV - SX - TM TÂN VY PHÁT', 'KH-506695-118', NULL, '1/6 KHU PHỐ 4 . PHAN VĂN HỚN .P TÂN THỚI NHẤT Q . 12');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-235', 'CTY: CỔ PHẦN GIẤY AN PHÁT THỊNH', 'KH-506706-235', NULL, '51/3 Đường Số 18 B,Khu Phố 1, Phường Bình Hưng Hòa A, Quận Bình Tân, Tp.hcm');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-150', 'CTY: TNHH ĐẦU TƯ THƯƠNG MẠI DỊCH VỤ BẢO ANH', 'KH-506697-150', NULL, 'PHÒNG 1901, LẦU 19, 37 TÔN ĐỨC THẮNG , P BẾN NGHÉ, Q1 HCM');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-113', 'NHÀ XUẤT BẢN- ĐẠI HỌC CÔNG NGHIÊP', 'KH-506695-113', NULL, 'SỐ 12 . NGUYỄN VĂN BẢO .4 Q. GÒ VẤP');
INSERT OR REPLACE INTO customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-47', 'VĂN PHÒNG PHẨM . QUA MẠNG', 'KH-506694-47', NULL, '343/16 SƯ VẠN HẠNH P .12 Q .10');
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-15', 'CÔNG TY TNHH BÁCH HOÁ TỔNG HỢP TRẦN SANG', 'MST-745083-15', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-2', 'CÔNG TY TNHH BIOMASS VIỆT NAM', 'MST-745083-2', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-3', 'CÔNG TY TNHH GIẤY VĂN PHÒNG PHẨM TUẤN HƯNG', 'MST-745083-3', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-4', 'CÔNG TY TNHH KINH DOANH TỔNG HỢP MẠNH HƯNG', 'MST-745083-4', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-5', 'CÔNG TY TNHH MỘT THÀNH VIÊN HUY MINH QUANG', 'MST-745083-5', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-16', 'CÔNG TY TNHH MỘT THÀNH VIÊN SẢN XUẤT THƯƠNG MẠI TÂN VY PHÁT', 'MST-745083-16', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-17', 'CÔNG TY TNHH MTV SX TM DV THÀNH LỘC', 'MST-745083-17', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-18', 'CÔNG TY TNHH NAM VIỆT 258', 'MST-745083-18', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-19', 'CÔNG TY TNHH SẢN XUẤT GIẤY VĂN PHÒNG PHẨM HOA SEN', 'MST-745083-19', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-6', 'CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI KIM HOÀN VŨ', 'MST-745083-6', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-7', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NGÂN HIỂN', 'MST-745083-7', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-8', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NGUYÊN BẮC', 'MST-745083-8', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-9', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ PHÁT TRIỂN PHAN LÂM', 'MST-745083-9', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-10', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ SẢN XUẤT GIẤY KHẢI HOÀN', 'MST-745083-10', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-11', 'CÔNG TY TNHH THƯƠNG MẠI GIẤY VÀ VĂN PHÒNG PHẨM MINH QUÂN', 'MST-745083-11', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-20', 'CÔNG TY TNHH TMDV PHƯỚC HẬU', 'MST-745083-20', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-12', 'CÔNG TY TNHH TƯ VẤN THIẾT KẾ VÀ IN ẤN PIXEL', 'MST-745083-12', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-13', 'CÔNG TY TNHH XUẤT NHẬP KHẨU GIẤY TÂN SANH', 'MST-745083-13', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-14', 'HONGKONG GAINWELL INTERNATIONAL TRADING LIMITED', 'MST-745083-14', NULL, NULL);
INSERT OR REPLACE INTO suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-21', 'MONURS CO., LIMITED', 'MST-745083-21', NULL, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-21', 'NOTE33SN', 'NOTE 3x3 SỌC NGANG', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 3180.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-22', 'NOTE33TR-4M', 'NOTE 3x3 TRỘN (XL+XD+V+H)', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 2352.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-23', 'NOTE33V', 'NOTE 3x3 V', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 8433.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-35', 'NOTE33V-DQ', 'NOTE 3x3 V-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-24', 'NOTE33XD', 'NOTE 3x3 XD', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 3000.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-36', 'NOTE33XD-DQ', 'NOTE 3x3 XD-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 492.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-25', 'NOTE33XL', 'NOTE 3x3 XL', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 2208.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-37', 'NOTE33XL-DQ', 'NOTE 3x3 XL-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 108.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-26', 'NOTE34-4M-4L', 'NOTE 3x4 4M-4L', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 4224.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-27', 'NOTE34-5M-5L', 'NOTE 3x4 5M-5L', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 1392.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-28', 'NOTE34H', 'NOTE 3x4 HỒNG', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 408.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-29', 'NOTE34V', 'NOTE 3x4 V', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 4752.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-38', 'NOTE34V-DQ', 'NOTE 3x4 V-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 648.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-30', 'NOTE34XD', 'NOTE 3x4 XD', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 2400.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-39', 'NOTE34XD-DQ', 'NOTE 3x4 XD-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 320.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-31', 'NOTE34XL', 'NOTE 3x4 XL', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 444.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-32', 'NOTE35V', 'NOTE 3x5 V', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-33', 'NOTE-MT-5M', 'NOTE MŨI TÊN 5M NHỰA', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 48960.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-50', 'BIADOUBLEXD', 'BÌA DOUBLE A4 XD', 'cat-1790945794265', 'uom-1790945686281', NULL, 1.0000, NULL, 36.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-52', 'BIAKIENGA4', 'BÌA KIẾNG A4', 'cat-1790945794265', 'uom-1790945671855', NULL, 1.0000, NULL, 300.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-47', 'BIALA20', 'Bìa Lá 20', 'cat-1790945794265', 'uom-1790945686281', NULL, 1.0000, NULL, 288.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-48', 'BIALA40', 'Bìa Lá 40', 'cat-1790945794265', 'uom-1790945686281', NULL, 1.0000, NULL, 324.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-49', 'BIALA60', 'Bìa Lá 60', 'cat-1790945794265', 'uom-1790945686281', NULL, 1.0000, NULL, 29.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-43', 'BIALO400', 'Bìa Lỗ ĐL400', 'cat-1790945775913', 'uom-1790945671855', NULL, 1.0000, NULL, 13290.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-44', 'BIALO500', 'Bìa Lỗ ĐL500', 'cat-1790945775913', 'uom-1790945671855', NULL, 1.0000, NULL, 650.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-45', 'BIALO600', 'Bìa Lỗ ĐL600', 'cat-1790945775913', 'uom-1790945671855', NULL, 1.0000, NULL, 80.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-54', 'BIANUTF4', 'Bìa nút F4', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 7680.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-55', 'BIANUTF4140', 'Bìa nút F4-140', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-56', 'BIANUTF4150', 'Bìa nút F4-150', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-51', 'BIATHAIXANHA4', 'BÌA THÁI XANH A4', 'cat-1790945794265', 'uom-1790945671855', NULL, 1.0000, NULL, 50.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-58', 'DOULBE-A4-70', 'Giấy DoubleA-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-3', 'KEPBUOM19', 'Kẹp bướm 19mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 300.0000, NULL, 40438.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-4', 'KEPBUOM25', 'Kẹp bướm 25mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 240.0000, NULL, 23004.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-5', 'KEPBUOM32', 'Kẹp bướm 32mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 120.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-6', 'KEPBUOM41', 'Kẹp bướm 41mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 120.0000, NULL, 13634.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-7', 'KEPBUOM51', 'Kẹp bướm 51mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 60.0000, NULL, 6660.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-8', 'KEPBUOM-M15', 'Kẹp bướm màu 15mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 1528.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-9', 'KEPBUOM-M19', 'Kẹp bướm màu 19mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 1216.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-10', 'KEPBUOM-M25', 'Kẹp bướm màu 25mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 538.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-11', 'KEPBUOM-M32', 'Kẹp bướm màu 32mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 720.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-12', 'KEPBUOM-M41', 'Kẹp bướm màu 41mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 480.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-13', 'KEPBUOM-M51', 'Kẹp bướm màu 51mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 550.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-42', 'YIDU-A3-80', 'Nhựa ép YIDU A3-80', 'cat-1790945762757', 'uom-1790945671855', NULL, 1.0000, NULL, 110.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-41', 'YIDU-A4-80', 'Nhựa ép YIDU A4-80', 'cat-1790945762757', 'uom-1790945671855', NULL, 1.0000, NULL, 200.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-40', 'YIDU-A5-80', 'Nhựa ép YIDU A5-80', 'cat-1790945762757', 'uom-1790945671855', NULL, 1.0000, NULL, 120.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-14', 'NOTE32H', 'NOTE 3x2 HỒNG', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 840.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-15', 'NOTE32V', 'NOTE 3x2 V', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 13440.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-16', 'NOTE32XD', 'NOTE 3x2 XD', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 8400.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-17', 'NOTE32XL', 'NOTE 3x2 XL', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 312.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-19', 'NOTE33-5M-5L', 'NOTE 3x3 5M-5L', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 3744.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-34', 'NOTE33H-DQ', 'NOTE 3x3 H-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 900.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-20', 'NOTE33H', 'NOTE 3x3 HỒNG', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 1668.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-53', 'BIANUTA4', 'Bìa nút A4', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 4800.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-46', 'BIALO700', 'Bìa Lỗ ĐL700', 'cat-1790945775913', 'uom-1790945671855', NULL, 1.0000, NULL, 1008.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-57', 'BIANUTF4682', 'Bìa nút F4-682', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-59', 'DOULBE-A3-70', 'Giấy DoubleA-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-61', 'DOULBE-A3-80', 'Giấy DoubleA-A3-80gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-60', 'DOULBE-A4-80', 'Giấy DoubleA-A4-80gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-62', 'DOULBE-A5-70', 'Giấy DoubleA-A5-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-76', 'GOLDEN-A4-70', 'Giấy GOLDEN-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-66', 'IDEA-A3-70', 'Giấy Idea-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-67', 'IDEA-A3-80', 'Giấy Idea-A3-80gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-64', 'IDEA-A4-70', 'Giấy Idea-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-65', 'IDEA-A4-80', 'Giấy Idea-A4-80gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-75', 'IKCOPY-A4-70', 'Giấy IKCOPY-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-72', 'OFFICE-A3-70', 'Giấy OFFICE-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-71', 'OFFICE-A4-70', 'Giấy OFFICE-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-70', 'OFFICE-A5-70', 'Giấy OFFICE-A5-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-69', 'QUALITY-A3-70', 'Giấy QUALITY-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-68', 'QUALITY-A4-70', 'Giấy QUALITY-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-74', 'SMARTIST-A3-70', 'Giấy SMARTIST-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-73', 'SMARTIST-A4-70', 'Giấy SMARTIST-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-63', 'SUPREME-A4-70', 'Giấy Supreme-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-2', 'KEPBUOM15', 'Kẹp bướm 15mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 360.0000, NULL, 29832.0000, 0, NULL);
INSERT OR REPLACE INTO products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-18', 'NOTE33-4MT', 'NOTE 3x3 4M-THẺ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 16080.0000, 0, NULL);
INSERT OR REPLACE INTO stock_transactions (id, type, date, warehouse_id, supplier_id, customer_id, reference_no, vat_rate, vat_type, subtotal, vat_amount, total_amount, is_confirmed, is_reversed, reversal_reference, notes, prepaid_amount, prepaid_method, due_date, fiscal_year, is_carry_forward, linked_closing_year) VALUES ('tx-open-2026-wh-1790939712257', 'OPENING', '2026-01-01', 'wh-1790939712257', NULL, NULL, 'SDDK-2026-WH1790939712257', 0.00, 'GROUPED', 0, 0, 0, 1, 0, NULL, 'Tự động ghi nhận tồn đầu kỳ khi Import Excel Hàng hóa', 0, NULL, NULL, 2026, 0, NULL);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-37', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-41', 200.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-38', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-42', 110.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-39', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-43', 13290.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-40', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-44', 650.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-41', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-45', 80.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-42', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-46', 1008.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-43', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-47', 288.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-44', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-48', 324.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-45', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-49', 29.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-46', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-50', 36.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-47', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-51', 50.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-48', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-52', 300.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-49', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-53', 4800.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-50', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-54', 7680.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-1', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-2', 29832.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-7', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-9', 1216.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-2', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-3', 40438.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-3', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-4', 23004.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-4', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-6', 13634.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-5', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-7', 6660.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-6', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-8', 1528.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-8', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-10', 538.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-9', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-11', 720.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-34', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-38', 648.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-10', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-12', 480.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-11', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-13', 550.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-12', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-14', 840.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-13', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-15', 13440.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-14', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-16', 8400.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-15', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-17', 312.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-16', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-18', 16080.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-17', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-19', 3744.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-18', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-20', 1668.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-19', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-21', 3180.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-20', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-22', 2352.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-21', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-23', 8433.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-22', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-24', 3000.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-23', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-25', 2208.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-24', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-26', 4224.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-25', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-27', 1392.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-26', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-28', 408.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-27', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-29', 4752.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-28', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-30', 2400.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-29', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-31', 444.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-30', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-33', 48960.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-32', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-36', 492.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-33', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-37', 108.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-31', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-34', 900.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-35', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-39', 320.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-36', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-40', 120.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-18', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-19', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-20', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-21', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-71', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-72', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-73', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-74', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-34', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-35', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-36', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-37', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-38', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-25', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-22', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-61', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-62', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-26', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-27', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-28', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-29', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-30', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-63', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-64', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-65', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-66', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-67', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-68', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-69', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-70', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-48', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-49', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-2', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-3', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-4', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-5', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-6', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-7', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-8', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-23', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-24', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-75', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-76', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-32', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-33', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-9', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-10', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-31', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-50', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-51', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-52', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-53', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-54', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-55', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-56', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-57', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-58', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-59', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-60', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-39', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-40', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-41', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-42', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-43', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-44', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-45', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-46', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-47', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-11', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-12', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-13', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-14', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-15', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-16', 1, 0, NULL, 0, NULL, NULL);
INSERT OR REPLACE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-17', 1, 0, NULL, 0, NULL, NULL);

-- Đồng bộ tồn kho tức thì vào bảng inventory_stock cho Kho HCM

INSERT OR REPLACE INTO inventory_stock (warehouse_id, product_id, quantity, updated_at)
SELECT 
  'wh-1790939712257',
  id,
  current_qty,
  datetime('now')
FROM products;


-- Cập nhật erp_collections JSON Cache

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'products', json_group_array(json_object(
  'id', id, 'sku', sku, 'name', name, 'categoryId', category_id,
  'uomId', uom_id, 'altUomId', alt_uom_id, 'uomConversionRate', uom_conversion_rate,
  'currentQty', current_qty, 'averageCost', average_cost, 'description', coalesce(description, '')
)), '[]', datetime('now') FROM products;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'customers', json_group_array(json_object(
  'id', id, 'name', name, 'taxCode', coalesce(tax_code, ''),
  'phone', coalesce(phone, ''), 'address', coalesce(address, '')
)), '[]', datetime('now') FROM customers;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'suppliers', json_group_array(json_object(
  'id', id, 'name', name, 'taxCode', coalesce(tax_code, ''),
  'phone', coalesce(phone, ''), 'address', coalesce(address, '')
)), '[]', datetime('now') FROM suppliers;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'categories', json_group_array(json_object(
  'id', id, 'name', name, 'description', coalesce(description, '')
)), '[]', datetime('now') FROM categories;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'uoms', json_group_array(json_object(
  'id', id, 'name', name
)), '[]', datetime('now') FROM uoms;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'warehouses', json_group_array(json_object(
  'id', id, 'name', name, 'location', coalesce(location, '')
)), '[]', datetime('now') FROM warehouses;

-- =========================================================================
-- DỮ LIỆU WEBSHOP THẬT (Catalog thật thay thế mockdata)
-- =========================================================================
-- Danh mục nhóm hàng & ĐVT
INSERT OR IGNORE INTO categories (id, name, description) VALUES
('cat-1', 'Điện thoại & Tablet', 'Các dòng điện thoại thông minh, máy tính bảng'),
('cat-2', 'Máy tính & Laptop', 'Máy tính để bàn, laptop văn phòng & gaming'),
('cat-3', 'Phụ kiện & Thiết bị', 'Cáp sạc, tai nghe, pin dự phòng, linh kiện');
INSERT OR IGNORE INTO uoms (id, name) VALUES ('uom-1', 'Cái');
INSERT OR IGNORE INTO warehouses (id, name, location) VALUES ('wh-1', 'Kho Chính Quận 1', 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. HCM');

-- Sản phẩm (hàng thật: điện thoại, laptop, phụ kiện chính hãng)
INSERT OR IGNORE INTO products (id, sku, name, category_id, uom_id, description, current_qty, average_cost) VALUES
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
('prod-dm-018', 'CLL15PM9H', 'Cường lực kính iPhone 15 Pro Max 9D 2 mặt', 'cat-3', 'uom-1', 'Kính cường lực 9D 2 mặt, chống vân tay, chống sốc rơi, trong suốt 99%.', 75, 150000);

-- Tồn kho theo kho wh-1
INSERT OR IGNORE INTO inventory_stock (warehouse_id, product_id, quantity) VALUES
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
('wh-1', 'prod-dm-018', 75);

-- Cấu hình bán trên Webshop (giá lẻ VNĐ, khuyến mãi, badge)
INSERT OR IGNORE INTO webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES
('prod-dm-001', 1, 24790000, 23790000, 1, 'HOT', 'Chip A17 Pro, camera 48MP, Titan thiết kế, hàng chính hãng bảo hành 12 tháng.'),
('prod-dm-002', 1, 20490000, NULL, 1, 'BÁN CHẠY', 'Chip A17 Pro, khung Titan, camera Pro 48MP, bảo hành chính hãng 12 tháng.'),
('prod-dm-003', 1, 22990000, 21990000, 1, 'HOT', 'Snapdragon 8 Gen 3, S Pen tích hợp, camera 200MP, màn hình QHD+ 6.8 inch.'),
('prod-dm-004', 1, 18490000, NULL, 1, 'MỚI', 'Màn hình gập FlexWindow 3.4 inch, Snapdragon 8 Gen 3, chống nước IP48.'),
('prod-dm-005', 1, 15990000, NULL, 0, NULL, 'Chip M3, màn hình Liquid Retina, hỗ trợ Apple Pencil Pro, mỏng nhẹ 462g.'),
('prod-dm-006', 1, 26990000, 25990000, 1, 'BÁN CHẠY', 'Chip Apple M3 8 nhân, RAM 8GB, SSD 256GB, mỏng 1.13cm, pin 18 tiếng.'),
('prod-dm-007', 1, 43990000, NULL, 0, NULL, 'Chip M3 Pro 11 nhân CPU, màn hình Liquid Retina XDR, pin lên đến 22 tiếng.'),
('prod-dm-008', 1, 13490000, NULL, 0, NULL, 'Laptop doanh nhân 14 inch FHD, Intel i5 thế hệ 13, bảo hành 12 tháng.'),
('prod-dm-009', 1, 28990000, 27990000, 1, 'HOT', 'i7-13650HX, RAM 16GB DDR5, SSD 512GB, RTX 4060 8GB, màn hình 165Hz.'),
('prod-dm-010', 1, 13990000, NULL, 0, NULL, 'Laptop văn phòng 14 inch, bàn phím ThinkPad nổi tiếng, bảo hành 12 tháng.'),
('prod-dm-011', 1, 4290000, 3990000, 1, 'BÁN CHẠY', 'Chống ồn chủ động Adaptive Audio, case sạc USB-C, loa tự vệ chống nước.'),
('prod-dm-012', 1, 650000, NULL, 0, NULL, 'Sạc nhanh hai chiều 22.5W, sạc được 4-5 lần cho smartphone, đèn LED báo.'),
('prod-dm-013', 1, 165000, NULL, 0, NULL, 'Cáp dữ liệu & sạc nhanh PD 100W, lõi đồng nguyên chất, chịu lực 10000 lần gấp.'),
('prod-dm-014', 1, 590000, 549000, 1, 'GIẢM GIÁ', 'Chip GaN nhỏ gọn, sạc nhanh MacBook/iPhone/Android, 3 cổng ra đồng thời.'),
('prod-dm-015', 1, 1290000, NULL, 0, NULL, 'Công tắc cơ nhạy, kết nối BT/2.4GHz/USB-C, pin 4000mAh, RGB 16.8 triệu màu.'),
('prod-dm-016', 1, 790000, NULL, 0, NULL, 'Thiết kế công thái học giảm đau cổ tay, 4000DPI, kết nối 2.4GHz/Bluetooth.'),
('prod-dm-017', 1, 249000, NULL, 0, NULL, 'Silicon mềm cao cấp, khung viền chống sốc, hỗ trợ sạc MagSafe chính hãng.'),
('prod-dm-018', 1, 299000, NULL, 0, NULL, 'Kính cường lực 9D 2 mặt, chống vân tay, chống sốc rơi, trong suốt 99%.');
