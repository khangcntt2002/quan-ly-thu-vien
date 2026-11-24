require('dotenv').config();
// Giống app.js: dùng DNS công cộng để tra được địa chỉ mongodb+srv của Atlas
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const User = require('../models/mongoUser');

async function seed() {
  const email = (process.env.ADMIN_EMAIL || '').trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.startsWith('THAY_'))
    throw new Error('Cau hinh email va mat khau admin');
  await mongoose.connect(process.env.MONGO_URI);
  await User.init();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin')
      throw new Error('Email da la user, hay chon email khac');
    console.log('Admin da ton tai, khong doi mat khau.');
    return;
  }
  // Model tự băm mật khẩu trong pre save, không hash thủ công ở đây
  await User.create({
    name: 'Quan tri vien', email, password, role: 'admin'
  });
  console.log('Da tao admin:', email);
}

seed().catch((err) => {
  console.error('Seed that bai:', err.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
