const router = require('express').Router();
const c = require('../../controller/order.api.controller');
const { checkToken } = require('../../middlewares/auth');

// GET  /api/v1/orders/sample => xem đơn hàng mẫu (không gửi mail)
router.get('/sample', checkToken, c.sample);

// POST /api/v1/orders => tạo đơn + gửi email xác nhận đặt hàng
router.post('/', checkToken, c.create);

module.exports = router;
