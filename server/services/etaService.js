const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const { redisClient } = require('../config/redis');
const { getDistanceAndDuration } = require('./fareService');
const { emitToTrip } = require('../sockets/emitters');

const ETA_CACHE_TTL_SECONDS = 30;
const ETA_ELIGIBLE_STATUSES = ['accepted', 'driver_arriving'];

const getEtaCacheKey = (driverLng, driverLat, pickupLng, pickupLat) => {
  return `eta:${driverLng},${driverLat}:${pickupLng},${pickupLat}`;
};

const getCachedEta = async (cacheKey) => {
  try {
    if (!redisClient.isOpen) {
      return null;
    }

    const cached = await redisClient.get(cacheKey);
    return cached ? Number(cached) : null;
  } catch {
    return null;
  }
};

const setCachedEta = async (cacheKey, etaSeconds) => {
  try {
    if (!redisClient.isOpen) {
      return;
    }

    await redisClient.setEx(
      cacheKey,
      ETA_CACHE_TTL_SECONDS,
      etaSeconds.toString()
    );
  } catch {
    // Cache failures should not block ETA calculation
  }
};

const calculateEta = async (driverLng, driverLat, pickupLng, pickupLat) => {
  const cacheKey = getEtaCacheKey(driverLng, driverLat, pickupLng, pickupLat);
  const cachedEta = await getCachedEta(cacheKey);

  if (cachedEta !== null) {
    return cachedEta;
  }

  const { durationSeconds } = await getDistanceAndDuration(
    driverLng,
    driverLat,
    pickupLng,
    pickupLat
  );

  await setCachedEta(cacheKey, durationSeconds);

  return durationSeconds;
};

const updateTripEta = async (tripId) => {
  const trip = await Trip.findById(tripId);

  if (!trip || !ETA_ELIGIBLE_STATUSES.includes(trip.status) || !trip.driver) {
    return null;
  }

  const driver = await Driver.findById(trip.driver);

  if (!driver) {
    return null;
  }

  const [pickupLng, pickupLat] = trip.pickup.coordinates;
  const [driverLng, driverLat] = driver.location.coordinates;

  const etaSeconds = await calculateEta(
    driverLng,
    driverLat,
    pickupLng,
    pickupLat
  );

  trip.eta = etaSeconds;
  await trip.save();

  emitToTrip(trip._id.toString(), 'eta_update', {
    tripId: trip._id.toString(),
    etaSeconds,
  });

  return etaSeconds;
};

module.exports = {
  calculateEta,
  updateTripEta,
};
