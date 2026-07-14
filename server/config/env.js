require('dotenv').config();

const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
};

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const parseNumber = (key, defaultValue) => {
  const rawValue = process.env[key];
  if (rawValue === undefined || rawValue === '') {
    return defaultValue;
  }

  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable: ${key}`);
  }

  return parsed;
};

const NODE_ENV = getEnv('NODE_ENV', 'development');
const JWT_SECRET = requireEnv('JWT_SECRET');
const CLIENT_URL = getEnv('CLIENT_URL', 'http://localhost:5173');

if (NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

if (
  NODE_ENV === 'production' &&
  (!CLIENT_URL || CLIENT_URL === '*' || CLIENT_URL.includes('*'))
) {
  throw new Error('CLIENT_URL must be a specific origin in production');
}

const env = Object.freeze({
  NODE_ENV,
  PORT: parseNumber('PORT', 3000),
  MONGODB_URI: requireEnv('MONGODB_URI'),
  REDIS_URL: requireEnv('REDIS_URL'),
  JWT_SECRET,
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
  CLIENT_URL,
  STRIPE_SECRET_KEY: requireEnv('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: requireEnv('STRIPE_WEBHOOK_SECRET'),
  GOOGLE_MAPS_API_KEY: requireEnv('GOOGLE_MAPS_API_KEY'),
  BASE_FARE: parseNumber('BASE_FARE', 2.5),
  PER_KM_RATE: parseNumber('PER_KM_RATE', 1.2),
  PER_MINUTE_RATE: parseNumber('PER_MINUTE_RATE', 0.25),
  SURGE_MULTIPLIER: parseNumber('SURGE_MULTIPLIER', 1.5),
  RUSH_HOUR_START: parseNumber('RUSH_HOUR_START', 7),
  RUSH_HOUR_END: parseNumber('RUSH_HOUR_END', 9),
  DRIVER_SEARCH_RADIUS_METERS: parseNumber('DRIVER_SEARCH_RADIUS_METERS', 5000),
  DRIVER_OFFER_COUNT: parseNumber('DRIVER_OFFER_COUNT', 3),
  TRIP_REQUEST_TIMEOUT_MS: parseNumber('TRIP_REQUEST_TIMEOUT_MS', 30000),
  LOCATION_UPDATE_INTERVAL_MS: parseNumber('LOCATION_UPDATE_INTERVAL_MS', 5000),
});

module.exports = env;
