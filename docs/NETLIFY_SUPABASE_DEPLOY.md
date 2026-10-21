# Netlify + Supabase PostgreSQL: triển khai an toàn

## Kiến trúc hiện tại của nhánh PR

- Frontend: React/Vite trên Netlify, publish thư mục `dist`.
- Netlify Functions: `netlify/functions/api.ts`, dùng Hono + Prisma PostgreSQL trong `src/server/netlifyPostgresApp.ts`.
- Dữ liệu thật: database được khai báo bằng `DATABASE_URL` hoặc `POSTGRES_URL` (nên chỉ dùng một biến chính).
- **Không sử dụng Cloudflare D1 hoặc SQLite để lưu dữ liệu trên Netlify.**
- API đọc: đăng nhập, xác thực phiên, `/api/db/status`, `/api/db/state`, users (ADMIN), roles, webshop orders.
- API ghi đã chuyển: thu/chi (`/api/payments`) và một số danh mục (`/api/db/collection/:key` cho categories, uoms, warehouses, suppliers, customers).
- Đã viết transaction PostgreSQL cho nhập/xuất kho (tồn kho, công nợ, VAT, bút toán), **tắt riêng theo mặc định** vì chưa thử với Supabase staging; các trường hợp trả trước được từ chối rõ ràng.
- **Chưa chuyển:** đảo/hủy chứng từ, hoàn tất quy trình Webshop và một số nghiệp vụ kế toán; những endpoint này trả HTTP 501.

## Biến môi trường cấu hình trong Netlify

| Tên | Phạm vi | Ghi chú |
|---|---|---|
| `DATABASE_URL` | Functions (+ Builds nếu Prisma generate cần) | Lấy từ Supabase Connect → Transaction Pooler. URL phải có user/password đúng và SSL. |
| `JWT_SECRET` | Functions | Chuỗi bí mật đủ mạnh từ trình tạo ngẫu nhiên, ít nhất 32 ký tự. Không dùng tiền tố `VITE_`. |
| `ENABLE_POSTGRES_WRITES` | Functions | Mặc định `false`. Chỉ chuyển `true` trong STAGING sau khi có sao lưu và kiểm thử. |
| `ENABLE_POSTGRES_STOCK_WRITES` | Functions | Mặc định `false`. Cần bật cùng biến trên để cho phép nhập/xuất kho khi đã kiểm tra transaction thực tế. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Builds (chỉ khi frontend dùng Supabase SDK) | Key public, đảm bảo RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions (nếu cần sau này) | Không đưa vào frontend, hiện API này không dùng. |

Đặt build command `npm run build`, publish `dist`, Node 22. **Không dùng `npm ci` khi repo không có package-lock.json.**

## Trước khi mở quyền ghi

1. Kiểm kê dữ liệu hiện tại (D1/local), tạo bản backup riêng và đối chiếu bảng với `prisma/schema.prisma`.
2. Không chạy `prisma db push` / `prisma migrate reset` / `d1:reset` trên production. Kiểm tra schema và migrations trên staging rồi duyệt từng thay đổi.
3. Tạo user thực tế trong bảng users bằng mật khẩu mạnh; **không dùng mật khẩu mặc định 123**. Di chuyển mật khẩu cũ qua cơ chế hash mạnh và rà soát phân quyền.
4. Thử đăng nhập và `/api/db/state`, đối chiếu số lượng products, inventory, stock transactions, debts và journal entries so với database gốc.
5. Test riêng các giao dịch thu/chi liên quan sổ cái, kết quả rollback khi lỗi. Chỉ bật `ENABLE_POSTGRES_WRITES=true` sau kiểm nghiệm staging.
6. Kiểm tra API 501 để biết những nghiệp vụ chưa hoàn thành. **Không merge deploy production khi nhập/xuất kho chưa kiểm thử thực tế hoặc API webshop order mutation còn 501.**

## Kiểm thử tự động

