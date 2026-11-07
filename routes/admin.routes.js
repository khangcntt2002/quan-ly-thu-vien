const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const Book = require('../models/book');
const User = require('../models/mongoUser');
const Borrow = require('../models/borrow');

router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res, next) => {
  try {
    const [bookCount, userCount, borrowCount, activeBorrowCount, books] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments(),
      Borrow.countDocuments(),
      Borrow.countDocuments({ status: 'borrowing' }),
      Book.find().sort({ createdAt: -1 }).limit(8).lean()
    ]);
    res.render('admin/index', {
      title: 'Quản trị hệ thống', user: req.user,
      stats: { books: bookCount, users: userCount, borrows: borrowCount, activeBorrows: activeBorrowCount },
      books
    });
  } catch (err) { next(err); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).lean();
    res.render('admin/users', { title: 'Quản lý tài khoản', user: req.user, users });
  } catch (err) { next(err); }
});

module.exports = router;
