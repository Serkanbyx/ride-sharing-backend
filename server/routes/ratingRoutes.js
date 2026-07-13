const express = require('express');
const { rateTrip } = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { rateTripValidators } = require('../validators/ratingValidators');

const router = express.Router();

router.post(
  '/:tripId/rate',
  protect,
  rateTripValidators,
  validate,
  rateTrip
);

module.exports = router;
