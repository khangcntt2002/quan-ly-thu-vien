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
 
exports.requireSameOrigin = (req, res, next) => {
  if (req.get('origin') === origin) return next();
  return res.status(403).render('error', {
    status: 403,
    title: 'Yêu cầu bị từ chối',
    message: 'Nguồn gửi biểu mẫu không hợp lệ.'
  });
};

