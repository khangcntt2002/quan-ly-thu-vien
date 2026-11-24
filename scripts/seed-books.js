require('dotenv').config();
// Giống app.js: có thể dùng DNS công cộng để tra được địa chỉ mongodb+srv của Atlas
if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
}
const mongoose = require('mongoose');
const Book = require('../models/book');
const books = require('../data/books.json');

// Nạp sách mẫu từ data/books.json. Chạy lại không tạo trùng (so theo tên sách).
async function seed() {
  if (!process.env.MONGO_URI) throw new Error('Thieu MONGO_URI trong .env');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Database:', mongoose.connection.name);

  let created = 0;
  for (const item of books) {
    if (await Book.exists({ title: item.title })) continue;
    await Book.create(item);
    created += 1;
  }
  console.log(`Da them ${created} sach moi, tong so sach: ${await Book.countDocuments()}`);
}

seed().catch((err) => {
  console.error('Seed that bai:', err.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
