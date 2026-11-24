const User = require('../models/user');

exports.getAll = async(req,res) => {
    try {
        const list = await User.findAll();
        res.send(list);
    }catch(err) {
        console.error('Lỗi lấy danh sách user MySQL:', err.message);
        return res.status(500).json({ message: 'Loi lay danh sach user' });
    }
}
exports.addUser = async(req, res) => {
    try {
        //check dữ liệu
        const { username, fullname, email } = req.body || {};
        if ([username, fullname, email].some((v) => typeof v !== 'string' || !v.trim())) {
            return res.status(400).json({ message: 'Nhap username, fullname, email' });
        }
        const newId = await User.create({
            username: username.trim(), fullname: fullname.trim(), email: email.trim()
        });

        return res.status(201).json({ id: newId });
    }catch(err) {
        console.error('Lỗi thêm user MySQL:', err.message);
        return res.status(500).json({ message: 'Loi them user' });
    }
}
