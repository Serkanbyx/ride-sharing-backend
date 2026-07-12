const express = require('express');
const { createPayment } = require('../controllers/paymentController');
const { protect, passengerOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPaymentValidators } = require('../validators/paymentValidators');

const router = express.Router();

router.post(
  '/create',
  protect,
  passengerOnly,
  createPaymentValidators,
  validate,
  createPayment
);

module.exports = router;
