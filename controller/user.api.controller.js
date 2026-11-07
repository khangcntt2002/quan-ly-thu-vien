const User = require('../models/mongoUser');

module.exports = {
  list: async (req, res) => {
    try {
      // Lấy tất cả user, bỏ trường password ra cho an toàn
      const users = await User.find({}, '-password');
      res.status(200).json({
        message: 'Danh sách người dùng',
        total: users.length,
        data: users
      });
    } catch (err) {
      res.status(500).json({
        message: 'Lỗi lấy danh sách người dùng',
        error: err.message
      });
    }
  }
};
