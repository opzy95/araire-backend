const express = require('express');
const cartController = require('../controllers/cart.controller');
const requireAuth = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', cartController.get);
router.post('/items', cartController.addItem);
router.patch('/items/:productId', cartController.setItemQuantity);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clear);

module.exports = router;
