// MỤC 2: Cấu hình kết nối Cloudinary, nơi lưu ảnh bìa sách.
const cloudinary = require('cloudinary').v2;

// app.js đã đọc .env trước khi nạp các route.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Tên môi trường Cloudinary.
    api_key: process.env.CLOUDINARY_API_KEY, // Khóa dùng để gọi API.
    api_secret: process.env.CLOUDINARY_API_SECRET, // Khóa bí mật, chỉ dùng ở server.
    secure: true // Tạo đường dẫn ảnh dùng HTTPS.
});

module.exports = cloudinary;
