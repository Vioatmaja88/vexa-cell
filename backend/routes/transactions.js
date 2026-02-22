const express = require('express');
const router = express.Router();
const {
  createTransaction,
  processPayment,
  checkTransactionStatus,
  getUserTransactions
} = require('../controllers/transactionController');
const { authenticate } = require('../middlewares/auth');

router.post('/', authenticate, createTransaction);
router.post('/:transactionId/payment', authenticate, processPayment);
router.get('/:transactionId/status', authenticate, checkTransactionStatus);
router.get('/', authenticate, getUserTransactions);

module.exports = router;