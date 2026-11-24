const router = require('express').Router();
const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const Book = require('../models/book');
const Order = require('../models/order');
const cart = require('../utils/cart');
const { requireAuth, requireSameOrigin } = require('../middlewares/auth');

router.use(requireAuth);

const conflict = (res, title, message) =>
  res.status(409).render('error', { status: 409, title, message });

// GET /orders – đơn của người đang đăng nhập
router.get('/', async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .select('-fingerprint').sort({ createdAt: -1 }).limit(20).lean();
  res.render('orders', { title: 'Đơn hàng của tôi', orders });
});

// GET /orders/:id – tìm theo cả _id và user => không xem được đơn người khác
router.get('/:id', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    cart.invalid('ID đơn hàng không hợp lệ.');
  }
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    .select('-fingerprint').lean();
  if (!order) return res.status(404).render('error', {
    title: 'Không tìm thấy đơn hàng', status: 404
  });
  res.render('order-detail', { title: 'Chi tiết đơn hàng', order });
});

// POST /orders – tạo đơn từ giỏ trong MongoDB; không tin giá/tổng/userId từ form
router.post('/', requireSameOrigin, async (req, res) => {
  const { requestId, address, items } = req.body;
  if (typeof requestId !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(requestId) ||
      typeof address !== 'string' || address.trim().length < 5 ||
      address.trim().length > 300 || typeof items !== 'string') {
    cart.invalid('Kiểm tra mã đặt hàng, địa chỉ và giỏ hàng.');
  }
  const rows = cart.parseItems(items);
  if (!rows.length) cart.invalid('Giỏ hàng đang trống.');
  const fingerprint = createHash('sha256').update(JSON.stringify({
    rows, address: address.trim()
  })).digest('hex');
  const filter = { user: req.user._id, requestId };

  function finish(order) {
    // Cùng requestId nhưng nội dung khác => 409
    if (order.fingerprint !== fingerprint) {
      return conflict(res, 'Yêu cầu đặt hàng đã thay đổi',
        'Mở lại giỏ hàng để tạo yêu cầu mới.');
    }
    return res.redirect(303, '/orders/' + order._id);
  }

  // Gửi lại đúng POST cũ (refresh, mạng lỗi) => trả về đơn đã tạo
  const existing = await Order.findOne(filter);
  if (existing) return finish(existing);

  // Đơn mới phải khớp đúng phiên bản giỏ đang lưu trong DB
  const current = await cart.Cart.findOne({ user: req.user._id });
  if (!current || current.requestId !== requestId ||
      JSON.stringify(cart.rowsOf(current)) !== JSON.stringify(rows)) {
    return conflict(res, 'Giỏ hàng đã thay đổi',
      'Giỏ hàng vừa được cập nhật. Mở lại giỏ hàng để kiểm tra trước khi đặt.');
  }

  const books = await Book.find({
    _id: { $in: rows.map(x => x.bookId) }
  }).lean();
  const byId = new Map(books.map(x => [String(x._id), x]));
  const snapshot = rows.map(item => {
    const book = byId.get(item.bookId);
    if (!book || !cart.validPrice(book.price)) {
      cart.invalid('Có sách đã bị xóa hoặc chưa có giá bán.');
    }
    return { book: book._id, title: book.title,
      unitPrice: book.price, qty: item.qty };
  });
  const total = snapshot.reduce((sum, x) => sum + x.unitPrice * x.qty, 0);
  if (!Number.isSafeInteger(total)) cart.invalid('Tổng tiền không hợp lệ.');

  let order;
  try {
    order = await Order.create({ ...filter, fingerprint,
      address: address.trim(), items: snapshot, total });
  } catch (err) {
    // 2 request đồng thời: unique index chặn bản thứ 2 => trả về đơn đã tạo
    if (err.code !== 11000) throw err;
    order = await Order.findOne(filter);
    if (!order) throw err;
    return finish(order);
  }
  // Chỉ xóa giỏ SAU KHI đơn đã lưu thành công, và chỉ khi giỏ chưa bị đổi
  await cart.Cart.deleteOne({ user: req.user._id, requestId });
  return finish(order);
});

// POST /orders/:id/cancel – người mua hủy đơn của chính mình khi còn pending
router.post('/:id/cancel', requireSameOrigin, async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    cart.invalid('ID đơn hàng không hợp lệ.');
  }
  // Cập nhật có điều kiện: chỉ khớp khi đúng chủ đơn VÀ đang pending.
  // Admin đổi trạng thái cùng lúc thì điều kiện không khớp => không hủy nhầm.
  const updated = await Order.findOneAndUpdate(
    { _id: id, user: req.user._id, status: 'pending' },
    { $set: { status: 'cancelled', cancelledAt: new Date(),
      cancelledBy: 'user' } },
    { returnDocument: 'after' }
  );
  if (updated) return res.redirect(303, '/orders/' + id);

  const order = await Order.findOne({ _id: id, user: req.user._id })
    .select('status').lean();
  if (!order) return res.status(404).render('error', {
    title: 'Không tìm thấy đơn hàng', status: 404
  });
  // Gửi lại yêu cầu hủy cho đơn đã hủy: không báo lỗi, quay về trang chi tiết
  if (order.status === 'cancelled') return res.redirect(303, '/orders/' + id);
  return conflict(res, 'Không thể hủy đơn',
    'Đơn hàng đã được xác nhận hoặc đang giao nên không thể hủy.');
});

module.exports = router;
