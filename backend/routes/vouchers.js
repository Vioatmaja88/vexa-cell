const express = require('express');
const router = express.Router();
const { 
  getCategories, 
  getProviders, 
  getList, 
  getDetail,
  syncVouchers 
} = require('../controllers/voucherController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

router.get('/categories', getCategories);
router.get('/providers', getProviders);
router.get('/', getList);
router.get('/:code', getDetail);
router.post('/sync', authenticate, requireAdmin, syncVouchers);

module.exports = router;