const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true,
    maxlength: 99 },
  email: { type: String, required: true, unique: true,
    lowercase: true, trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'],
    default: 'user' }
}, { timestamps: true });
 
schema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const bytes = Buffer.byteLength(this.password, 'utf8');
  if (this.password.length < 8 || bytes > 72) {
    throw new Error('Mat khau phai tu 8 ky tu, toi da 72 byte');
  }
  this.password = await bcrypt.hash(this.password, 10);
});
 
schema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};
module.exports = mongoose.model('User', schema);
