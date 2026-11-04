const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
  // Ai mượn
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Sách được mượn
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  // Ngày mượn
  borrowDate: {
    type: Date,
    default: Date.now
  },
  // Ngày hẹn trả
  dueDate: {
    type: Date,
    required: true
  },
  // Ngày trả (nếu đã trả)
  returnDate: {
    type: Date,
    default: null
  },
  // Trạng thái
  status: {
    type: String,
    enum: ['borrowing', 'returned', 'overdue'],
    default: 'borrowing'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Borrow', borrowSchema);
