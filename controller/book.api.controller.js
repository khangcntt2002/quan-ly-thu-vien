const mongoose = require('mongoose');
const Book = require('../models/book');
const result = require('../utils/response');

// Các trường client được phép gửi lên khi tạo / sửa sách.
// image, imagePublicId, createdAt do server quản lý nên không nhận từ body.
const EDITABLE = ['title', 'author', 'category', 'menuCategory', 'edition', 'description', 'url'];
const NUMERIC = ['price', 'dailyRentalFee'];

function pickBookFields(body = {}) {
    const data = {};
    for (const field of EDITABLE) {
        if (body[field] === undefined) continue;
        if (typeof body[field] !== 'string') return { error: field + ' phai la chuoi' };
        data[field] = body[field].trim();
    }
    for (const field of NUMERIC) {
        if (body[field] === undefined) continue;
        if (typeof body[field] !== 'number' || !Number.isFinite(body[field]) || body[field] < 0) {
            return { error: field + ' phai la so >= 0' };
        }
        data[field] = body[field];
    }
    return { data };
}

// GET /api/v1/books
exports.list = async (req, res) => {
    try {
        const books = await Book.find();
        return result.ok(res, books);
    } catch (err) {
        return result.fail(res, 500, 'Loi lay danh sach');
    }
}

// GET /api/v1/books/:id
exports.findid = async(req,res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return result.fail(res, 400, 'ID khong hop le');
    //return res.status(400).json({ message: 'ID khong hop le' });
    }
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return result.fail(res, 404, 'Khong co sach');
        //return res.status(404).json({ message: 'Khong co sach' });
        }

        return result.ok(res, book);
        //res.json(book);
    } catch (err) {
        return result.fail(res, 500, 'Loi lay sach');
    }
}

// POST /api/v1/books (chi admin)
exports.create = async (req, res) => {
    const { data, error } = pickBookFields(req.body);
    if (error) return result.fail(res, 400, error);
    if (!data.title || !data.author) {
        return result.fail(res, 400, 'Nhap title va author');
    }
    try {
        const book = await Book.create(data);
        return result.create(res, book);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return result.fail(res, 400, 'Du lieu sach khong hop le', err.message);
        }
        return result.fail(res, 500, 'Loi tao sach');
    }
}

// PUT /api/v1/books/:id (chi admin) - cập nhật các trường gửi lên
exports.replace = async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return result.fail(res, 400, 'ID khong hop le');
    }
    const { data, error } = pickBookFields(req.body);
    if (error) return result.fail(res, 400, error);
    if (Object.keys(data).length === 0) {
        return result.fail(res, 400, 'Khong co du lieu de cap nhat');
    }
    try {
        // runValidators: kiểm tra lại required, maxlength của schema khi update
        const book = await Book.findByIdAndUpdate(
            req.params.id,
            { $set: data },
            { returnDocument: 'after', runValidators: true }
        );
        if (!book) {
            return result.fail(res, 404, 'Khong co sach');
        }
        return result.ok(res, book);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return result.fail(res, 400, 'Du lieu sach khong hop le', err.message);
        }
        return result.fail(res, 500, 'Loi cap nhat sach');
    }
}

// DELETE /api/v1/books/:id (chi admin)
exports.remove = async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return result.fail(res, 400, 'ID khong hop le');
    }
    try {
        const book = await Book.findByIdAndDelete(req.params.id);
        if (!book) {
            return result.fail(res, 404, 'Khong co sach de xoa');
        }
        // 204 No Content: xóa thành công, không có body
        return res.status(204).end();
    } catch (err) {
        return result.fail(res, 500, 'Loi xoa sach');
    }
}
