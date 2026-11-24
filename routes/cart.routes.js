const router = require('express').Router();
const mongoose = require('mongoose');
// File model trong dự án tên Book.js (chữ B hoa); giữ đúng chữ hoa
// để Node không nạp model 2 lần trên Windows
const Book = require('../models/book');
const cart = require('../utils/cart');
const { requireAuth, requireSameOrigin } = require('../middlewares/auth');

// Mọi thao tác giỏ đều cần đăng nhập; giỏ luôn tìm theo req.user._id
// nên người dùng chỉ đọc/sửa được giỏ của chính mình.
router.use(requireAuth);

const validBookId = (id) =>
  typeof id === 'string' && mongoose.isObjectIdOrHexString(id);

// Thông báo sau khi thao tác: chỉ nhận các khóa cố định, không in chuỗi từ URL
const NOTICES = {
  added: 'Đã thêm sách vào giỏ.',
  updated: 'Đã cập nhật số lượng.',
  removed: 'Đã xóa sách khỏi giỏ.',
  cleared: 'Đã xóa toàn bộ giỏ hàng.'
};

// GET /cart – xem giỏ; giá và tổng tiền tính trên server từ Book
router.get('/', async (req, res) => {
  const current = await cart.load(req.user._id);
  const items = cart.rowsOf(current);
  const books = await Book.find({
    _id: { $in: items.map(x => x.bookId) }
  }).lean();
  const byId = new Map(books.map(x => [String(x._id), x]));
  const rows = items.map(item => {
    const book = byId.get(item.bookId);
    const available = Boolean(book && cart.validPrice(book.price));
    return { ...item, title: book?.title || 'Sách đã bị xóa',
      price: available ? book.price : null,
      subtotal: available ? book.price * item.qty : null };
  });
  const total = rows.reduce((sum, x) => sum + (x.subtotal || 0), 0);
  const canCheckout = rows.length > 0 &&
    rows.every(x => x.price !== null) && Number.isSafeInteger(total);
  res.render('cart', { title: 'Giỏ hàng', rows, total, canCheckout,
    requestId: current.requestId, itemsJSON: JSON.stringify(items),
    notice: NOTICES[req.query.done] || null });
});

// POST /cart/add – thêm 1 cuốn (hoặc +1 nếu đã có)
router.post('/add', requireSameOrigin, async (req, res) => {
  const id = req.body.bookId;
  if (!validBookId(id)) cart.invalid('ID sách không hợp lệ.');
  const book = await Book.findById(id).lean();
  if (!book || !cart.validPrice(book.price)) {
    cart.invalid('Sách không tồn tại hoặc chưa có giá bán.');
  }
  await cart.update(req.user._id, (c) => {
    const item = c.items.find(x => x.book.equals(book._id));
    if (item) {
      if (item.qty >= 10) cart.invalid('Mỗi sách tối đa 10 cuốn.');
      item.qty += 1;
    } else {
      if (c.items.length >= 20) cart.invalid('Tối đa 20 đầu sách.');
      c.items.push({ book: book._id, qty: 1 });
    }
  });
  res.redirect(303, '/cart?done=added');
});

// POST /cart/update – đổi số lượng (form gửi chuỗi "1".."10")
router.post('/update', requireSameOrigin, async (req, res) => {
  const { bookId, qty: text } = req.body;
  if (!validBookId(bookId) || typeof text !== 'string' ||
      !/^(?:[1-9]|10)$/.test(text)) {
    cart.invalid('Số lượng phải là số nguyên từ 1 đến 10.');
  }
  await cart.update(req.user._id, (c) => {
    const item = c.items.find(x => x.book.equals(bookId));
    if (!item) cart.invalid('Sách không có trong giỏ.');
    item.qty = Number(text);
  });
  res.redirect(303, '/cart?done=updated');
});

// POST /cart/remove – xóa 1 dòng (kể cả sách đã bị xóa khỏi books)
router.post('/remove', requireSameOrigin, async (req, res) => {
  const { bookId } = req.body;
  if (!validBookId(bookId)) cart.invalid('ID sách không hợp lệ.');
  await cart.update(req.user._id, (c) => {
    c.items = c.items.filter(x => !x.book.equals(bookId));
  });
  res.redirect(303, '/cart?done=removed');
});

// POST /cart/clear – xóa toàn bộ giỏ của chính user đang đăng nhập
router.post('/clear', requireSameOrigin, async (req, res) => {
  await cart.Cart.deleteOne({ user: req.user._id });
  res.redirect(303, '/cart?done=cleared');
});

module.exports = router;
