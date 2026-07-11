const express = require('express');
const {
  getMyDriverProfile,
  updateLocation,
  toggleAvailability,
} = require('../controllers/driverController');
const { protect, driverOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  locationValidators,
  availabilityValidators,
} = require('../validators/driverValidators');

const router = express.Router();

router.get('/me', protect, driverOnly, getMyDriverProfile);
router.patch(
  '/location',
  protect,
  driverOnly,
  locationValidators,
  validate,
  updateLocation
);
router.patch(
  '/availability',
  protect,
  driverOnly,
  availabilityValidators,
  validate,
  toggleAvailability
);

module.exports = router;
