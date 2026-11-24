const router = require('express').Router();
const c = require('../controller/auth.controller');
const { requireSameOrigin } = require('../middlewares/auth');

// === Đăng ký bằng OTP ===
router.get('/register', c.registerForm);
router.post('/register', /* requireSameOrigin, */ c.register);
router.get('/register/verify', c.registerVerifyForm);
router.post('/register/verify', /* requireSameOrigin, */ c.registerVerify);

// === Đăng nhập / Đăng xuất ===
router.get('/login', c.loginForm);
router.post('/login', /* requireSameOrigin, */ c.login);
router.post('/logout', /* requireSameOrigin, */ c.logout);

// === Quên mật khẩu ===
router.get('/forgot-password', c.forgotPasswordForm);
router.post('/forgot-password', /* requireSameOrigin, */ c.sendResetOtp);
router.get('/reset-password', c.resetPasswordForm);
router.post('/reset-password', c.resetPassword);

module.exports = router;
