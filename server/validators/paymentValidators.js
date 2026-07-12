const { body } = require('express-validator');

const createPaymentValidators = [
  body('tripId').isMongoId().withMessage('Invalid trip ID'),
];

module.exports = {
  createPaymentValidators,
};
