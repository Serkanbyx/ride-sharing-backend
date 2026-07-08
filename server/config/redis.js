const { createClient } = require('redis');
const env = require('./env');

const attachClientEvents = (client, label) => {
  client.on('connect', () => {
    console.log(`${label} connecting`);
  });

  client.on('error', (error) => {
    console.error(`${label} error:`, error.message);
  });

  client.on('reconnecting', () => {
    console.log(`${label} reconnecting`);
  });
};

const redisClient = createClient({ url: env.REDIS_URL });
const redisSubscriber = createClient({ url: env.REDIS_URL });

attachClientEvents(redisClient, 'Redis client');
attachClientEvents(redisSubscriber, 'Redis subscriber');

const connectRedis = async () => {
  try {
    await redisClient.connect();
    await redisSubscriber.connect();
    console.log('Redis connected');
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  redisClient,
  redisSubscriber,
  connectRedis,
};
