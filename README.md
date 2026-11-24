# SPK – Nhà Sách Phúc Khang

Website thư viện / nhà sách viết bằng Node.js (Express 5), Pug, MongoDB (Mongoose) và Cloudinary.

## Chức năng
- Đăng ký, đăng nhập (JWT lưu trong cookie httpOnly), phân quyền `user` / `admin`
- Danh sách sách, lọc theo danh mục, tìm kiếm, trang chi tiết sách
- Mượn sách có thanh toán mô phỏng, trả sách, phụ thu trả trễ ("Sách của tôi")
- Giỏ hàng và đặt mua sách (`/cart`, `/orders`)
- Quản trị: thêm/sửa/xóa sách (kèm ảnh bìa), quản lý tài khoản, lượt mượn, đơn hàng, thu chi
- API JSON: `/api/v1` (đăng nhập bằng Bearer token)

## Cài đặt
```bash
npm install
cp .env.example .env      # rồi điền MONGO_URI, JWT_SECRET, APP_ORIGIN, Cloudinary...
npm run seed:admin        # tạo tài khoản admin đầu tiên
npm run seed:books        # (tùy chọn) nạp sách mẫu từ data/books.json
npm run dev               # hoặc: npm start  → http://localhost:3000
```

## API chính (`/api/v1`)
| Method | Đường dẫn | Quyền |
|---|---|---|
| POST | `/login` | công khai → trả `accessToken` |
| GET | `/books`, `/books/:id` | công khai |
| POST / PUT / DELETE | `/books`, `/books/:id` | admin (Bearer token) |
| GET | `/users` | admin |
| GET / POST | `/orders/sample`, `/orders` | đã đăng nhập (POST gửi email xác nhận) |

## Ghi chú
- `routes/userRoute.js` và `models/user.js` là phần MySQL cũ của bài lab; chỉ admin truy cập được và cần cấu hình `DB_*`.
- Thư mục `docs/` là tài liệu hướng dẫn của bài lab.
