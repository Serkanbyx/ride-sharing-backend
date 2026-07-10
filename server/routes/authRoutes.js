const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  becomeDriver,
  changePassword,
  deleteAccount,
} = require('../controllers/authController');
const { protect, passengerOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  registerValidators,
  loginValidators,
  updateProfileValidators,
  changePasswordValidators,
  deleteAccountValidators,
  becomeDriverValidators,
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register', authLimiter, registerValidators, validate, register);
router.post('/login', authLimiter, loginValidators, validate, login);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfileValidators, validate, updateProfile);
router.patch('/password', protect, changePasswordValidators, validate, changePassword);
router.post(
  '/become-driver',
  protect,
  passengerOnly,
  becomeDriverValidators,
  validate,
  becomeDriver
);
router.delete('/account', protect, deleteAccountValidators, validate, deleteAccount);

module.exports = router;
