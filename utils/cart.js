const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const Cart = require('../models/cart');

// Giỏ hàng lưu trong MongoDB (collection carts), không còn dùng cookie bookCart.

// Lỗi 400 với thông báo an toàn để hiển thị cho người dùng
function invalid(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  throw err;
}

function validPrice(price) {
  return Number.isSafeInteger(price) && price >= 0;
}

// Đọc danh sách { bookId, qty } từ chuỗi JSON của form (hidden input "items").
// Chỉ giữ bookId + qty, bỏ mọi trường lạ (price, total...) từ client.
function parseItems(raw) {
  let items;
  try { items = JSON.parse(raw); }
  catch { invalid('Giỏ hàng không đúng định dạng.'); }
  if (!Array.isArray(items) || items.length > 20) {
    invalid('Giỏ hàng tối đa 20 đầu sách.');
  }
  const rows = items.map(item => {
    if (!item || typeof item.bookId !== 'string' ||
        !mongoose.isObjectIdOrHexString(item.bookId) ||
        !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 10) {
      invalid('Sách hoặc số lượng không hợp lệ.');
    }
    return { bookId: item.bookId.toLowerCase(), qty: item.qty };
  });
  if (new Set(rows.map(x => x.bookId)).size !== rows.length) {
    invalid('Một sách chỉ được xuất hiện một dòng.');
  }
  return sortRows(rows);
}

const sortRows = rows => rows.sort((a, b) => a.bookId.localeCompare(b.bookId));

// Chuyển items của document Cart sang dạng { bookId, qty } đã sắp xếp
function rowsOf(cart) {
  return sortRows((cart?.items || []).map(x => ({
    bookId: String(x.book), qty: x.qty
  })));
}

// Lấy giỏ của user; chưa có thì trả giỏ trống (chưa lưu DB)
async function load(userId) {
  return await Cart.findOne({ user: userId }) ||
    new Cart({ user: userId, items: [], requestId: randomUUID() });
}

// Sửa giỏ rồi lưu; mỗi lần đổi giỏ tạo requestId mới.
// Hai request sửa cùng lúc: request sau bị VersionError => báo người dùng thử lại.
async function update(userId, change) {
  const cart = await load(userId);
  change(cart);
  cart.requestId = randomUUID();
  try {
    await cart.save();
  } catch (err) {
    if (err.name === 'VersionError' || err.code === 11000) {
      invalid('Giỏ hàng vừa được cập nhật ở nơi khác. Vui lòng thử lại.', 409);
    }
    throw err;
  }
  return cart;
}

module.exports = { Cart, invalid, validPrice, parseItems, rowsOf, load,
  update, randomUUID };
