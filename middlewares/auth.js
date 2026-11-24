const mongoose = require('mongoose');
const User = require('../models/mongoUser');
const { verifyToken } = require('../utils/jwt');
const { clearTokenCookie } = require('../utils/cookies');
const { origin } = require('../utils/auth-config');
 
exports.loadUser = async (req, res, next) => {
  req.user = null;
  res.locals.user = null;
  const token = req.cookies.token;
  if (!token) return next();
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    clearTokenCookie(res);
    return next();
  }
  if (!payload || typeof payload !== 'object')
     {
    clearTokenCookie(res);
    return next();
  }
  try {
    const user = await User.findById(payload.id).lean();
    //payload= {id,name,email,address}
    //

    if (!user) clearTokenCookie(res);
    req.user = user;
    res.locals.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};
exports.requireAuth = (req, res, next) => {
  if (req.user) return next();
  const target = encodeURIComponent(req.originalUrl);
  return res.redirect('/login?next=' + target);
};
 
exports.requireRole = (...roles) => (req, res, next) => {
  if (roles.includes(req.user?.role)) return next();
  return res.status(403).render('403', {
    title: 'Không có quyền truy cập'
  });
};
 
// Trình duyệt luôn gửi header Origin khi POST từ trang web. Có Origin thì phải đúng
// APP_ORIGIN; không có Origin (Postman, curl) thì cho qua vì không phải CSRF từ trình duyệt.
exports.requireSameOrigin = (req, res, next) => {
  const sent = req.get('origin');
  if (!sent || sent === origin) return next();
  // Trình duyệt hiện đại cho biết yêu cầu cùng nguồn bằng Sec-Fetch-Site (không giả mạo được từ trang khác).
  if (req.get('sec-fetch-site') === 'same-origin') return next();
  // Chấp nhận Origin cùng host với địa chỉ đang truy cập (localhost, 127.0.0.1, tên miền deploy...),
  // để không bị chặn khi APP_ORIGIN trong .env đặt khác với địa chỉ mở trên trình duyệt.
  try {
    if (new URL(sent).host === req.get('host')) return next();
  } catch { /* Origin không hợp lệ: rơi xuống trả 403 */ }
  return res.status(403).render('error', {
    status: 403,
    title: 'Yêu cầu bị từ chối',
    message: 'Nguồn gửi biểu mẫu không hợp lệ.'
  });
};

// ===== API: xác thực bằng header "Authorization: Bearer <token>" =====
async function bearerUser(req) {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) return { status: 401, message: 'Can Bearer token' };
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return { status: 401, message: 'Token sai hoac het han' };
  }
  if (!payload || !mongoose.isObjectIdOrHexString(payload.id)) {
    return { status: 401, message: 'Token sai' };
  }
  const user = await User.findById(payload.id).lean();
  if (!user) return { status: 401, message: 'Tai khoan khong con' };
  return { user };
}

// Cần đăng nhập; gán req.user
exports.checkToken = async (req, res, next) => {
  try {
    const r = await bearerUser(req);
    if (r.user) {
      req.user = r.user;
      return next();
    }
    return res.status(r.status).json({ success: false, message: r.message });
  } catch (err) {
    return next(err);
  }
};

// Cần đăng nhập và là admin
exports.checkAdmin = async (req, res, next) => {
  try {
    const r = await bearerUser(req);
    if (!r.user) return res.status(r.status).json({ success: false, message: r.message });
    if (r.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chi admin duoc phep' });
    }
    req.user = r.user;
    return next();
  } catch (err) {
    return next(err);
  }
};
