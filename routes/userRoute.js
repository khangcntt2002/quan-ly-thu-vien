const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');

router.get('/getAll', userController.getAll);
router.post('/add', userController.addUser);

module.exports = router;