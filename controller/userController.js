const User = require('../models/user');

exports.getAll = async(req,res) => {
    try {
        const list = await User.findAll();
        res.send(list);
    }catch(err) {
        return res.send(err);
    }
}
exports.addUser = async(req, res) => {
    try {
        //check dữ liệu
        const data = req.body;
        const newId = await User.create(data);

        return res.send(newId);
    }catch(err) {
        return res.send(err);
    }
}
