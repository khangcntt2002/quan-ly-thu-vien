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

module.exports = router;