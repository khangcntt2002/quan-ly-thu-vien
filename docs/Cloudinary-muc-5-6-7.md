# Thực hành Cloudinary mục 5 6 7

Phần này bổ sung cách gửi ảnh lên Cloudinary và lưu thông tin sách vào MongoDB. Đọc theo thứ tự service, hàm hỗ trợ, rồi controller thêm sách.

## 5. Service upload và xóa ảnh

File `services/image.service.js` có hai hàm:

- `uploadImage(buffer)`: nhận dữ liệu ảnh trong RAM, gửi lên thư mục `mshv/covers` trên Cloudinary. Chỉ cho phép ảnh JPG, JPEG, PNG, WEBP.
- `deleteImage(publicId)`: xóa ảnh bằng mã Cloudinary. Nếu mã trống thì bỏ qua.

Cloudinary trả kết quả qua callback. Ta bọc trong `Promise` để controller gọi được `await uploadImage(...)`. `stream.end(buffer)` gửi dữ liệu ảnh đi.

Kết quả upload có `secure_url` (đường dẫn HTTPS để hiển thị) và `public_id` (mã để quản lý, xóa ảnh).

## 6. Chuẩn bị controller

Trong `controller/bookController.js`:

- `readBookFields` chỉ lấy sáu ô chữ, bỏ khoảng trắng ở hai đầu. Các trường khác do người dùng gửi như `image`, `imagePublicId`, `_id` không được lấy vào dữ liệu tạo sách.
- `cleanupUploaded` xóa ảnh vừa upload nếu lưu sách thất bại. Nếu xóa cũng lỗi, ghi mã ảnh vào log để dọn thủ công.
- `AddBookPage` mở form với dữ liệu sách trống và thông báo lỗi trống.

## 7. Thêm sách kèm ảnh bìa

Hàm `AddBook` làm theo thứ tự:

1. Đọc sáu ô chữ. Nếu thiếu tên hoặc tác giả, trả về form với mã 400 trước khi upload.
2. Nếu có ảnh, gửi `req.file.buffer` lên Cloudinary, gán `secure_url` vào `image` và `public_id` vào `imagePublicId`.
3. Gọi `Book.create(data)` để lưu sách. Nếu không chọn ảnh, schema tự dùng ảnh mặc định.
4. Lưu thành công: chuyển đến `/book/<id>` bằng mã 303.
5. Có lỗi: dọn ảnh mới nếu đã upload, rồi hiện lại form và thông báo. Lỗi dữ liệu trả mã 400, lỗi upload trả mã 502, lỗi lưu khác trả mã 500.

Ví dụ: ảnh đã lên Cloudinary nhưng tên sách dài quá 200 ký tự khiến MongoDB không lưu được. Controller sẽ xóa ảnh mới để tránh để lại ảnh thừa.

## Trạng thái khi dừng ở mục 7

Service và controller đã sẵn sàng. Route POST `/book/add` chưa được gắn `bookUpload`; thao tác này thuộc mục 8 của tài liệu. Vì thế gửi form multipart trên trang web chưa chạy được toàn bộ luồng. Các kiểm tra mục 5–7 dùng dữ liệu giả lập, không upload ảnh hoặc tạo sách thật trên dịch vụ.

Trước khi thực hành mục 8, điền đủ thông tin Cloudinary và MongoDB trong `.env`.
