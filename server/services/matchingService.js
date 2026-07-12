const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const env = require('../config/env');
const { redisClient } = require('../config/redis');
const { REDIS_CHANNELS } = require('../utils/constants');
const { findNearbyDrivers } = require('./driverService');
const { transitionTrip } = require('./tripStateService');

const offerTimeouts = new Map();

const publishMessage = async (channel, message) => {
  if (!redisClient.isOpen) {
    return;
  }

  await redisClient.publish(channel, JSON.stringify(message));
};

const buildTripOfferMessage = (trip, driverId, passenger) => {
  const [pickupLng, pickupLat] = trip.pickup.coordinates;
  const [destLng, destLat] = trip.destination.coordinates;

  return {
    type: 'trip_offer',
    driverId: driverId.toString(),
    tripId: trip._id.toString(),
    pickup: { lng: pickupLng, lat: pickupLat },
    pickupAddress: trip.pickupAddress,
    destination: { lng: destLng, lat: destLat },
    destinationAddress: trip.destinationAddress,
    estimatedFare: trip.estimatedFare,
    passenger: {
      name: passenger.name,
      rating: passenger.averageRating,
    },
  };
};

const buildOfferCancelMessage = (tripId, driverId) => {
  return {
    type: 'offer_cancelled',
    driverId: driverId.toString(),
    tripId: tripId.toString(),
    reason: 'assigned_to_another_driver',
  };
};

const clearOfferTimeout = (tripId) => {
  const timeoutId = offerTimeouts.get(tripId.toString());

  if (timeoutId) {
    clearTimeout(timeoutId);
    offerTimeouts.delete(tripId.toString());
  }
};

const handleOfferTimeout = async (tripId) => {
  const trip = await Trip.findById(tripId);

  if (!trip || trip.status !== 'requested') {
    return;
  }

  await transitionTrip(tripId, 'cancelled', {
    cancelledBy: 'system',
    cancellationReason: 'No driver accepted within timeout',
  });

  // Socket trip_timeout emission wired in STEP 29

  offerTimeouts.delete(tripId.toString());
};

const dispatchTripOffers = async (trip) => {
  const [pickupLng, pickupLat] = trip.pickup.coordinates;
  const nearbyDrivers = await findNearbyDrivers(pickupLng, pickupLat);

  if (!nearbyDrivers.length) {
    return transitionTrip(trip._id, 'cancelled', {
      cancelledBy: 'system',
      cancellationReason: 'No drivers available',
    });
  }

  trip.offeredDrivers = nearbyDrivers.map((driver) => driver._id);
  await trip.save();

  await trip.populate('passenger', 'name averageRating');

  for (const driver of nearbyDrivers) {
    const message = buildTripOfferMessage(trip, driver._id, trip.passenger);
    await publishMessage(REDIS_CHANNELS.TRIP_OFFERS, message);
  }

  clearOfferTimeout(trip._id);

  const timeoutId = setTimeout(() => {
    handleOfferTimeout(trip._id).catch((error) => {
      console.error('Trip offer timeout failed:', error.message);
    });
  }, env.TRIP_REQUEST_TIMEOUT_MS);

  offerTimeouts.set(trip._id.toString(), timeoutId);

  return trip;
};

const handleDriverAccept = async (driverId, tripId) => {
  const trip = await Trip.findOneAndUpdate(
    {
      _id: tripId,
      status: 'requested',
      offeredDrivers: driverId,
      driver: null,
    },
    {
      driver: driverId,
    },
    { new: true }
  );

  if (!trip) {
    throw new Error('Trip is no longer available for this driver');
  }

  const updatedTrip = await transitionTrip(tripId, 'accepted');

  await Driver.findByIdAndUpdate(driverId, {
    isOnTrip: true,
    isAvailable: false,
  });

  const otherDrivers = trip.offeredDrivers.filter(
    (id) => id.toString() !== driverId.toString()
  );

  for (const otherDriverId of otherDrivers) {
    const message = buildOfferCancelMessage(tripId, otherDriverId);
    await publishMessage(REDIS_CHANNELS.TRIP_CANCEL, message);
  }

  clearOfferTimeout(tripId);

  return updatedTrip;
};

module.exports = {
  dispatchTripOffers,
  handleDriverAccept,
  handleOfferTimeout,
  clearOfferTimeout,
};
