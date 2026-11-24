const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0, min: 0, max: 5 },
  lastSentAt: { type: Date, required: true },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expireAfterSeconds: 0 } // Tự động xóa khi hết hạn
  }
}, { timestamps: true });

module.exports = mongoose.model('PendingRegistration', schema);
