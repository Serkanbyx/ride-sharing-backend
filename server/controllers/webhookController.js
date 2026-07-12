const Stripe = require('stripe');
const env = require('../config/env');
const { handlePaymentSucceeded } = require('../services/paymentService');

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({
      received: false,
      message: 'Missing Stripe signature',
    });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).json({
      received: false,
      message: 'Webhook signature verification failed',
    });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      await handlePaymentSucceeded(event.data.object);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler error:', error.message);
    return res.status(500).json({
      received: false,
      message: 'Webhook handler failed',
    });
  }
};

module.exports = {
  handleStripeWebhook,
};
