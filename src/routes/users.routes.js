const express = require('express');
const usersController = require('../controllers/users.controller');
const requireAuth = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/require-admin.middleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', requireAdmin, usersController.list);
router.get('/me', usersController.getMe);
router.patch('/me', usersController.updateMe);

module.exports = router;