const router = require('express').Router();

// Gắn các nhóm API. Tất cả nằm dưới /api/v1 (khai báo trong app.js).
router.use('/', require('./auth.api'));          // POST /api/v1/login
router.use('/books', require('./book.api'));      // /api/v1/books
router.use('/users', require('./user.api'));      // /api/v1/users (admin)
router.use('/orders', require('./order.api'));    // /api/v1/orders (cần đăng nhập)

module.exports = router;
