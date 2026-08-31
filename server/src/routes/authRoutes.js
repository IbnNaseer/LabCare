const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;
