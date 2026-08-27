const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get(
  '/dashboard-summary',
  authorize('Technologist', 'Engineer', 'Admin'),
  predictionController.getDashboardSummary
);

router.get(
  '/high-risk',
  authorize('Technologist', 'Engineer', 'Admin'),
  predictionController.getHighRisk
);

router.get(
  '/equipment/:equipmentId',
  authorize('Technologist', 'Engineer', 'Admin'),
  predictionController.getByEquipment
);

router.post(
  '/recalculate',
  authorize('Admin'),
  predictionController.recalculate
);

module.exports = router;
