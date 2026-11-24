const mongoose = require('mongoose');

// Mỗi user có đúng 1 giỏ (unique). Dòng giỏ chỉ lưu tham chiếu Book + số lượng;
// tên và giá luôn đọc lại từ Book nên không bị client sửa.
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User',
    required: true, unique: true },
  items: {
    type: [{
      _id: false,
      book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
      qty: { type: Number, required: true, min: 1, max: 10,
        validate: Number.isSafeInteger }
    }],
    validate: { validator: v => v.length <= 20,
      message: 'Giỏ hàng tối đa 20 đầu sách.' }
  },
  // Mã của "phiên bản giỏ" hiện tại; đổi mỗi lần giỏ thay đổi.
  // Form đặt hàng gửi kèm mã này để chống gửi lặp và phát hiện giỏ đã đổi.
  requestId: { type: String, required: true }
}, {
  timestamps: true,
  collection: 'carts',
  // save() sẽ lỗi VersionError nếu giỏ vừa bị request khác sửa
  optimisticConcurrency: true
});

module.exports = mongoose.model('Cart', cartSchema);
