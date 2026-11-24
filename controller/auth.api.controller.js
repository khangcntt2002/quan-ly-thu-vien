const User = require('../models/mongoUser');
const { signToken } = require('../utils/jwt');
const result = require('../utils/response');

// POST /api/v1/login => { success, data: { accessToken, role } }
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string'
      || !email.trim() || !password) {
    return result.fail(res, 400, 'Nhap email, password');
  }
  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select('+password');
    // Không cho biết email có tồn tại hay không
    if (!user || !(await user.checkPassword(password))) {
      return result.fail(res, 401, 'Sai dang nhap');
    }
    return result.ok(res, {
      accessToken: signToken(user),
      role: user.role
    });
  } catch (err) {
    return result.fail(res, 500, 'Loi dang nhap');
  }
};
