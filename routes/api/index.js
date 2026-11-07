const router = require('express').Router();
const { signToken, verifyToken } = require('../../utils/jwt');
const User = require('../../models/mongoUser');

// Import các module
const authApi = require('./authRoutes');  // ← API đăng nhập/đăng ký
const bookApi = require('./bookApi');
const userApi = require('./userApi');

// Đăng ký đường dẫn
router.use('/', authApi);       // → /api/v1/login, /api/v1/register
router.use('/books', bookApi);  // → /api/v1/books
router.use('/users', userApi);  // → /api/v1/users

// Giữ nguyên hàm checkAdmin đã viết
exports.checkAdmin = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Can Bearer token' });
  }

  let payload;
  try {
    payload = verifyToken(token);
    if (!mongoose.isObjectIdOrHexString(payload.id)) {
      return res.status(401).json({ message: 'Token sai' });
    }
  } catch {
    return res.status(401).json({ message: 'Token sai hoac het han' });
  }

  try {
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Tai khoan khong con' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Chi admin xem duoc' });
    next();
  } catch {
    return res.status(500).json({ message: 'Loi kiem tra tai khoan' });
  }
};

module.exports = router;
