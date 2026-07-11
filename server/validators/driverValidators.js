const { body } = require('express-validator');

const locationValidators = [
  body('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 })
    .withMessage('Heading must be between 0 and 360'),
];

const availabilityValidators = [
  body('isAvailable')
    .isBoolean()
    .withMessage('isAvailable must be a boolean value'),
];

module.exports = {
  locationValidators,
  availabilityValidators,
};
