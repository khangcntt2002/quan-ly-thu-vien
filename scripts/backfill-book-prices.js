require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/book');
const prices = new Map([
  ['JavaScript: The Definitive Guide', 294000], ['Learning React', 260000],
  ['Node.js Design Patterns', 175000], ['Introduction to Algorithms', 1250000],
  ['The Art of Unit Testing', 320000], ['Refactoring: Improving the Design of Existing Code', 390000],
  ["You Don't Know JS: ES6 & Beyond", 220000], ['Python Crash Course', 290000],
  ['The Pragmatic Thinking and Learning', 280000], ['Domain-Driven Design', 420000],
  ['1984', 120000], ['Animal Farm', 95000], ['The Hobbit', 180000], ['Fahrenheit 451', 125000],
  ['The Alchemist', 135000], ['Crime and Punishment', 190000], ['The Catcher in the Rye', 145000],
  ['One Hundred Years of Solitude', 210000], ["Man's Search for Meaning", 145000],
  ['The 7 Habits of Highly Effective People', 220000], ['Thinking, Fast and Slow', 260000],
  ['Flow: The Psychology of Optimal Experience', 250000], ['The Richest Man in Babylon', 120000],
  ['Think and Grow Rich', 135000], ['The Intelligent Investor', 320000], ['Educated', 190000],
  ['Factfulness', 210000], ['The Laws of Human Nature', 280000], ['Atomic Habits', 180000],
  ['The Power of Habit', 190000]
]);
(async () => {
  if (!process.env.MONGO_URI) throw new Error('Thiếu MONGO_URI trong .env');
  await mongoose.connect(process.env.MONGO_URI);
  // Chỉ cập nhật trường price bằng updateOne, không gọi save() trên toàn bộ
  // document. Nhờ vậy dữ liệu cũ có menuCategory không còn nằm trong enum
  // sẽ không làm quá trình cập nhật giá bị lỗi validation.
  const books = await Book.find(
    { $or: [{ price: { $exists: false } }, { price: 0 }, { price: null }] },
    { _id: 1, title: 1 }
  ).lean();

  let updated = 0;
  for (const book of books) {
    const price = prices.get(book.title) || 200000;
    const result = await Book.updateOne(
      { _id: book._id },
      { $set: { price } },
      { runValidators: false }
    );
    updated += result.modifiedCount || 0;
  }
  console.log(`Đã cập nhật giá cho ${updated}/${books.length} sách.`);
  await mongoose.disconnect();
})().catch(async err => { console.error(err); await mongoose.disconnect(); process.exit(1); });
