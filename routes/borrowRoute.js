const express = require('express');
const router = express.Router();
const borrowController = require('../controller/borrowController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.get('/payment', requireAuth, borrowController.getPaymentPage);
router.post('/payment/confirm', requireAuth, borrowController.confirmPayment);
router.get('/my', requireAuth, borrowController.getMyBorrows);
router.post('/:id/return', requireAuth, borrowController.returnBook);
router.get('/all', requireAuth, requireRole('admin'), borrowController.getAllBorrows);

module.exports = router;
