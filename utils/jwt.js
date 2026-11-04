const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 ||
    secret.startsWith('THAY_')) {
  throw new Error('Can cau hinh JWT_SECRET ngau nhien');
}
exports.signToken = (user) => jwt.sign(
  { id: user._id.toString() },
  secret,
  { algorithm: 'HS256', expiresIn: '1200s' }
);
exports.verifyToken = (token) => jwt.verify(
  token, secret, { algorithms: ['HS256'] }
);