```bash
npm install
npm run test:security
npm run test:api
npm run test:payment
npm run test:stock
npm run test:password
npm run test:netlify
npm run build:api:check
npm run build
```

GitHub Actions chạy những bước này trên Pull Request. Kết quả xanh chứng minh compile và các unit test, **không thay cho kiểm thử thật với Supabase staging**.

## Lưu ý kỹ thuật

- `src/db/prismaClient.ts` có các hàm sync cũ bắt lỗi rồi bỏ qua; API mới không gọi chúng để ghi nghiệp vụ.
- API `/api/db/state` sử dụng bộ tải Prisma hiện có, bỏ trường chứa password/secrets khi trả frontend. Tiếp tục kiểm tra toàn bộ dữ liệu và ủy quyền trước khi dùng SaaS nhiều tenant.
- Sử dụng transaction pooler của Supabase, nhưng xác minh khả năng tương thích Prisma transactions và mức giới hạn kết nối tại staging.
- Các route auth cũ bên Cloudflare D1 vẫn giữ để tránh tự thay đổi môi trường Cloudflare; production nên thống nhất một đường xác thực sau khi migration hoàn chỉnh.


## Netlify deploy preview (không bật ghi dữ liệu production)

1. GitHub: chọn nhánh `fix/netlify-supabase-deployment-audit` để tạo Deploy Preview. **Không merge main**.
2. Trong Netlify, Build command: `npm run build`, Publish directory: `dist`, Node 22.
3. Khai báo trong Netlify Environment variables (chọn scope Functions phù hợp):
   - `DATABASE_URL`: chuỗi kết nối **database staging Supabase**, không phải database production.
   - `JWT_SECRET`: chuỗi ngẫu nhiên đủ mạnh, chỉ lưu ở Functions.
   - `ENABLE_POSTGRES_WRITES=false`.
   - `ENABLE_POSTGRES_STOCK_WRITES=false`.
4. Đảm bảo schema staging khớp `prisma/schema.prisma`, **chỉ chạy migrations đã xét duyệt trên staging**. Không chạy db push hoặc reset vào production.
5. Sau khi Netlify build thành công, mở `https://<your-preview-host>/api/health` và `https://<your-preview-host>/api/ready`.
6. `/api/ready` chỉ trả `ready:true` khi PostgreSQL thực sự kết nối và có các bảng ERP bắt buộc. `productionReady:false` là có chủ ý khi còn thiếu các API nghiệp vụ.
7. Đăng nhập bằng tài khoản PostgreSQL thật, kiểm tra tải dữ liệu. Các thao tác chưa chuyển khỏi local hoặc D1 sẽ bị khóa.

### Trạng thái hỗ trợ

- CI đã kiểm tra nhập/xuất kho, công nợ và bút toán bằng **PostgreSQL Docker riêng**, không chỉ mock.
- Đăng nhập ERP và truy vấn dữ liệu đọc chạy qua Hono Prisma Netlify.
- Nhập/xuất kho, danh mục và thanh toán dùng transaction PostgreSQL nhưng **quyền ghi tắt mặc định**.
- Webshop customer registration/auth, checkout, reversal, và nhiều thao tác trên giao diện ERP chưa hoàn thành. Không bật quyền ghi và không cho khách dùng bản preview để kinh doanh thật.

### Dấu hiệu chưa được deploy thành công

- `/api/health` trả trạng thái limited: chỉ xác nhận Function chạy, **không xác nhận database**.
- `/api/ready` trả HTTP 503: cấu hình DATABASE_URL hoặc schema cần kiểm tra.
- HTTP 401: thiếu hoặc sai phiên đăng nhập.
- HTTP 501: endpoint chưa được chuyển sang PostgreSQL.
- HTTP 503 cho mutation: chức năng còn tắt bởi feature flag.

Không dán `DATABASE_URL`, mật khẩu PostgreSQL hoặc Supabase Service Role Key vào issue, Pull Request hay chat.
