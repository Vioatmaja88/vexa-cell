const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  deleteUser,
  getTransactions,
  updateTransactionStatus,
  updateMargin,
  recalculatePrices
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Apply admin auth to all routes
router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.get('/transactions', getTransactions);
router.patch('/transactions/:id/status', updateTransactionStatus);
router.post('/margins', updateMargin);
router.post('/prices/recalculate', recalculatePrices);

module.exports = router;