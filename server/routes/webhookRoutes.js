const express = require('express');
const { handleStripeWebhook } = require('../controllers/webhookController');
const { webhookLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post(
  '/stripe',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

module.exports = router;
