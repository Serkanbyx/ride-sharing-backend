const Trip = require('../models/Trip');
const { TRIP_STATUS_TRANSITIONS } = require('../utils/constants');

const TERMINAL_STATUSES = ['completed', 'cancelled'];

const canTransition = (currentStatus, newStatus) => {
  const allowedTransitions = TRIP_STATUS_TRANSITIONS.get(currentStatus) || [];
  return allowedTransitions.includes(newStatus);
};

const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

const transitionTrip = async (tripId, newStatus, metadata = {}) => {
  const trip = await Trip.findById(tripId);

  if (!trip) {
    throw new Error('Trip not found');
  }

  if (isTerminal(trip.status)) {
    throw new Error('Trip is in a terminal state');
  }

  if (!canTransition(trip.status, newStatus)) {
    throw new Error('Invalid status transition');
  }

  const now = new Date();
  trip.status = newStatus;

  switch (newStatus) {
    case 'accepted':
      trip.acceptedAt = now;
      break;
    case 'in_progress':
      trip.startedAt = now;
      break;
    case 'completed':
      trip.completedAt = now;
      if (trip.finalFare == null && trip.estimatedFare != null) {
        trip.finalFare = trip.estimatedFare;
      }
      break;
    case 'cancelled':
      trip.cancelledAt = now;
      if (metadata.cancelledBy) {
        trip.cancelledBy = metadata.cancelledBy;
      }
      if (metadata.cancellationReason) {
        trip.cancellationReason = metadata.cancellationReason;
      }
      break;
    default:
      break;
  }

  if (metadata.eta !== undefined) {
    trip.eta = metadata.eta;
  }

  await trip.save();

  // Socket trip_status_change emission wired in STEP 29

  return trip;
};

module.exports = {
  canTransition,
  isTerminal,
  transitionTrip,
};
