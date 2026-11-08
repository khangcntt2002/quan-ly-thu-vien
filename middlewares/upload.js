// MỤC 3: Multer đọc form multipart/form-data (gồm ô chữ và file).
const multer = require('multer');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
    // Giữ ảnh trong RAM. Dữ liệu ảnh nằm ở req.file.buffer.
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // Tối đa 2 MB mỗi ảnh.
        files: 1, // Mỗi lần gửi form chỉ nhận tối đa một file.
        fields: 6, // title, author, category, edition, description, url.
        fieldSize: 32 * 1024, // Mỗi ô chữ tối đa 32 KB.
        parts: 7 // 6 ô chữ + 1 ảnh.
    },
    fileFilter: (req, file, cb) => {
        // MIME do phía gửi khai báo; Cloudinary kiểm tra ảnh thật ở mục 5.
        // cb là hàm báo kết quả cho Multer: cb(null, true) nghĩa là nhận file.
        if (ALLOWED.includes(file.mimetype)) {
            return cb(null, true);
        }

        const err = new Error('Chỉ nhận ảnh JPG, PNG hoặc WEBP.');
        err.code = 'INVALID_IMAGE_TYPE'; // Mã tự đặt để bookUpload nhận ra lỗi.
        cb(err);
    }
});

module.exports = upload;
