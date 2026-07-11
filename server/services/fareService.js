const { Client } = require('@googlemaps/google-maps-services-js');
const env = require('../config/env');
const { redisClient } = require('../config/redis');

const mapsClient = new Client({});

const CACHE_TTL_SECONDS = 300;

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

const getCacheKey = (originLng, originLat, destLng, destLat) => {
  return `fare:${originLng},${originLat}:${destLng},${destLat}`;
};

const getCachedDistance = async (cacheKey) => {
  try {
    if (!redisClient.isOpen) {
      return null;
    }

    const cached = await redisClient.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setCachedDistance = async (cacheKey, data) => {
  try {
    if (!redisClient.isOpen) {
      return;
    }

    await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(data));
  } catch {
    // Cache failures should not block fare calculation
  }
};

const getDistanceAndDuration = async (
  originLng,
  originLat,
  destLng,
  destLat
) => {
  if (!isValidCoordinates(originLng, originLat)) {
    throw new Error('Invalid origin coordinates');
  }

  if (!isValidCoordinates(destLng, destLat)) {
    throw new Error('Invalid destination coordinates');
  }

  const cacheKey = getCacheKey(originLng, originLat, destLng, destLat);
  const cached = await getCachedDistance(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await mapsClient.distancematrix({
    params: {
      origins: [`${originLat},${originLng}`],
      destinations: [`${destLat},${destLng}`],
      key: env.GOOGLE_MAPS_API_KEY,
    },
  });

  const element = response.data.rows?.[0]?.elements?.[0];

  if (!element || element.status !== 'OK') {
    throw new Error('Unable to calculate distance and duration for this route');
  }

  const result = {
    distanceMeters: element.distance.value,
    durationSeconds: element.duration.value,
  };

  await setCachedDistance(cacheKey, result);

  return result;
};

const isRushHour = () => {
  const currentHour = new Date().getHours();
  return currentHour >= env.RUSH_HOUR_START && currentHour < env.RUSH_HOUR_END;
};

const calculateFare = (distanceMeters, durationSeconds) => {
  const km = distanceMeters / 1000;
  const minutes = durationSeconds / 60;
  let fare =
    env.BASE_FARE + km * env.PER_KM_RATE + minutes * env.PER_MINUTE_RATE;

  const surgeMultiplier = isRushHour() ? env.SURGE_MULTIPLIER : 1;

  if (surgeMultiplier > 1) {
    fare *= surgeMultiplier;
  }

  const estimatedFare = Math.round(fare * 100) / 100;

  return {
    estimatedFare,
    surgeMultiplier,
    distanceMeters,
    durationSeconds,
  };
};

const estimateTripFare = async (pickupLng, pickupLat, destLng, destLat) => {
  const { distanceMeters, durationSeconds } = await getDistanceAndDuration(
    pickupLng,
    pickupLat,
    destLng,
    destLat
  );

  return calculateFare(distanceMeters, durationSeconds);
};

module.exports = {
  getDistanceAndDuration,
  isRushHour,
  calculateFare,
  estimateTripFare,
};
