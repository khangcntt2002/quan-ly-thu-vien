const User = require('../models/mongoUser');
const { signToken } = require('../utils/jwt');
const { setTokenCookie, clearTokenCookie } = require('../utils/cookies');
const text = (v) => typeof v === 'string' ? v : '';
const emailOf = (v) => text(v).trim().toLowerCase();
const safeNext = (v) => v === '/admin' ? '/admin' : '/';

exports.registerForm = (req, res) => {
  res.render('auth/register', {
    title: 'Đăng ký', error: null, old: {}
  });
};
exports.loginForm = (req, res) => {
  res.render('auth/login', {
    title: 'Đăng nhập', error: null, old: {},
    nextPath: safeNext(req.query.next)
  });
};
function registerError(old, password, confirm) {
  if (!old.name || old.name.length > 80)
    return 'Họ tên bắt buộc và tối đa 80 ký tự.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(old.email))
    return 'Email không hợp lệ.';
  if (password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72)
    return 'Mật khẩu từ 8 ký tự và tối đa 72 byte UTF-8.';
  if (password !== confirm)
    return 'Mật khẩu nhập lại không khớp.';
  return null;
}

// register
exports.register = async (req, res, next) => {
  const body = req.body || {};
  const old = {
    name: text(body.name).trim(),
    email: emailOf(body.email)
  };
  const password = text(body.password);
  const confirm = text(body.confirm);
  const fail = (message) => res.status(400).render(
    'auth/register', { title: 'Đăng ký', error: message, old }
  );
  const error = registerError(old, password, confirm);
  if (error) return fail(error);
  try {
    if (await User.exists({ email: old.email }))
      return fail('Email đã được sử dụng.');
    const user = await User.create({
      name: old.name,
      email: old.email,
      password,
      role: 'user'
    });
    setTokenCookie(res, signToken(user));
    return res.redirect(303, '/');
  } catch (err) {
    if (err.code === 11000)
      return fail('Email đã được sử dụng.');
    if (err.name === 'ValidationError')
      return fail('Dữ liệu đăng ký không hợp lệ.');
    return next(err);
  }
};


exports.login = async (req, res, next) => {
  const body = req.body || {};
  const email = emailOf(body.email);
  const password = text(body.password);
  const nextPath = safeNext(body.next);
  const fail = () => res.status(401).render('auth/login', {
    title: 'Đăng nhập',
    error: 'Email hoặc mật khẩu không đúng.',
    old: { email }, nextPath
  });
  if (!email || !password ||
      Buffer.byteLength(password, 'utf8') > 72) return fail();
  try {
    const currentUser = await User.findOne({ email })
      .select('+password');
    if (!currentUser ||
        !(await currentUser.checkPassword(password))) {
      return fail();
    }
    setTokenCookie(res, signToken(currentUser));
    return res.redirect(303, nextPath);
  } catch (err) {
    return next(err);
  }
}

exports.logout = (req,res) => {
      clearTokenCookie(res);
      return res.redirect(303, '/login');
}

