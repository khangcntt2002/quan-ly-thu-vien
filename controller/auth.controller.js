const User = require('../models/mongoUser');
const { signToken } = require('../utils/jwt');
const { setTokenCookie, clearTokenCookie } =
  require('../utils/cookies');
const text = (v) => typeof v === 'string' ? v : '';
const emailOf = (v) => text(v).trim().toLowerCase();
// Chỉ cho quay lại /admin hoặc trang con như /admin/users; chặn //example.com
const isAdminPath = (v) => /^\/admin(\/[a-z-]+)?$/.test(v);
const safeNext = (v) => isAdminPath(v) ? v : '/';

const crypto = require('crypto');
const { sendOtpEmail, sendRegisterOtpEmail } = require('../config/mailer');
const PendingRegistration = require('../models/PendingRegistration');

const generateOtp = () => String(crypto.randomInt(100000, 1000000));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

exports.registerForm = (req, res) => {
  res.render('auth/register', {
    title: 'Đăng ký', error: null, old: {}
  });
};
exports.loginForm = (req, res) => {
  res.render('auth/login', {
    title: 'Đăng nhập', error: null, old: {},
    nextPath: safeNext(req.query.next),
    notice: req.query.expired === '1'
      ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : null
  });
};
const OTP_TTL_MS = 5 * 60 * 1000;       // OTP sống 5 phút
const RESEND_COOLDOWN_MS = 60 * 1000;   // 60 giây mới được gửi lại
const MAX_OTP_ATTEMPTS = 5;             // nhập sai 5 lần phải xin mã mới

function passwordError(password, confirm) {
  if (password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72)
    return 'Mật khẩu từ 8 ký tự và tối đa 72 byte UTF-8.';
  if (password !== confirm)
    return 'Mật khẩu nhập lại không khớp.';
  return null;
}

// Bước 1 – POST /register: nhận họ tên + email -> tạo OTP -> gửi mail
exports.register = async (req, res, next) => {
  const body = req.body || {};
  const old = {
    name: text(body.name).trim(),
    email: emailOf(body.email)
  };
  const fail = (message, status = 400) => res.status(status).render(
    'auth/register', { title: 'Đăng ký', error: message, old }
  );
  if (!old.name || old.name.length > 80)
    return fail('Họ tên bắt buộc và tối đa 80 ký tự.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(old.email))
    return fail('Email không hợp lệ.');

  try {
    if (await User.exists({ email: old.email }))
      return fail('Email đã được sử dụng.');

    const pending = await PendingRegistration.findOne({ email: old.email });
    if (pending && Date.now() - pending.lastSentAt.getTime() < RESEND_COOLDOWN_MS)
      return fail('Vui lòng đợi 60 giây trước khi yêu cầu mã OTP mới.', 429);

    const otp = generateOtp();
    await PendingRegistration.findOneAndUpdate(
      { email: old.email },
      {
        name: old.name,
        otpHash: hashOtp(otp),
        attempts: 0,
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + OTP_TTL_MS)
      },
      { upsert: true, runValidators: true }
    );

    try {
      await sendRegisterOtpEmail(old.email, old.name, otp);
    } catch (mailErr) {
      console.error('Gui OTP dang ky that bai:', mailErr.code || mailErr.message);
      await PendingRegistration.deleteOne({ email: old.email });
      return fail('Không gửi được email OTP. Vui lòng thử lại sau.', 502);
    }

    return res.redirect(303,
      `/register/verify?email=${encodeURIComponent(old.email)}`);
  } catch (err) {
    return next(err);
  }
};

// Bước 2 – GET /register/verify: form nhập OTP + mật khẩu
exports.registerVerifyForm = (req, res) => {
  res.render('auth/register-verify', {
    title: 'Xác thực đăng ký', error: null,
    old: { email: emailOf(req.query.email) }
  });
};

