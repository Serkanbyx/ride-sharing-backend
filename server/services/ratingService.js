const Trip = require('../models/Trip');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { getDriverByUserId } = require('./driverService');

const updateRollingAverage = (currentAvg, currentTotal, newScore) => {
  return (currentAvg * currentTotal + newScore) / (currentTotal + 1);
};

const applyRating = async (trip, raterRole, score, comment) => {
  const rating = {
    score,
    comment: comment || '',
    createdAt: new Date(),
  };

  if (raterRole === 'passenger') {
    trip.driverRating = rating;

    const driver = await Driver.findById(trip.driver);

    if (!driver) {
      throw new Error('Driver not found for this trip');
    }

    const driverUser = await User.findById(driver.user);

    if (!driverUser) {
      throw new Error('Driver user not found for this trip');
    }

    driver.averageRating = updateRollingAverage(
      driver.averageRating,
      driver.totalRatings,
      score
    );
    driver.totalRatings += 1;

    driverUser.averageRating = updateRollingAverage(
      driverUser.averageRating,
      driverUser.totalRatings,
      score
    );
    driverUser.totalRatings += 1;

    await driver.save();
    await driverUser.save();
  } else {
    trip.passengerRating = rating;

    const passenger = await User.findById(trip.passenger);

    if (!passenger) {
      throw new Error('Passenger not found for this trip');
    }

    passenger.averageRating = updateRollingAverage(
      passenger.averageRating,
      passenger.totalRatings,
      score
    );
    passenger.totalRatings += 1;

    await passenger.save();
  }

  await trip.save();

  return trip;
};

const rateTrip = async (tripId, raterId, raterRole, score, comment) => {
  const trip = await Trip.findById(tripId);

  if (!trip) {
    throw new Error('Trip not found');
  }

  if (trip.status !== 'completed') {
    throw new Error('Only completed trips can be rated');
  }

  if (raterRole === 'passenger') {
    if (trip.passenger.toString() !== raterId.toString()) {
      throw new Error('Only the trip passenger can rate the driver');
    }

    if (trip.driverRating) {
      throw new Error('You have already rated this trip');
    }

    if (!trip.driver) {
      throw new Error('This trip has no assigned driver to rate');
    }
  } else if (raterRole === 'driver') {
    const driver = await getDriverByUserId(raterId);

    if (!driver || !trip.driver || trip.driver.toString() !== driver._id.toString()) {
      throw new Error('Only the trip driver can rate the passenger');
    }

    if (trip.passengerRating) {
      throw new Error('You have already rated this trip');
    }
  } else {
    throw new Error('Invalid rater role');
  }

  return applyRating(trip, raterRole, score, comment);
};

module.exports = {
  updateRollingAverage,
  rateTrip,
  applyRating,
};
