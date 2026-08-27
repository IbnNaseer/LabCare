const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/', equipmentController.list);
router.get('/qr/:qrCode', equipmentController.getByQR);
router.get('/:id', equipmentController.getById);
router.get('/:id/history', equipmentController.getHistory);

router.post('/', authorize('Admin'), equipmentController.create);
router.put('/:id', authorize('Admin'), equipmentController.update);

module.exports = router;
