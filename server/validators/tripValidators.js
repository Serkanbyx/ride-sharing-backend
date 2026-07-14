// Trip rating validators live in ratingValidators.js (POST /api/trips/:tripId/rate)
const { body, param } = require('express-validator');
const { TRIP_STATUSES } = require('../utils/constants');

const requestTripValidators = [
  body('pickupLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),
  body('pickupLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),
  body('destLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Destination longitude must be between -180 and 180'),
  body('destLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Destination latitude must be between -90 and 90'),
  body('pickupAddress')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Pickup address is required')
    .isLength({ max: 200 })
    .withMessage('Pickup address cannot exceed 200 characters'),
  body('destinationAddress')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Destination address is required')
    .isLength({ max: 200 })
    .withMessage('Destination address cannot exceed 200 characters'),
];

const acceptTripValidators = [
  param('tripId').isMongoId().withMessage('Invalid trip ID'),
];

const updateTripStatusValidators = [
  param('tripId').isMongoId().withMessage('Invalid trip ID'),
  body('status')
    .isIn(TRIP_STATUSES)
    .withMessage('Invalid trip status'),
  body('reason')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),
];

const cancelTripValidators = [
  param('tripId').isMongoId().withMessage('Invalid trip ID'),
  body('reason')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),
];

module.exports = {
  requestTripValidators,
  acceptTripValidators,
  updateTripStatusValidators,
  cancelTripValidators,
};
