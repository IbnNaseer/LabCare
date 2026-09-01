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
router.get('/:id/schedules', equipmentController.getSchedules);

router.post('/', authorize('Admin'), equipmentController.create);
router.put('/:id', authorize('Admin', 'Technologist'), equipmentController.update);
router.post('/:id/schedules', authorize('Admin', 'Technologist'), equipmentController.addSchedule);
router.delete('/schedules/:scheduleId', authorize('Admin', 'Technologist'), equipmentController.deleteSchedule);
router.post('/:id/accrue-usage', authorize('Admin', 'Technologist'), equipmentController.accrueUsage);

module.exports = router;
