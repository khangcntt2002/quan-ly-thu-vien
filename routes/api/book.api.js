const router = require('express').Router();
const c = require('../../controller/book.api.controller');
const { checkAdmin } = require('../../middlewares/auth');

// route /api/v1/books

// GET /api/v1/books
router.get('/', c.list);

// GET /api/v1/books/:id
router.get('/:id', c.findid);

// POST /api/v1/books (chỉ admin)
router.post('/', checkAdmin, c.create);

// PUT /api/v1/books/:id (chỉ admin)
router.put('/:id', checkAdmin, c.replace);

// DELETE /api/v1/books/:id (chỉ admin)
router.delete('/:id', checkAdmin, c.remove);

module.exports = router;
