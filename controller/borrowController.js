const Borrow = require('../models/borrow');
const Book = require('../models/book');

// Mượn sách
exports.borrowBook = async (req, res) => {
  try {
    const { bookId, dueDate } = req.body;
<<<<<<< HEAD
    const userId = req.user._id;
    const parsedDueDate = new Date(dueDate);
    if (!bookId || !dueDate || Number.isNaN(parsedDueDate.getTime()) || parsedDueDate < new Date(new Date().toDateString())) {
      return res.status(400).send('Ngày hẹn trả không hợp lệ. Vui lòng quay lại và chọn ngày hôm nay hoặc ngày sau.');
    }
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).send('Không tìm thấy sách.');
    const userActiveBorrow = await Borrow.findOne({ user: userId, book: bookId, status: { $in: ['borrowing', 'overdue'] } });
    if (userActiveBorrow) return res.redirect('/borrow/my');
=======
    const userId = req.user._id; // Giả sử bạn đã có middleware xác thực người dùng
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0

    // Kiểm tra sách có đang được mượn không
    const existingBorrow = await Borrow.findOne({
      book: bookId,
<<<<<<< HEAD
      status: { $in: ['borrowing', 'overdue'] }
=======
      status: 'borrowing'
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0
    });
    if (existingBorrow) {
      return res.status(400).json({ message: 'Sách đang được mượn bởi người khác' });
    }

    // Tạo bản ghi mượn
    const borrow = new Borrow({
      user: userId,
      book: bookId,
<<<<<<< HEAD
      dueDate: parsedDueDate,
      dailyRentalFee: Number(book.dailyRentalFee) || 5000
=======
      dueDate: dueDate
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0
    });
    await borrow.save();

    res.redirect('/borrow/my');
  } catch (err) {
    console.error('Lỗi mượn sách:', err);
    res.status(500).json({ message: 'Không thể mượn sách' });
  }
};

// Xem danh sách sách mình đã mượn
exports.getMyBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find({ user: req.user._id })
      .populate('book')
      .sort({ borrowDate: -1 });
<<<<<<< HEAD
    const now = new Date();
    for (const item of borrows) {
      if (item.status === 'borrowing' && item.dueDate < now) {
        item.status = 'overdue';
        await item.save();
      }
      const elapsed = Math.max(0, now.getTime() - new Date(item.borrowDate).getTime());
      item.calculatedRentalDays = item.status === 'returned'
        ? (item.rentalDays || 1)
        : Math.max(1, Math.ceil(elapsed / 86400000));
      item.calculatedRentalFee = item.status === 'returned'
        ? (item.totalRentalFee || 0)
        : item.calculatedRentalDays * (Number(item.dailyRentalFee) || 5000);
    }

    const activeBorrows = borrows.filter(item => ['borrowing', 'overdue'].includes(item.status));
    const returnedBorrows = borrows.filter(item => item.status === 'returned');

    res.render('borrow/my-borrows', {
      title: 'Sách của tôi',
      borrows,
      activeBorrows,
      returnedBorrows,
      returnedSuccessfully: req.query.returned === '1'
=======

    res.render('borrow/my-borrows', {
      title: 'Sách tôi đã mượn',
      borrows
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0
    });
  } catch (err) {
    console.error('Lỗi xem danh sách mượn:', err);
    res.status(500).render('error', { message: 'Không tải được danh sách' });
  }
};

<<<<<<< HEAD
// Trả sách: chỉ chủ lượt mượn đang hoạt động mới được xác nhận trả.
exports.returnBook = async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) {
      return res.status(404).render('error', {
        title: 'Không tìm thấy lượt mượn',
        message: 'Lượt mượn không hợp lệ hoặc không tồn tại.'
      });
    }

    const activeStatuses = ['borrowing', 'overdue'];
    const borrow = await Borrow.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: { $in: activeStatuses }
    });

    if (!borrow) {
      return res.status(404).render('error', {
        title: 'Không thể trả sách',
        message: 'Không tìm thấy lượt mượn đang hoạt động của bạn. Sách có thể đã được trả trước đó.'
      });
    }

    // Chốt phí theo số ngày thực tế, tối thiểu 1 ngày.
    const returnedAt = new Date();
    const borrowedAt = new Date(borrow.borrowDate);
    const rentalDays = Math.max(1, Math.ceil((returnedAt.getTime() - borrowedAt.getTime()) / 86400000));
    const dailyRentalFee = Number.isFinite(Number(borrow.dailyRentalFee))
      ? Number(borrow.dailyRentalFee)
      : 5000;

    // Điều kiện status trong câu lệnh cập nhật giúp tránh ghi nhận trả hai lần.
    const updatedBorrow = await Borrow.findOneAndUpdate(
      {
        _id: borrow._id,
        user: req.user._id,
        status: { $in: activeStatuses }
      },
      {
        $set: {
          returnDate: returnedAt,
          rentalDays,
          totalRentalFee: rentalDays * dailyRentalFee,
          status: 'returned'
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedBorrow) {
      return res.status(409).render('error', {
        title: 'Lượt mượn đã được xử lý',
        message: 'Lượt mượn này vừa được cập nhật. Vui lòng tải lại danh sách.'
      });
    }

    return res.redirect(303, '/borrow/my?returned=1');
  } catch (err) {
    console.error('Lỗi trả sách:', err);
    return res.status(500).render('error', {
      title: 'Không thể trả sách',
      message: 'Đã xảy ra lỗi khi trả sách. Vui lòng thử lại.'
    });
=======
// Trả sách
exports.returnBook = async (req, res) => {
  try {
    const borrow = await Borrow.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'borrowing'
    });

    if (!borrow) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi mượn' });
    }

    // Cập nhật thông tin trả sách
    borrow.returnDate = Date.now();
    borrow.status = 'returned';
    await borrow.save();

    res.redirect('/borrow/my');
  } catch (err) {
    console.error('Lỗi trả sách:', err);
    res.status(500).json({ message: 'Không thể trả sách' });
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0
  }
};

// [Admin] Xem tất cả lượt mượn
exports.getAllBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find()
      .populate('user', 'email name')
      .populate('book', 'title')
      .sort({ borrowDate: -1 });

    res.render('borrow/all-borrows', {
      title: 'Tất cả lượt mượn',
      borrows
    });
  } catch (err) {
    console.error('Lỗi xem tất cả mượn:', err);
    res.status(500).render('error');
  }
};
