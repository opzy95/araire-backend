const express = require('express');
const usersController = require('../controllers/users.controller');
const requireAuth = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);
router.get('/me', usersController.getMe);
router.patch('/me', usersController.updateMe);

module.exports = router;