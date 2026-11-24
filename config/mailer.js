const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// === Gửi OTP quên mật khẩu ===
async function sendOtpEmail(toEmail, otp) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: toEmail,
    subject: '[Phúc Khang Sách] Mã OTP khôi phục mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e3a5f; margin-bottom: 8px;">Khôi phục mật khẩu</h2>
        <p>Chào bạn,</p>
        <p>Mã OTP của bạn là:</p>
        <div style="font-size: 28px; font-weight: bold; color: #2563eb; padding: 12px; background: #eff6ff; border-radius: 8px; text-align: center; letter-spacing: 4px;">${otp}</div>
        <p style="margin-top: 16px;">Mã này có hiệu lực trong <strong>5 phút</strong>.</p>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      </div>
    `
  });
}

// === Gửi OTP đăng ký tài khoản MỚI ===
async function sendRegisterOtpEmail(toEmail, name, otp) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: toEmail,
    subject: '[Phúc Khang Sách] Mã OTP xác nhận đăng ký',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e3a5f; margin-bottom: 8px;">Xác Nhận Đăng Ký</h2>
        <p>Chào bạn <strong>${name}</strong>,</p>
        <p>Cảm ơn bạn đăng ký tài khoản! Mã OTP của bạn là:</p>
        <div style="font-size: 28px; font-weight: bold; color: #16a34a; padding: 12px; background: #f0fdf4; border-radius: 8px; text-align: center; letter-spacing: 4px;">${otp}</div>
        <p style="margin-top: 16px;">Mã này có hiệu lực trong <strong>5 phút</strong>.</p>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">Nếu bạn không thực hiện, vui lòng bỏ qua email này.</p>
      </div>
    `
  });
}

// === XUẤT CẢ RA NGOÀI ===
module.exports = { transporter, sendOtpEmail, sendRegisterOtpEmail };
