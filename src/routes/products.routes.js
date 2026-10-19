const express = require('express');
const productsController = require('../controllers/products.controller');
const requireAuth = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/require-admin.middleware');
const uploadProductImage = require('../middleware/product-image-upload.middleware');

const router = express.Router();

router.get('/', productsController.list);
router.get('/:id', productsController.getById);
router.post('/', requireAuth, requireAdmin, uploadProductImage, productsController.create);
router.patch('/:id', requireAuth, requireAdmin, uploadProductImage, productsController.update);
router.delete('/:id', requireAuth, requireAdmin, productsController.remove);

module.exports = router;