const { body } = require('express-validator');
const { forbiddenFields } = require('./sharedValidators');

const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const currentYear = new Date().getFullYear();

const privilegedUserFields = [
  'role',
  'isActive',
  'stripeCustomerId',
  'averageRating',
  'totalRatings',
];

const registerValidators = [
  ...forbiddenFields(privilegedUserFields),
  body('name')
    .trim()
    .escape()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('phone')
    .trim()
    .matches(phoneRegex)
    .withMessage('Please provide a valid phone number'),
];

const loginValidators = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidators = [
  ...forbiddenFields([
    ...privilegedUserFields,
    'email',
    'password',
    'avatar',
  ]),
  body('name')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(phoneRegex)
    .withMessage('Please provide a valid phone number'),
];

const changePasswordValidators = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

const deleteAccountValidators = [
  body('password').notEmpty().withMessage('Password is required'),
];

const becomeDriverValidators = [
  ...forbiddenFields(privilegedUserFields),
  body('vehicle.make')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Vehicle make is required')
    .isLength({ max: 30 })
    .withMessage('Vehicle make cannot exceed 30 characters'),
  body('vehicle.model')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Vehicle model is required')
    .isLength({ max: 30 })
    .withMessage('Vehicle model cannot exceed 30 characters'),
  body('vehicle.year')
    .isInt({ min: 1990, max: currentYear + 1 })
    .withMessage(`Vehicle year must be between 1990 and ${currentYear + 1}`),
  body('vehicle.color')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Vehicle color is required')
    .isLength({ max: 20 })
    .withMessage('Vehicle color cannot exceed 20 characters'),
  body('vehicle.plateNumber')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Plate number is required')
    .isLength({ max: 10 })
    .withMessage('Plate number cannot exceed 10 characters')
    .customSanitizer((value) => value.toUpperCase()),
];

module.exports = {
  registerValidators,
  loginValidators,
  updateProfileValidators,
  changePasswordValidators,
  deleteAccountValidators,
  becomeDriverValidators,
};
