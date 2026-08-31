const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// All user management routes require Admin privileges
router.use(authenticate, authorize('Admin'));

router.get('/', userController.list);
router.post('/', userController.create);
router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.put('/:id/password', userController.resetPassword);
router.delete('/:id', userController.delete);

module.exports = router;
