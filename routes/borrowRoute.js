const express = require('express');
const router = express.Router();
const borrowController = require('../controller/borrowController');

// Middleware kiểm tra đăng nhập (tự viết nếu chưa có)
const isAuth = (req, res, next) => {
  if (req.user) return next();
  res.redirect('/login');
};

// Mượn sách
router.post('/book', isAuth, borrowController.borrowBook);

// Xem sách tôi mượn
router.get('/my', isAuth, borrowController.getMyBorrows);

// Trả sách
router.post('/:id/return', isAuth, borrowController.returnBook);

// [Admin] Xem tất cả
router.get('/all', isAuth, borrowController.getAllBorrows);

module.exports = router;
