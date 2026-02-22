const express = require('express');
const router = express.Router();
const { getPaymentStatus, getReceipt } = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/auth');

router.get('/status/:orderId', authenticate, getPaymentStatus);
router.get('/receipt/:transactionId', authenticate, getReceipt);

module.exports = router;