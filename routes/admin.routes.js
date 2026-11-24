const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const Book = require('../models/book');
const User = require('../models/mongoUser');
const Borrow = require('../models/borrow');
const mongoose = require('mongoose');
const Expense = require('../models/expense');
const Order = require('../models/order');
const Cart = require('../models/cart');
const orderStatus = require('../utils/order-status');

router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res, next) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [bookCount, userCount, borrowCount, activeBorrowCount, monthlyPayments] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments(),
      Borrow.countDocuments(),
      Borrow.countDocuments({ status: 'borrowing' }),
      Borrow.aggregate([
        { $match: { paymentDate: { $gte: monthStart }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' }, late: { $sum: '$lateFee' } } }
      ])
    ]);
    const monthlyRevenue = monthlyPayments[0]
      ? (monthlyPayments[0].total || 0) + (monthlyPayments[0].late || 0)
      : 0;
    res.render('admin/index', {
      title: 'Quản trị hệ thống', user: req.user,
      stats: { books: bookCount, users: userCount, borrows: borrowCount, activeBorrows: activeBorrowCount, monthlyRevenue }
    });
  } catch (err) { next(err); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).lean();
    res.render('admin/users', { title: 'Quản lý tài khoản', user: req.user, users, query: req.query });
  } catch (err) { next(err); }
});


// Trang thu chi: doanh thu từ thanh toán mượn sách và phụ thu trễ hạn đã chốt.
router.get('/thu-chi', async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [payments, latePayments, expenses, borrowPayments] = await Promise.all([
      Borrow.aggregate([
        { $match: { paymentStatus: 'paid', paymentDate: { $gte: monthStart, $lt: nextMonth } } },
        { $group: { _id: null, total: { $sum: '$paidAmount' }, count: { $sum: 1 } } }
      ]),
      Borrow.aggregate([
        { $match: { returnDate: { $gte: monthStart, $lt: nextMonth }, lateFee: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$lateFee' } } }
      ]),
      Expense.find({ expenseDate: { $gte: monthStart, $lt: nextMonth } })
        .sort({ expenseDate: -1 }).lean(),
      Borrow.find({
        paymentStatus: 'paid',
        paymentDate: { $gte: monthStart, $lt: nextMonth }
      }).populate('user', 'name email').populate('book', 'title')
        .sort({ paymentDate: -1 }).lean()
    ]);

    const rentalRevenue = payments[0] ? payments[0].total : 0;
    const lateRevenue = latePayments[0] ? latePayments[0].total : 0;
    const totalIncome = rentalRevenue + lateRevenue;
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    res.render('admin/thu-chi', {
      title: 'Quản lý thu chi',
      user: req.user,
      monthLabel: now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
      summary: {
        rentalRevenue, lateRevenue, totalIncome, totalExpense,
        profit: totalIncome - totalExpense,
        paymentCount: payments[0] ? payments[0].count : 0
      },
      expenses,
      borrowPayments,
      query: req.query
    });
  } catch (err) {
    next(err);
  }
});

// Admin ghi nhận một khoản chi.
router.post('/thu-chi/expense', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const category = String(req.body.category || 'Khác').trim();
    const amount = Number(req.body.amount);
    const expenseDate = new Date(req.body.expenseDate);
    const note = String(req.body.note || '').trim();

    if (!title || title.length > 120 || !Number.isFinite(amount) || amount <= 0 ||
        !req.body.expenseDate || Number.isNaN(expenseDate.getTime()) ||
        expenseDate > new Date() || category.length > 60 || note.length > 500) {
      return res.status(400).redirect('/admin/thu-chi?error=invalid');
    }

    await Expense.create({
      title, category, amount, expenseDate, note,
      createdBy: req.user._id
    });
    return res.redirect('/admin/thu-chi?saved=1');
  } catch (err) {
    next(err);
  }
});

// Admin chỉ được xóa tài khoản user thường, không thể tự xóa mình hoặc xóa admin khác.
router.post('/users/:id/delete', async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).redirect('/admin/users?error=invalid');
    }

    if (String(req.user._id) === String(userId)) {
      return res.status(400).redirect('/admin/users?error=self');
    }

    const account = await User.findById(userId);
    if (!account) return res.redirect('/admin/users?error=notfound');

    if (account.role === 'admin') {
      return res.status(403).redirect('/admin/users?error=admin');
    }

    // Không xóa tài khoản khi người đó vẫn còn sách chưa trả.
    const activeBorrow = await Borrow.exists({
      user: account._id,
      status: { $in: ['borrowing', 'overdue'] }
    });
    if (activeBorrow) {
      return res.status(409).redirect('/admin/users?error=active');
    }

    // Xóa lịch sử mượn của tài khoản cùng lúc để không để lại dữ liệu tham chiếu mồ côi.
    await Borrow.deleteMany({ user: account._id });
    await Cart.deleteMany({ user: account._id });
    await User.findByIdAndDelete(account._id);

    return res.redirect('/admin/users?deleted=1');
  } catch (err) {
    next(err);
  }
});

// ===== Quản lý đơn hàng (đơn mua sách từ giỏ hàng) =====
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await Order.find().populate('user', 'name email')
      .sort({ createdAt: -1 }).limit(200).lean();
    res.render('admin/orders', { title: 'Quản lý đơn hàng', user: req.user, orders });
  } catch (err) { next(err); }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(404).render('error', { status: 404, title: 'Không tìm thấy đơn hàng' });
    }
    const order = await Order.findById(req.params.id).select('-fingerprint')
      .populate('user', 'name email').lean();
    if (!order) {
      return res.status(404).render('error', { status: 404, title: 'Không tìm thấy đơn hàng' });
    }
    res.render('admin/order-detail', {
      title: 'Chi tiết đơn hàng', user: req.user, order,
      nextStatuses: orderStatus.nextOf(order.status)
    });
  } catch (err) { next(err); }
});

// Đổi trạng thái theo luồng hợp lệ. Cập nhật có điều kiện để 2 admin thao tác cùng lúc không ghi đè nhau.
router.post('/orders/:id/status', async (req, res, next) => {
  try {
    const id = req.params.id;
    const target = String(req.body.status || '');
    if (!mongoose.isObjectIdOrHexString(id) || !orderStatus.STATUSES.includes(target)) {
      return res.status(400).render('error', { status: 400, title: 'Yêu cầu không hợp lệ' });
    }
    const allowedFrom = orderStatus.STATUSES.filter((from) => orderStatus.canMove(from, target));
    const set = { status: target };
    if (target === 'cancelled') {
      set.cancelledAt = new Date();
      set.cancelledBy = 'admin';
    }
    const updated = await Order.findOneAndUpdate(
      { _id: id, status: { $in: allowedFrom } },
      { $set: set },
      { returnDocument: 'after' }
    );
    if (!updated) {
      return res.status(409).render('error', {
        status: 409, title: 'Không thể đổi trạng thái',
        message: 'Đơn không tồn tại hoặc trạng thái hiện tại không cho phép chuyển sang bước này.'
      });
    }
    return res.redirect(303, '/admin/orders/' + id);
  } catch (err) { next(err); }
});

module.exports = router;
