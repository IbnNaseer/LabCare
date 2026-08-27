const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.post('/', authorize('Technologist', 'Engineer', 'Admin'), maintenanceController.create);
router.get('/', authorize('Technologist', 'Engineer', 'Admin'), maintenanceController.list);
router.get('/equipment/:equipmentId', maintenanceController.getByEquipment);

module.exports = router;
