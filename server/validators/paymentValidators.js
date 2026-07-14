const { body } = require('express-validator');
const { forbiddenFields } = require('./sharedValidators');

const createPaymentValidators = [
  ...forbiddenFields(['amount', 'currency', 'clientSecret']),
  body('tripId').isMongoId().withMessage('Invalid trip ID'),
];

module.exports = {
  createPaymentValidators,
};
