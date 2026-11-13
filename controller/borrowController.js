const Borrow = require('../models/borrow');
const Book = require('../models/book');
const mongoose = require('mongoose');

const DAY = 86400000;
const DEFAULT_DAILY_FEE = 5000;

function parseDueDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(year, month - 1, day);
  if (selected < today) return null;
  return date;
}

function getPaidDays(dueDate) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.max(1, Math.round((end - start) / DAY) + 1);
}

function getLateDays(dueDate, now = new Date()) {
  const dueEnd = new Date(dueDate);
  if (now <= dueEnd) return 0;
  return Math.ceil((now - dueEnd) / DAY);
}

// Trang xem lại khoản phí trước khi thanh toán.
exports.getPaymentPage = async (req, res) => {
  try {
    const { bookId, dueDate } = req.query;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).render('error', { title: 'Thông tin không hợp lệ', message: 'Không tìm thấy sách cần mượn.' });
    }
    const parsedDueDate = parseDueDate(dueDate);
    if (!parsedDueDate) {
      return res.status(400).render('error', { title: 'Ngày trả không hợp lệ', message: 'Vui lòng quay lại và chọn ngày trả hợp lệ.' });
    }
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).render('error', { title: 'Không tìm thấy sách', message: 'Cuốn sách này không còn tồn tại.' });

    const activeBorrow = await Borrow.findOne({ book: bookId, status: { $in: ['borrowing', 'overdue'] } });
    if (activeBorrow) return res.status(409).render('error', { title: 'Sách đang được mượn', message: 'Sách này hiện đang được người khác mượn.' });

    const dailyRentalFee = Number(book.dailyRentalFee) || DEFAULT_DAILY_FEE;
    const paidDays = getPaidDays(parsedDueDate);
    res.render('borrow/payment', {
      title: 'Thanh toán phí mượn sách',
      book,
      dueDate: parsedDueDate,
      dueDateInput: String(dueDate),
      paidDays,
      dailyRentalFee,
      totalAmount: paidDays * dailyRentalFee
    });
  } catch (err) {
    console.error('Lỗi mở trang thanh toán:', err);
    res.status(500).render('error', { title: 'Lỗi thanh toán', message: 'Không thể tải trang thanh toán.' });
  }
};

// Demo: xác nhận thanh toán giả lập rồi mới tạo lượt mượn.
exports.confirmPayment = async (req, res) => {
  try {
    const { bookId, dueDate } = req.body;
    if (!mongoose.isValidObjectId(bookId)) {
      return res.status(400).render('error', { title: 'Thông tin không hợp lệ', message: 'Mã sách không hợp lệ.' });
    }
    const parsedDueDate = parseDueDate(dueDate);
    if (!parsedDueDate) {
      return res.status(400).render('error', { title: 'Ngày trả không hợp lệ', message: 'Ngày trả đã qua hoặc không hợp lệ. Vui lòng chọn lại.' });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).render('error', { title: 'Không tìm thấy sách', message: 'Cuốn sách này không còn tồn tại.' });

    const alreadyBorrowing = await Borrow.findOne({
      user: req.user._id, book: bookId, status: { $in: ['borrowing', 'overdue'] }
    });
    if (alreadyBorrowing) return res.redirect('/borrow/my');

    const existingBorrow = await Borrow.findOne({ book: bookId, status: { $in: ['borrowing', 'overdue'] } });
    if (existingBorrow) {
      return res.status(409).render('error', { title: 'Sách đang được mượn', message: 'Sách vừa được người khác mượn. Khoản thanh toán demo chưa được ghi nhận.' });
    }

    const dailyRentalFee = Number(book.dailyRentalFee) || DEFAULT_DAILY_FEE;
    const paidDays = getPaidDays(parsedDueDate);
    const paidAmount = paidDays * dailyRentalFee;

    await Borrow.create({
      user: req.user._id,
      book: bookId,
      dueDate: parsedDueDate,
      dailyRentalFee,
      paidDays,
      paidAmount,
      paymentStatus: 'paid',
      paymentDate: new Date()
    });

    return res.redirect('/borrow/my?borrowed=1');
  } catch (err) {
    console.error('Lỗi xác nhận thanh toán:', err);
    return res.status(500).render('error', { title: 'Không thể hoàn tất', message: 'Đã xảy ra lỗi khi xác nhận thanh toán.' });
  }
};

