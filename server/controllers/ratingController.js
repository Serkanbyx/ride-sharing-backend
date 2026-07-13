const Trip = require('../models/Trip');
const { getDriverByUserId } = require('../services/driverService');
const { rateTrip: rateTripService } = require('../services/ratingService');
const { success, fail } = require('../utils/apiResponse');

const rateTrip = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { score, comment } = req.body;

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return fail(res, 'Trip not found', 404);
    }

    const isPassenger = trip.passenger.toString() === req.user._id.toString();
    let isDriver = false;

    if (req.user.role === 'driver') {
      const driver = await getDriverByUserId(req.user._id);
      isDriver =
        Boolean(driver) &&
        Boolean(trip.driver) &&
        trip.driver.toString() === driver._id.toString();
    }

    if (!isPassenger && !isDriver) {
      return fail(res, 'You are not a participant of this trip', 403);
    }

    const raterRole = isPassenger ? 'passenger' : 'driver';
    const updatedTrip = await rateTripService(
      tripId,
      req.user._id,
      raterRole,
      score,
      comment
    );

    return success(res, updatedTrip);
  } catch (error) {
    const clientErrors = [
      'Only completed trips can be rated',
      'You have already rated this trip',
      'This trip has no assigned driver to rate',
      'Only the trip passenger can rate the driver',
      'Only the trip driver can rate the passenger',
      'Invalid rater role',
    ];

    if (clientErrors.includes(error.message)) {
      return fail(res, error.message, 400);
    }

    next(error);
  }
};

module.exports = {
  rateTrip,
};
