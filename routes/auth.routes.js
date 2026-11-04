const router = require('express').Router();
const c = require('../controller/auth.controller');
const { requireAuth, requireRole, requireSameOrigin } =
  require('../middlewares/auth');

// === TẮT TẠM requireSameOrigin khi test Postman ===
router.get('/register', c.registerForm);
// Bỏ requireSameOrigin đi
router.post('/register', /* requireSameOrigin, */ c.register);

router.get('/login', c.loginForm);
// Bỏ requireSameOrigin đi
router.post('/login', /* requireSameOrigin, */ c.login);

// Tương tự logout
router.post('/logout', /* requireSameOrigin, */ c.logout);

// Trang Admin giữ nguyên — cần đăng nhập mới vào được
router.get('/admin', requireAuth, requireRole('admin'),
  (req, res) => {
    res.render('admin/index', {
      title: 'Quản trị LinhKien.vn',
      stats: { books: 12, orders: 5 },
      books: [
        { name: 'Lập trình Node.js', price: 120000 },
        { name: 'MongoDB cơ bản', price: 95000 }
      ]
    });
  }
);

module.exports = router;