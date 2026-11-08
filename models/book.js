const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    // Tên sách
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    // Tác giả
    author: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    // Thể loại chi tiết
    category: {
        type: String,
        maxlength: 100
    },

    // Danh mục lớn dùng cho thanh bên trái
    menuCategory: {
        type: String,
        enum: [
            'Văn học',
            'Kinh tế',
            'Công nghệ',
            'Ngoại ngữ',
            'Giáo trình',
            'Kỹ năng sống',
            'Lịch sử',
            'Thiếu nhi'
        ],
        default: 'Công nghệ'
    },

    // Phiên bản
    edition: {
        type: String,
        maxlength: 100
    },

    // Mô tả
    description: {
        type: String,
        maxlength: 5000
    },

    // Đường dẫn sách
    url: {
        type: String,
        maxlength: 2048
    },

    // Ảnh bìa
    image: {
        type: String,
        default: '/images/avatar1.png'
    },

    // Giá tham khảo của sách (VNĐ), Admin có thể cập nhật trong form thêm/sửa.
    price: {
        type: Number,
        min: 0,
        default: 200000
    },
    // Phí thuê/mượn sách tính theo ngày (VNĐ/ngày).
    dailyRentalFee: {
        type: Number,
        min: 0,
        default: 5000
    },

    // Mã ảnh Cloudinary
    imagePublicId: {
        type: String,
        default: ''
    }
}, {
    timestamps: true // ✅ Tự tạo trường createdAt & updatedAt
});

module.exports = mongoose.model('Book', bookSchema);