// Bước 3 – POST /register/verify: kiểm tra OTP -> tạo user thật trong DB
exports.registerVerify = async (req, res, next) => {
  const body = req.body || {};
  const email = emailOf(body.email);
  const otp = text(body.otp).trim();
  const password = text(body.password);
  const confirm = text(body.confirm);
  const fail = (message) => res.status(400).render('auth/register-verify', {
    title: 'Xác thực đăng ký', error: message, old: { email }
  });

  if (!email || !/^[0-9]{6}$/.test(otp))
    return fail('Email hoặc mã OTP 6 chữ số không hợp lệ.');
  const pwError = passwordError(password, confirm);
  if (pwError) return fail(pwError);

  try {
    const pending = await PendingRegistration.findOne({ email });
    // TTL index của MongoDB xoá chậm tối đa ~60s, nên vẫn tự kiểm tra hạn
    if (!pending || pending.expiresAt.getTime() < Date.now())
      return fail('Mã OTP đã hết hạn hoặc chưa được gửi. Vui lòng đăng ký lại.');
    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      await pending.deleteOne();
      return fail('Bạn đã nhập sai quá nhiều lần. Vui lòng đăng ký lại.');
    }
    if (pending.otpHash !== hashOtp(otp)) {
      pending.attempts += 1;
      await pending.save();
      return fail(`Mã OTP không chính xác. Còn ${MAX_OTP_ATTEMPTS - pending.attempts} lần thử.`);
    }

    // pre('save') trong mongoUser.js tự hash password bằng bcrypt
    const user = await User.create({
      name: pending.name, email, password, role: 'user'
    });
    await pending.deleteOne();

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
  const fail = (message = 'Email hoặc mật khẩu không đúng.') =>
    res.status(401).render('auth/login', {
      title: 'Đăng nhập', error: message,
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
    // Phân quyền: đăng nhập để vào /admin mà không phải admin thì không cấp token
    if (isAdminPath(nextPath) && currentUser.role !== 'admin') {
      return fail('Tài khoản của bạn không có quyền truy cập trang quản trị.');
    }
    setTokenCookie(res, signToken(currentUser));
    return res.redirect(303, nextPath);
  } catch (err) {
    return next(err);
  }
};
 
exports.logout = (req, res) => {
  clearTokenCookie(res);
  return res.redirect(303, '/login');
};

// 1. Hiển thị form nhập email quên mật khẩu
exports.forgotPasswordForm = (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Quên mật khẩu', error: null, message: null, old: {}
  });
};

// 2. Nhận email -> tạo OTP 6 số -> lưu DB -> gửi mail
exports.sendResetOtp = async (req, res, next) => {
  const email = emailOf(req.body?.email);
  const fail = (error) => res.status(400).render('auth/forgot-password', {
    title: 'Quên mật khẩu', error, message: null, old: { email }
  });

  if (!email) return fail('Vui lòng nhập email đã đăng ký.');

  try {
    const user = await User.findOne({ email });
    if (!user) return fail('Không tìm thấy tài khoản với email này.');

    const otp = generateOtp();
    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    await user.save();

    await sendOtpEmail(user.email, otp);

    return res.redirect(303, `/reset-password?email=${encodeURIComponent(user.email)}`);
  } catch (err) {
    return next(err);
  }
};

// 3. Hiển thị form nhập OTP và mật khẩu mới
exports.resetPasswordForm = (req, res) => {
  res.render('auth/reset-password', {
    title: 'Đặt lại mật khẩu',
    error: null,
    old: { email: emailOf(req.query.email) }
  });
};

// 4. Kiểm tra OTP -> cập nhật mật khẩu mới
exports.resetPassword = async (req, res, next) => {
  const body = req.body || {};
  const email = emailOf(body.email);
  const otp = text(body.otp).trim();
  const password = text(body.password);
  const confirm = text(body.confirm);

  const fail = (error) => res.status(400).render('auth/reset-password', {
    title: 'Đặt lại mật khẩu', error, old: { email }
  });

  if (!email || !/^[0-9]{6}$/.test(otp))
    return fail('Email hoặc mã OTP 6 chữ số không hợp lệ.');
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)
    return fail('Mật khẩu mới từ 8 ký tự và tối đa 72 byte UTF-8.');
  if (password !== confirm)
    return fail('Mật khẩu nhập lại không khớp.');

  try {
    const user = await User.findOne({ email }).select('+resetOtpHash +resetOtpExpires');
    if (!user || !user.resetOtpHash || !user.resetOtpExpires)
      return fail('Yêu cầu OTP không hợp lệ hoặc chưa được tạo.');
    if (user.resetOtpExpires.getTime() < Date.now())
      return fail('Mã OTP đã hết hạn. Vui lòng yêu cầu lại.');
    if (user.resetOtpHash !== hashOtp(otp))
      return fail('Mã OTP không chính xác.');

    // Lưu ý: schema.pre('save') trong mongoUser.js sẽ tự động hash password bằng bcrypt
    user.password = password;
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    return res.redirect(303, '/login');
  } catch (err) {
    return next(err);
  }
};

