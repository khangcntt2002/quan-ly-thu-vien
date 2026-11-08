# Nối route và chạy thử upload ảnh

Mục 8 hoàn thiện luồng thêm sách có ảnh bìa. Service và controller ở mục 5–7 đã được nối với middleware nhận ảnh ở mục 3–4.

## 1. Nối route

Trong `routes/bookRoute.js`:

```js
const bookUpload = require('../middlewares/bookUpload');

router.get('/add', bookController.AddBookPage);
router.post('/add', bookUpload, bookController.AddBook);
router.get('/:id', bookController.getBookDetailPage);
```

`app.js` đã gắn router tại `/book`, nên `/add` tương ứng với `http://localhost:3000/book/add`.

Khi gửi form, chương trình chạy theo thứ tự:

1. `bookUpload` đọc các ô chữ vào `req.body` và ảnh vào `req.file.buffer`. Nếu ảnh không hợp lệ thì hiện lại form với thông báo lỗi.
2. `AddBook` kiểm tra tên sách và tác giả.
3. Service gửi ảnh lên Cloudinary, nhận đường dẫn HTTPS và mã ảnh.
4. Controller lưu thông tin sách cùng `image`, `imagePublicId` vào MongoDB.
5. Server chuyển đến trang chi tiết bằng mã 303. Trang chi tiết dùng `book.image` để hiển thị ảnh.

Đặt route `/add` trước `/:id` để Express không hiểu nhầm chữ `add` là mã sách. Middleware chỉ gắn vào POST thêm sách.

## 2. Tự chạy thử

Điền đủ `MONGO_URI` và ba biến Cloudinary trong `.env`, rồi chạy:

```sh
pnpm start
```

Nếu server đã chạy bằng nodemon, lưu file sẽ tự khởi động lại. Khởi động lại server sau khi đổi `.env`.

Mở `http://localhost:3000/book/add`, nhập tên sách và tác giả, chọn một ảnh JPG, PNG hoặc WEBP dưới 2 MB, rồi bấm **Thêm sách**. Có thể dùng `public/images/avatar1.png` làm ảnh thử.

Sau khi chuyển đến trang chi tiết, kiểm tra ảnh đã xuất hiện. Trong MongoDB, sách cần có `image` là URL Cloudinary và `imagePublicId` là mã bắt đầu bằng `mshv/covers/`.

## 3. Kết quả kiểm tra thực tế

Đã kiểm tra ngày 19/10/2026 bằng HTTP multipart qua server đang chạy tại cổng 3000, sử dụng Cloudinary và MongoDB thật.

| Tình huống | Kết quả |
| --- | --- |
| Gửi `avatar1.png` cùng thông tin sách | HTTP 303, chuyển đến trang chi tiết |
| Kiểm tra MongoDB | Có sách mới với `image` và `imagePublicId` |
| Tải ảnh từ Cloudinary | HTTP 200, Content-Type `image/png` |
| Mở trang chi tiết | HTTP 200, HTML có URL ảnh vừa upload |
| Gửi ảnh quá 2 MB | HTTP 413, form báo ảnh vượt quá 2 MB |
| Gửi file PDF | HTTP 400, form báo chỉ nhận JPG, PNG hoặc WEBP |
| Gửi ảnh với tên trường `avatar` thay cho `cover` | HTTP 400, form báo upload không hợp lệ |
| Tên sách chỉ có khoảng trắng | HTTP 400, form yêu cầu tên sách và tác giả |

Các form lỗi đã giữ lại tác giả được gửi lên. Đây là kiểm tra qua HTTP và dữ liệu thực tế, chưa kiểm tra hiển thị bằng trình duyệt tự động.

Sách thử được giữ lại để bạn kiểm tra:

- Tên: `Node.js thực hành - kiểm tra upload 2026-10-19T12:05:01.949Z`.
- Trang chi tiết: `http://localhost:3000/book/6ad60770b2ccc665ab94b1cd`.
- Mã ảnh: `mshv/covers/najpjiw69dvdvk74pd36`.

Đã sửa hai liên kết về danh sách trên trang chi tiết thành `/book`, đúng route của dự án.
