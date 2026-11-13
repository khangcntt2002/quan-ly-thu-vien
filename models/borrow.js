const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  borrowDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  dailyRentalFee: { type: Number, min: 0, default: 5000 },
  paidDays: { type: Number, min: 1, default: 1 },
  paidAmount: { type: Number, min: 0, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'paid' },
  paymentDate: { type: Date, default: null },
  lateDays: { type: Number, min: 0, default: 0 },
  lateFee: { type: Number, min: 0, default: 0 },
  rentalDays: { type: Number, min: 0, default: 0 },
  totalRentalFee: { type: Number, min: 0, default: 0 },
  returnDate: { type: Date, default: null },
  status: { type: String, enum: ['borrowing', 'returned', 'overdue'], default: 'borrowing' }
}, { timestamps: true });

module.exports = mongoose.model('Borrow', borrowSchema);
