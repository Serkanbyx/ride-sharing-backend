const { body, param } = require('express-validator');

const rateTripValidators = [
  param('tripId').isMongoId().withMessage('Invalid trip ID'),
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Score must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 300 })
    .withMessage('Comment cannot exceed 300 characters'),
];

module.exports = {
  rateTripValidators,
};
