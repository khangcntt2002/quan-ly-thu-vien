// MỤC 4: Bắt lỗi nhận file và hiển thị lại form thêm sách.
const multer = require('multer');
const upload = require('./upload');

// 'cover' phải giống name của ô chọn ảnh trong views/addbook.pug.
const receiveCover = upload.single('cover');

module.exports = (req, res, next) => {
    // Lỗi nhận file xảy ra trước controller, nên cần bắt ở callback này.
    receiveCover(req, res, (err) => {
        // Đọc form thành công: chuyển sang controller.
        if (!err) return next();

        let message;
        let status = 400; // 400: dữ liệu gửi lên không hợp lệ.

        if (err instanceof multer.MulterError) {
            // MulterError là lỗi giới hạn file, số lượng file hoặc tên ô file.
            message = err.code === 'LIMIT_FILE_SIZE'
                ? 'Ảnh vượt quá 2 MB.'
                : 'Upload không hợp lệ. Chỉ gửi một ảnh bìa.';
            if (err.code === 'LIMIT_FILE_SIZE') status = 413; // 413: file quá lớn.
        } else if (err.code === 'INVALID_IMAGE_TYPE') {
            message = err.message;
        } else {
            // Lỗi khác được chuyển đến middleware lỗi chung trong app.js.
            return next(err);
        }
        // Route sửa sách(/:id/update) có req.paras.id ->render lại sửa thay vì thêm
        const isEdit = Boolean(req.params && req.params.id);
        const book = isEdit ? { ...req.body, id:req.params.id} : req.body || {};

        //render lại form kèm dữ liệu đã nhập(book) và báo lỗi(error)
        //return để k gửi response 2 lần
        return res.status(status).render('addbook', {
            title: isEdit ? 'sửa sách' : 'Thêm sách',
            isEdit,
            book,
            error: message
        });
    });
};
