const express = require('express');
const ordersController = require('../controllers/orders.controller');
const requireAuth = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/require-admin.middleware');
const uploadPaymentReceipt = require('../middleware/payment-receipt-upload.middleware');

const router = express.Router();

router.post('/', requireAuth, uploadPaymentReceipt, ordersController.create);
router.post('/:orderId/payment', requireAuth, uploadPaymentReceipt, ordersController.submitPayment);
router.get('/', requireAuth, requireAdmin, ordersController.listAll);
router.patch('/:orderId/payment', requireAuth, requireAdmin, ordersController.markPaymentPaid);

module.exports = router;
