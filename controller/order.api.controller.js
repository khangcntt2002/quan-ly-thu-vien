const crypto = require('crypto');
const result = require('../utils/response');
const { sendOrderConfirmationEmail } = require('../config/mailer');

// Đơn hàng mẫu dùng khi body không gửi items
const SAMPLE_ITEMS = [
  { name: 'Atomic Habits', quantity: 1, price: 180000 },
  { name: 'Node.js Design Patterns', quantity: 2, price: 175000 },
  { name: 'Dịch vụ bọc sách', quantity: 1, price: 20000 }
];

const SERVICE = {
  shipping: 'Giao hàng tiêu chuẩn (2-3 ngày làm việc)',
  shippingFee: 30000,
  payment: 'Thanh toán khi nhận hàng (COD)',
  warranty: 'Đổi trả trong 7 ngày nếu sách lỗi in'
};

const isText = (v, max) => typeof v === 'string' && v.trim() !== '' && v.length <= max;
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

// Trả về danh sách lỗi; giá luôn do server tính, không tin "total" từ client
function validate(body) {
  const errors = [];
  if (body.items !== undefined) {
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
      errors.push('items phai la mang tu 1 den 20 phan tu');
    } else {
      body.items.forEach((it, i) => {
        if (!it || !isText(it.name, 100)) errors.push(`items[${i}].name khong hop le`);
        if (!isInt(it?.quantity, 1, 99)) errors.push(`items[${i}].quantity phai la so nguyen 1-99`);
        if (!isInt(it?.price, 0, 1000000000)) errors.push(`items[${i}].price phai la so nguyen >= 0`);
      });
    }
  }
  if (body.address !== undefined && !isText(body.address, 200))
    errors.push('address toi da 200 ky tu');
  if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 300))
    errors.push('note toi da 300 ky tu');
  if (body.to !== undefined && (typeof body.to !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to.trim())))
    errors.push('to phai la email hop le');
  return errors;
}

function buildOrder(body, user) {
  const items = (body.items || SAMPLE_ITEMS).map((it) => ({
    name: it.name.trim(),
    quantity: it.quantity,
    price: it.price,
    lineTotal: it.quantity * it.price
  }));
  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  return {
    code: `DH${ymd}-${crypto.randomInt(1000, 10000)}`,
    createdAt: now.toISOString(),
    customer: {
      name: user.name,
      email: user.email,
      address: body.address?.trim() || 'Chưa cung cấp'
    },
    items,
    service: SERVICE,
    subtotal,
    total: subtotal + SERVICE.shippingFee,
    note: body.note?.trim() || ''
  };
}

// GET /api/v1/orders/sample => xem trước đơn hàng mẫu, không gửi mail
exports.sample = (req, res) => {
  return result.ok(res, buildOrder({}, req.user));
};

// POST /api/v1/orders => tạo đơn (mẫu) và gửi email xác nhận
// Người nhận: email của tài khoản đăng nhập. Chỉ admin được gửi tới email khác qua "to"
exports.create = async (req, res) => {
  const body = req.body || {};
  const errors = validate(body);
  if (errors.length) return result.fail(res, 400, 'Du lieu don hang khong hop le', errors);
  if (body.to !== undefined && req.user.role !== 'admin')
    return result.fail(res, 403, 'Chi admin duoc gui toi email khac');

  const order = buildOrder(body, req.user);
  const sentTo = body.to ? body.to.trim().toLowerCase() : req.user.email;
  try {
    const info = await sendOrderConfirmationEmail(sentTo, order);
    return result.create(res, { order, sentTo, messageId: info.messageId });
  } catch (err) {
    console.error('Gui email don hang that bai:', err.code || err.message);
    return result.fail(res, 502, 'Khong gui duoc email xac nhan');
  }
};