// Xem danh sách sách mình đã mượn.
exports.getMyBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find({ user: req.user._id })
      .populate('book')
      .sort({ borrowDate: -1 });

    const now = new Date();
    for (const item of borrows) {
      const lateDays = item.status === 'returned'
        ? (item.lateDays || 0)
        : getLateDays(item.dueDate, now);

      if (item.status === 'borrowing' && lateDays > 0) {
        item.status = 'overdue';
        await item.save();
      }
      item.calculatedLateDays = lateDays;
      item.calculatedLateFee = lateDays * (Number(item.dailyRentalFee) || DEFAULT_DAILY_FEE);
      item.calculatedRentalDays = item.paidDays || 1;
      item.calculatedRentalFee = (item.paidAmount || 0) + item.calculatedLateFee;
    }

    const activeBorrows = borrows.filter(item => ['borrowing', 'overdue'].includes(item.status));
    const returnedBorrows = borrows.filter(item => item.status === 'returned');

    res.render('borrow/my-borrows', {
      title: 'Sách của tôi',
      borrows,
      activeBorrows,
      returnedBorrows,
      returnedSuccessfully: req.query.returned === '1',
      borrowedSuccessfully: req.query.borrowed === '1'
    });
  } catch (err) {
    console.error('Lỗi xem danh sách mượn:', err);
    res.status(500).render('error', { message: 'Không tải được danh sách' });
  }
};

// Trả sách và chốt phụ thu nếu quá hạn.
exports.returnBook = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).render('error', { title: 'Không tìm thấy lượt mượn', message: 'Lượt mượn không hợp lệ hoặc không tồn tại.' });
    }

    const activeStatuses = ['borrowing', 'overdue'];
    const borrow = await Borrow.findOne({
      _id: req.params.id, user: req.user._id, status: { $in: activeStatuses }
    });
    if (!borrow) {
      return res.status(404).render('error', { title: 'Không thể trả sách', message: 'Không tìm thấy lượt mượn đang hoạt động của bạn.' });
    }

    const returnedAt = new Date();
    const lateDays = getLateDays(borrow.dueDate, returnedAt);
    const lateFee = lateDays * (Number(borrow.dailyRentalFee) || DEFAULT_DAILY_FEE);
    const paidAmount = Number(borrow.paidAmount) || 0;

    const updatedBorrow = await Borrow.findOneAndUpdate(
      { _id: borrow._id, user: req.user._id, status: { $in: activeStatuses } },
      { $set: {
        returnDate: returnedAt,
        lateDays,
        lateFee,
        rentalDays: Number(borrow.paidDays) || 1,
        totalRentalFee: paidAmount + lateFee,
        status: 'returned'
      }},
      { new: true, runValidators: true }
    );

    if (!updatedBorrow) {
      return res.status(409).render('error', { title: 'Lượt mượn đã được xử lý', message: 'Vui lòng tải lại danh sách.' });
    }
    return res.redirect(303, '/borrow/my?returned=1');
  } catch (err) {
    console.error('Lỗi trả sách:', err);
    return res.status(500).render('error', { title: 'Không thể trả sách', message: 'Đã xảy ra lỗi khi trả sách.' });
  }
};

// [Admin] Xem tất cả lượt mượn.
exports.getAllBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find()
      .populate('user', 'email name')
      .populate('book', 'title')
      .sort({ borrowDate: -1 });
    res.render('borrow/all-borrows', { title: 'Tất cả lượt mượn', borrows });
  } catch (err) {
    console.error('Lỗi xem tất cả mượn:', err);
    res.status(500).render('error');
  }
};
