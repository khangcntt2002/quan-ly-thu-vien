const mongoose = require('mongoose');
const { STATUSES } = require('../utils/order-status');

// Mỗi dòng đơn tham chiếu Book nhưng chụp lại title + unitPrice lúc đặt,
// để đổi tên/giá sách sau này không làm sai đơn cũ.
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true, index: true },
  requestId: { type: String, required: true },
  fingerprint: { type: String, required: true },
  address: { type: String, required: true, maxlength: 300 },
  items: [{
    _id: false,
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    title: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 10 }
  }],
  total: { type: Number, required: true, min: 0 },
  // pending → confirmed → shipping → completed; cancelled khi bị hủy
  status: { type: String, enum: STATUSES, default: 'pending', index: true },
  // Hủy đơn không xóa document: chỉ lưu thời điểm và người hủy
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: String, enum: ['user', 'admin', null], default: null }
}, { timestamps: true, collection: 'orders' });

// Chặn 2 request đồng thời cùng requestId tạo 2 đơn
orderSchema.index({ user: 1, requestId: 1 }, { unique: true });

module.exports = mongoose.model('Order', orderSchema);
