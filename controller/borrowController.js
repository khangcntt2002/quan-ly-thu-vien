const Borrow = require('../models/borrow');
const Book = require('../models/book');

// Mượn sách
exports.borrowBook = async (req, res) => {
  try {
    const { bookId, dueDate } = req.body;
    const userId = req.user._id; // Giả sử bạn đã có middleware xác thực người dùng

    // Kiểm tra sách có đang được mượn không
    const existingBorrow = await Borrow.findOne({
      book: bookId,
      status: 'borrowing'
    });
    if (existingBorrow) {
      return res.status(400).json({ message: 'Sách đang được mượn bởi người khác' });
    }

    // Tạo bản ghi mượn
    const borrow = new Borrow({
      user: userId,
      book: bookId,
      dueDate: dueDate
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

    res.render('borrow/my-borrows', {
      title: 'Sách tôi đã mượn',
      borrows
    });
  } catch (err) {
    console.error('Lỗi xem danh sách mượn:', err);
    res.status(500).render('error', { message: 'Không tải được danh sách' });
  }
};

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
