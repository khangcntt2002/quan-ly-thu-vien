// MỤC 5: Gom thao tác upload và xóa ảnh vào service để controller dùng lại.
const cloudinary = require('../config/cloudinary');

// Chuyển dữ liệu ảnh trong RAM lên Cloudinary.
function uploadImage(buffer) {
    // Bọc callback trong Promise để controller có thể dùng await.
    // resolve trả kết quả thành công; reject báo lỗi để catch ở controller xử lý.
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'mshv/covers', // Thư mục lưu ảnh của dự án trên Cloudinary.
                resource_type: 'image', // Yêu cầu Cloudinary xử lý tài nguyên ảnh.
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                timeout: 60000 // Thời gian chờ upload tối đa 60 giây.
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result) {
                    return reject(new Error('Thiếu kết quả upload'));
                }
                // result có secure_url để hiển thị và public_id để quản lý ảnh.
                resolve(result);
            }
        );

        stream.on('error', reject); // Bắt lỗi phát sinh khi truyền dữ liệu.
        stream.end(buffer); // Gửi dữ liệu ảnh trong RAM và kết thúc luồng gửi.
    });
}

// Dùng mã ảnh để xóa; không dùng URL hiển thị để xóa ảnh.
function deleteImage(publicId) {
    if (!publicId) return Promise.resolve(); // Không có mã ảnh thì bỏ qua.

    return cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true // Yêu cầu làm mới cache CDN sau khi xóa ảnh.
    }).then((result) => {
        // 'ok': đã xóa; 'not found': ảnh không còn tồn tại, không cần xóa nữa.
        if (!['ok', 'not found'].includes(result.result)) {
            throw new Error('Chưa xóa được ảnh Cloudinary');
        }
        return result;
    });
}

module.exports = { uploadImage, deleteImage };
