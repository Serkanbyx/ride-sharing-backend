const express = require('express');
const {
  requestTrip,
  acceptTrip,
  updateTripStatus,
  cancelTrip,
  getActiveTrip,
  getMyTrips,
  getTrip,
} = require('../controllers/tripController');
const { protect, passengerOnly, driverOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { tripLimiter } = require('../middleware/rateLimiters');
const {
  requestTripValidators,
  acceptTripValidators,
  updateTripStatusValidators,
  cancelTripValidators,
} = require('../validators/tripValidators');

const router = express.Router();

router.post(
  '/request',
  protect,
  passengerOnly,
  tripLimiter,
  requestTripValidators,
  validate,
  requestTrip
);
router.get('/active', protect, getActiveTrip);
router.get('/my', protect, getMyTrips);
router.post(
  '/:tripId/accept',
  protect,
  driverOnly,
  acceptTripValidators,
  validate,
  acceptTrip
);
router.patch(
  '/:tripId/status',
  protect,
  updateTripStatusValidators,
  validate,
  updateTripStatus
);
router.post(
  '/:tripId/cancel',
  protect,
  cancelTripValidators,
  validate,
  cancelTrip
);
router.get('/:tripId', protect, getTrip);

module.exports = router;
