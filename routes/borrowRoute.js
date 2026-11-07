const express = require('express');
const router = express.Router();
const borrowController = require('../controller/borrowController');
<<<<<<< HEAD
const { requireAuth, requireRole } = require('../middlewares/auth');

// Middleware kiểm tra đăng nhập (tự viết nếu chưa có)
const isAuth = requireAuth;
=======

// Middleware kiểm tra đăng nhập (tự viết nếu chưa có)
const isAuth = (req, res, next) => {
  if (req.user) return next();
  res.redirect('/login');
};
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0

// Mượn sách
router.post('/book', isAuth, borrowController.borrowBook);

// Xem sách tôi mượn
router.get('/my', isAuth, borrowController.getMyBorrows);

// Trả sách
router.post('/:id/return', isAuth, borrowController.returnBook);

// [Admin] Xem tất cả
<<<<<<< HEAD
router.get('/all', isAuth, requireRole('admin'), borrowController.getAllBorrows);
=======
router.get('/all', isAuth, borrowController.getAllBorrows);
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0

module.exports = router;
