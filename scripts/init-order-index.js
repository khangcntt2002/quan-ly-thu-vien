require('dotenv').config();
// Node trên máy này dùng DNS 127.0.0.1 nên không tra được địa chỉ mongodb+srv của Atlas
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Order = require('../models/order');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Order.init();
    console.log('Đã tạo index user + requestId cho orders.');
  } finally { await mongoose.disconnect(); }
})().catch(() => {
  console.error('Chưa tạo được index. Kiểm tra kết nối MongoDB.');
  process.exitCode = 1;
});
