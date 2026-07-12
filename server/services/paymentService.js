const Stripe = require('stripe');
const env = require('../config/env');
const User = require('../models/User');
const Trip = require('../models/Trip');

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const createOrGetStripeCustomer = async (user) => {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user._id.toString(),
    },
  });

  user.stripeCustomerId = customer.id;
  await user.save();

  return customer.id;
};

const createPaymentIntent = async (trip, user) => {
  const amount = trip.finalFare || trip.estimatedFare;

  if (!amount || amount <= 0) {
    throw new Error('Invalid trip fare amount');
  }

  const customerId = await createOrGetStripeCustomer(user);
  const amountInCents = Math.round(amount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    customer: customerId,
    metadata: {
      tripId: trip._id.toString(),
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  trip.paymentInfo.stripePaymentIntentId = paymentIntent.id;
  trip.paymentInfo.clientSecret = paymentIntent.client_secret;
  trip.paymentInfo.status = 'processing';
  await trip.save();

  return {
    clientSecret: paymentIntent.client_secret,
    amount,
  };
};

const handlePaymentSucceeded = async (paymentIntent) => {
  const tripId = paymentIntent.metadata?.tripId;

  if (!tripId) {
    throw new Error('Payment intent missing trip metadata');
  }

  const trip = await Trip.findById(tripId);

  if (!trip) {
    throw new Error('Trip not found for payment intent');
  }

  trip.paymentInfo.status = 'succeeded';
  trip.paymentInfo.paidAt = new Date();
  await trip.save();

  return trip;
};

module.exports = {
  createOrGetStripeCustomer,
  createPaymentIntent,
  handlePaymentSucceeded,
};
