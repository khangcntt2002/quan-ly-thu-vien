const router = require('express').Router();
const c = require('../../controller/auth.api.controller');

// POST /api/v1/login => { success, data: { accessToken, role } }
router.post('/login', c.login);

module.exports = router;
