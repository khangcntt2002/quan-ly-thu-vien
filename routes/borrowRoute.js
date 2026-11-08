const express = require('express');
const router = express.Router();
const borrowController = require('../controller/borrowController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Middleware kiểm tra đăng nhập (tự viết nếu chưa có)
const isAuth = requireAuth;

// Mượn sách
router.post('/book', isAuth, borrowController.borrowBook);

// Xem sách tôi mượn
router.get('/my', isAuth, borrowController.getMyBorrows);

// Trả sách
router.post('/:id/return', isAuth, borrowController.returnBook);

// [Admin] Xem tất cả
router.get('/all', isAuth, requireRole('admin'), borrowController.getAllBorrows);

module.exports = router;
