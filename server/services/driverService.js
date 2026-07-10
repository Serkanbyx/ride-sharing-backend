const Driver = require('../models/Driver');
const env = require('../config/env');

const isValidCoordinates = (lng, lat) => {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

const findNearbyDrivers = async (
  lng,
  lat,
  maxDistance = env.DRIVER_SEARCH_RADIUS_METERS
) => {
  if (!isValidCoordinates(lng, lat)) {
    throw new Error('Invalid coordinates');
  }

  return Driver.find({
    isAvailable: true,
    isOnTrip: false,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: maxDistance,
      },
    },
  })
    .populate('user', 'name phone averageRating')
    .limit(env.DRIVER_OFFER_COUNT);
};

const updateDriverLocation = async (driverId, lng, lat, heading = 0) => {
  if (!isValidCoordinates(lng, lat)) {
    throw new Error('Invalid coordinates');
  }

  return Driver.findByIdAndUpdate(
    driverId,
    {
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      heading,
      lastLocationUpdate: new Date(),
    },
    { new: true, runValidators: true }
  );
};

const setDriverAvailability = async (driverId, isAvailable) => {
  const driver = await Driver.findById(driverId);

  if (!driver) {
    throw new Error('Driver not found');
  }

  if (driver.isOnTrip) {
    throw new Error('Cannot change availability while on an active trip');
  }

  driver.isAvailable = isAvailable;
  await driver.save();

  return driver;
};

const getDriverByUserId = async (userId) => {
  return Driver.findOne({ user: userId });
};

const releaseDriver = async (driverId, makeAvailable = true) => {
  const updates = {
    isOnTrip: false,
  };

  if (makeAvailable) {
    updates.isAvailable = true;
  }

  return Driver.findByIdAndUpdate(driverId, updates, {
    new: true,
    runValidators: true,
  });
};

module.exports = {
  findNearbyDrivers,
  updateDriverLocation,
  setDriverAvailability,
  getDriverByUserId,
  releaseDriver,
};
