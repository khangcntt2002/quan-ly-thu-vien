# Thực hành Cloudinary đến hết mục 4

Phần này chuẩn bị cấu hình và cách nhận ảnh từ form. Mục tiêu là hiểu cách server đọc ảnh và trả thông báo khi file không hợp lệ.

## 1. Chuẩn bị môi trường

- Đã cài thư viện `cloudinary` bằng `pnpm add cloudinary`.
- Form `views/addbook.pug` đã có `enctype="multipart/form-data"` và ô chọn ảnh tên `cover`.
- Điền `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` trong `.env` bằng thông tin từ tài khoản Cloudinary. Giữ nguyên `MONGO_URI`.
- `.env.example` là mẫu trống để chia sẻ. `.gitignore` bỏ qua `.env` và `node_modules/`.

## 2. Cấu hình và schema

`config/cloudinary.js` đọc ba biến môi trường để cấu hình Cloudinary. `app.js` đã đọc `.env` trước khi nạp route.

Trong `models/book.js`:

- `title` và `author` bắt buộc, bỏ khoảng trắng ở hai đầu, tối đa 200 ký tự.
- `image` lưu đường dẫn ảnh để hiển thị. Mặc định là `/images/avatar1.png`.
- `imagePublicId` lưu mã ảnh Cloudinary để sử dụng ở các bước sau.

## 3. Nhận ảnh với Multer

`middlewares/upload.js` quy định:

- Giữ ảnh trong RAM bằng `memoryStorage()`.
- Nhận một ảnh JPG, PNG hoặc WEBP, tối đa 2 MB.
- Đọc tối đa sáu ô chữ và một ảnh, đúng với form hiện tại.

Sau khi Multer đọc xong, `req.body` chứa các ô chữ và `req.file.buffer` chứa dữ liệu ảnh nếu người dùng có chọn file. Bộ lọc MIME chỉ kiểm tra loại file do phía gửi khai báo; bước 5 sẽ dùng Cloudinary để kiểm tra ảnh.

## 4. Trả lỗi về form

`middlewares/bookUpload.js` gọi `upload.single('cover')` và xử lý kết quả:

- Thành công: gọi `next()` để chuyển sang controller.
- File quá 2 MB: trả mã HTTP 413 và thông báo “Ảnh vượt quá 2 MB.”
- Sai định dạng hoặc gửi file không đúng quy định: trả mã HTTP 400 và hiện lỗi trên form thêm sách.
- Lỗi khác: gọi `next(err)` để chuyển đến middleware lỗi chung.

Khi hiện lại form, server giữ các ô chữ đã đọc được. Người dùng phải chọn lại ảnh vì trình duyệt không cho server điền sẵn ô file.

## Trạng thái khi dừng ở mục 4

Hai middleware đã được chuẩn bị nhưng chưa gắn vào route `/book/add`; tài liệu thực hiện việc đó ở mục 8. Vì vậy gửi form thêm sách ở mốc này chưa có luồng upload hoàn chỉnh.

Các bước tiếp theo trong tài liệu là tạo service gửi ảnh lên Cloudinary (mục 5), cập nhật controller (mục 6–7), rồi nối route và chạy thử (mục 8).
