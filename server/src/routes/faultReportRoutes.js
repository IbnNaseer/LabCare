const express = require('express');
const router = express.Router();
const faultReportController = require('../controllers/faultReportController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const uploadImage = require('../middleware/uploadImage');

router.use(authenticate);

router.post('/', uploadImage.single('image'), faultReportController.create);
router.get('/', faultReportController.list);
router.get('/:id', faultReportController.getById);

router.patch(
  '/:id/status',
  authorize('Technologist', 'Engineer', 'Admin'),
  faultReportController.updateStatus
);
router.put(
  '/:id/status',
  authorize('Technologist', 'Engineer', 'Admin'),
  faultReportController.updateStatus
);

router.delete(
  '/:id',
  authorize('Admin'),
  faultReportController.delete
);

module.exports = router;
