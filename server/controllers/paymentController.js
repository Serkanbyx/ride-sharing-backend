const Trip = require('../models/Trip');
const { createPaymentIntent } = require('../services/paymentService');
const { success, fail } = require('../utils/apiResponse');

const createPayment = async (req, res, next) => {
  try {
    const { tripId } = req.body;
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return fail(res, 'Trip not found', 404);
    }

    if (trip.passenger.toString() !== req.user._id.toString()) {
      return fail(res, 'You are not authorized to pay for this trip', 403);
    }

    if (trip.status !== 'completed') {
      return fail(res, 'Payment can only be created for completed trips', 400);
    }

    if (trip.paymentInfo?.status === 'succeeded') {
      return fail(res, 'This trip has already been paid', 400);
    }

    const payment = await createPaymentIntent(trip, req.user);

    return success(res, {
      clientSecret: payment.clientSecret,
      amount: payment.amount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
};
