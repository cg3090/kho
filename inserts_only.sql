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
INSERT INTO sequence_configs (type, prefix, digits, current_number) VALUES
('PN', 'PN', 4, 1),
('PX', 'PX', 4, 1),
('BG', 'BG', 4, 1),
('PT', 'PT', 4, 1),
('PC', 'PC', 4, 1)
ON CONFLICT (type) DO NOTHING;
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
INSERT INTO categories (id, name, description) VALUES
('cat-1', 'Điện thoại & Tablet', 'Các dòng điện thoại thông minh, máy tính bảng'),
('cat-2', 'Máy tính & Laptop', 'Máy tính để bàn, laptop văn phòng & gaming'),
('cat-3', 'Phụ kiện & Thiết bị', 'Cáp sạc, tai nghe, pin dự phòng, linh kiện')
ON CONFLICT (id) DO NOTHING;
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
