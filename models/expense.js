const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, trim: true, default: 'Khác', maxlength: 60 },
  amount: { type: Number, required: true, min: 1 },
  expenseDate: { type: Date, required: true, default: Date.now },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
