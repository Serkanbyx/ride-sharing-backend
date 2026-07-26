const { Client } = require('@googlemaps/google-maps-services-js');
const env = require('../config/env');
const { redisClient } = require('../config/redis');

const mapsClient = new Client({});

const CACHE_TTL_SECONDS = 300;
const EARTH_RADIUS_METERS = 6371000;

// Straight-line distance underestimates real routes; scale it to approximate roads.
const ROUTE_DISTANCE_FACTOR = 1.3;

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

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const getHaversineDistanceMeters = (originLng, originLat, destLng, destLat) => {
  const deltaLat = toRadians(destLat - originLat);
  const deltaLng = toRadians(destLng - originLng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(originLat)) *
      Math.cos(toRadians(destLat)) *
      Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
};

const estimateDistanceAndDuration = (
  originLng,
  originLat,
  destLng,
  destLat
) => {
  const straightLineMeters = getHaversineDistanceMeters(
    originLng,
    originLat,
    destLng,
    destLat
  );
  const distanceMeters = Math.round(straightLineMeters * ROUTE_DISTANCE_FACTOR);
  const metersPerSecond = (env.FALLBACK_AVERAGE_SPEED_KMH * 1000) / 3600;

  return {
    distanceMeters,
    durationSeconds: Math.max(60, Math.round(distanceMeters / metersPerSecond)),
    estimated: true,
  };
};

const fetchDistanceFromMaps = async (
  originLng,
  originLat,
  destLng,
  destLat
) => {
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

  return {
    distanceMeters: element.distance.value,
    durationSeconds: element.duration.value,
    estimated: false,
  };
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

  let result;

  if (env.GOOGLE_MAPS_API_KEY) {
    try {
      result = await fetchDistanceFromMaps(
        originLng,
        originLat,
        destLng,
        destLat
      );
    } catch (error) {
      console.warn(
        `Distance Matrix lookup failed, using estimate: ${error.message}`
      );
    }
  }

  if (!result) {
    result = estimateDistanceAndDuration(
      originLng,
      originLat,
      destLng,
      destLat
    );
  }

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
  estimateDistanceAndDuration,
  isRushHour,
  calculateFare,
  estimateTripFare,
};
