const { redisSubscriber } = require('../config/redis');
const { REDIS_CHANNELS } = require('../utils/constants');

const parseMessage = (message) => {
  if (typeof message !== 'string') {
    return null;
  }

  try {
    const data = JSON.parse(message);

    if (!data || typeof data !== 'object') {
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

const handleTripOffer = (io, data) => {
  if (!data.driverId || !data.tripId) {
    return;
  }

  io.to(`driver:${data.driverId}`).emit('trip_offer', {
    tripId: data.tripId,
    pickup: data.pickup,
    destination: data.destination,
    addresses: {
      pickup: data.pickupAddress,
      destination: data.destinationAddress,
    },
    estimatedFare: data.estimatedFare,
    passenger: data.passenger,
  });
};

const handleOfferCancelled = (io, data) => {
  if (!data.driverId || !data.tripId) {
    return;
  }

  io.to(`driver:${data.driverId}`).emit('offer_cancelled', {
    tripId: data.tripId,
    reason: data.reason || 'offer_cancelled',
  });
};

const initRedisBridge = async (io) => {
  if (!redisSubscriber.isOpen) {
    console.warn('Redis subscriber not connected; socket bridge skipped');
    return;
  }

  await redisSubscriber.subscribe(
    [REDIS_CHANNELS.TRIP_OFFERS, REDIS_CHANNELS.TRIP_CANCEL],
    (message, channel) => {
      const data = parseMessage(message);

      if (!data) {
        return;
      }

      if (channel === REDIS_CHANNELS.TRIP_OFFERS) {
        handleTripOffer(io, data);
        return;
      }

      if (channel === REDIS_CHANNELS.TRIP_CANCEL) {
        handleOfferCancelled(io, data);
      }
    }
  );
};

module.exports = {
  initRedisBridge,
};
