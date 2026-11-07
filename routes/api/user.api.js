
const router = require('express').Router();
const User = require('../../models/mongoUser');
const { checkAdmin } = require('../../middlewares/auth');

// GET /api/v1/users
router.get('/', checkAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password -__v');

        return res.status(200).json(users);
    } catch (err) {
        console.log(err);

        return res.status(500).json({
            message: 'Loi lay danh sach users'
        });
    }
});

module.exports = router;

