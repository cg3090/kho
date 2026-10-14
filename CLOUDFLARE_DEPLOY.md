# HƯỚNG DẪN DEPLOY TOÀN DIỆN DỰ ÁN FULLSTACK LÊN CLOUDFLARE
## (HONO + REACT + CLOUDFLARE D1 + DRIZZLE ORM)

Dự án Hệ thống Quản trị Kho Thông minh (WMS) & Kế toán Doanh nghiệp (TT 133/200) kết hợp Webshop trực tuyến đã được cấu trúc hoàn toàn theo kiến trúc Fullstack hiện đại nhất trên Cloudflare Edge:
- **Framework API**: **Hono** (Tối ưu hóa siêu nhẹ, thời gian phản hồi sub-millisecond trên Edge).
- **Frontend SPA**: **React 19 + Vite + Tailwind CSS**.
- **Cơ sở dữ liệu**: **Cloudflare D1** (Serverless SQL Database phân tán toàn cầu).
- **ORM**: **Drizzle ORM** (Type-safe, hỗ trợ native D1 và migration tự động).
- **Chuẩn tiền tệ**: **Chuẩn số nguyên VNĐ (Integer mode)** triệt tiêu 100% lỗi sai số làm tròn số thực.
- **Bảo vệ dữ liệu**: **Database Transaction (`db.transaction`)** cho toàn bộ giao dịch Kho, Công nợ, Kế toán kép và Đơn hàng Webshop.

---

## 1. TRIỂN KHAI LÊN CLOUDFLARE CHỈ VỚI 1 CÂU LỆNH

### Bước chuẩn bị duy nhất (Lần đầu tiên):
Nếu bạn đang chạy trên máy tính cá nhân (Windows / macOS):
```bash
# Cài đặt đầy đủ dependencies (bao gồm Wrangler)
npm install

# 1. Đăng nhập tài khoản Cloudflare
npx wrangler login

# 2. Tạo database D1 (nếu chưa có)
npx wrangler d1 create khobd
```
Lệnh trên sẽ trả về `database_id` (ví dụ: `4b2a88e1-9533-4bb0-8042-9908cf441e9e`). Hãy dán ID này vào trường `database_id` trong file `wrangler.jsonc` (hoặc `wrangler.toml`).

---

### CÂU LỆNH DEPLOY 1 BƯỚC DUY NHẤT:
```bash
npm run deploy:cloudflare
```
> **Cơ chế Tự Động Build Chuẩn Cloudflare:**
> Cloudflare Wrangler (`wrangler.toml` & `wrangler.jsonc`) được cấu hình `[build] command = "npm run build"`.
> Khi bạn chạy `npm run deploy:cloudflare`, Wrangler tự động gọi `[custom build] Running: npm run build`, biên dịch mã nguồn React + Vite thành thư mục `./dist`, kiểm tra binding và tải lên Cloudflare Edge hoàn toàn tự động.

Nếu bạn muốn deploy đồng thời áp dụng luôn Migration D1 mới nhất lên remote:
```bash
npm run deploy:full
```

---

## 2. KIẾN TRÚC & TIÊU CHUẨN KỸ THUẬT

### 2.1. Chuẩn Số Nguyên VNĐ Trên Cloudflare D1
Tiền tệ Việt Nam Đồng (VNĐ) không có đơn vị lẻ như cent hay hào. Việc lưu trữ bằng số thực (`FLOAT`/`REAL`) trong SQLite sẽ gây ra sai số làm tròn (`0.1 + 0.2 = 0.30000000000000004`).
Hệ thống sử dụng Drizzle ORM định nghĩa toàn bộ cột tiền tệ:
```typescript
integer('total_amount', { mode: 'number' }).notNull().default(0)
integer('unit_price', { mode: 'number' }).notNull().default(0)
integer('subtotal', { mode: 'number' }).notNull().default(0)
integer('vat_amount', { mode: 'number' }).notNull().default(0)
integer('average_cost', { mode: 'number' }).notNull().default(0)
```
Cùng helper `toVndInteger()` tự động làm tròn chuẩn `Math.round(val)`, đảm bảo báo cáo tài chính và công nợ chính xác đến từng đồng.

### 2.2. Database Transaction Bảo Vệ Kho & Kế Toán
Mỗi khi phát sinh Phiếu Nhập kho, Xuất kho, Phiếu Thu/Chi hoặc Đơn Webshop, API Hono thực thi thông qua:
```typescript
await db.transaction(async (tx) => {
  // 1. Kiểm tra tồn kho khả dụng (chống xuất âm khi allowNegativeStock = false)
  // 2. Tính lại Giá vốn bình quân gia quyền (IN) hoặc Giá vốn xuất bán (OUT)
  // 3. Cập nhật tồn kho theo từng kho (inventory_stock) & sản phẩm (products)
  // 4. Sinh Bút toán Sổ Nhật ký chung (TT 133/200: Nợ 156 / Có 331, Nợ 632 / Có 156, Nợ 131 / Có 511 + 3331)
  // 5. Sinh Công nợ Phải thu (AR) / Phải trả (AP)
  // 6. Ghi Sổ thuế GTGT (VatLedger)
  // 7. Xử lý thanh toán ngay (Payments & Bút toán tiền 111/112)
})
```
Nếu bất kỳ bước nào thất bại, toàn bộ giao dịch được tự động **ROLLBACK 100%**, loại bỏ hoàn toàn tình trạng lệch kho hay sổ kế toán không cân xứng.

---

## 3. CÁC LỆNH BỔ TRỢ HỮU ÍCH

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Chạy dev server cục bộ (Port 3000) với Vite HMR và Hono D1 SQLite |
| `npm run build` | Build ứng dụng React SPA |
| `npm run d1:seed` | Nạp toàn bộ dữ liệu thực tế (75 SP, 247 Khách hàng, NCC,...) lên D1 Remote |
| `npm run d1:migrate` | Áp dụng file migration Drizzle lên Cloudflare D1 Remote |
| `npm run d1:migrate:local` | Áp dụng file migration lên SQLite cục bộ khi test |
| `npm run drizzle:generate` | Sinh file migration mới từ file `src/db/schema.ts` |
