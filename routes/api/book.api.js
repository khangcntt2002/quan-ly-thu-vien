const router = require('express').Router();
const mongoose = require('mongoose');
const Book = require('../../models/Book');
const User = require('../../models/mongoUser');
const { signToken, verifyToken } = require('../../utils/jwt');
const c = require('../../controller/book.api.controller');
const { checkAdmin } = require('../../middlewares/auth');

// route /api/v1/books

// GET /api/v1/books
router.get('/', c.list);

// GET /api/v1/books/:id
router.get('/:id', c.findid);

// POST /api/v1/books
router.post('/', checkAdmin, c.create);

module.exports = router;