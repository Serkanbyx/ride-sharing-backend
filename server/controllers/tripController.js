const Trip = require('../models/Trip');
const { estimateTripFare } = require('../services/fareService');
const {
  dispatchTripOffers,
  handleDriverAccept,
  clearOfferTimeout,
} = require('../services/matchingService');
const { transitionTrip, isTerminal } = require('../services/tripStateService');
const {
  getDriverByUserId,
  releaseDriver,
} = require('../services/driverService');
const { success, fail } = require('../utils/apiResponse');

const isTripParticipant = async (trip, user) => {
  if (trip.passenger.toString() === user._id.toString()) {
    return true;
  }

  if (user.role === 'driver' && trip.driver) {
    const driver = await getDriverByUserId(user._id);
    return driver && trip.driver.toString() === driver._id.toString();
  }

  return false;
};

const requestTrip = async (req, res, next) => {
  try {
    const {
      pickupLng,
      pickupLat,
      destLng,
      destLat,
      pickupAddress,
      destinationAddress,
    } = req.body;

    const activeTrip = await Trip.findOne({
      passenger: req.user._id,
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (activeTrip) {
      return fail(res, 'You already have an active trip', 400);
    }

    const fareDetails = await estimateTripFare(
      Number(pickupLng),
      Number(pickupLat),
      Number(destLng),
      Number(destLat)
    );

    const trip = await Trip.create({
      passenger: req.user._id,
      pickup: {
        type: 'Point',
        coordinates: [Number(pickupLng), Number(pickupLat)],
      },
      pickupAddress,
      destination: {
        type: 'Point',
        coordinates: [Number(destLng), Number(destLat)],
      },
      destinationAddress,
      status: 'requested',
      distanceMeters: fareDetails.distanceMeters,
      durationSeconds: fareDetails.durationSeconds,
      estimatedFare: fareDetails.estimatedFare,
      surgeMultiplier: fareDetails.surgeMultiplier,
    });

    await dispatchTripOffers(trip);

    const updatedTrip = await Trip.findById(trip._id);

    return success(res, updatedTrip, 201);
  } catch (error) {
    next(error);
  }
};

const acceptTrip = async (req, res, next) => {
  try {
    const driver = await getDriverByUserId(req.user._id);

    if (!driver) {
      return fail(res, 'Driver profile not found', 404);
    }

    const trip = await handleDriverAccept(driver._id, req.params.tripId);

    return success(res, trip);
  } catch (error) {
    if (error.message === 'Trip is no longer available for this driver') {
      return fail(res, 'Trip has already been assigned to another driver', 409);
    }

    next(error);
  }
};

const cancelTrip = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return fail(res, 'Trip not found', 404);
    }

    if (isTerminal(trip.status)) {
      return fail(res, 'Trip is already in a terminal state', 400);
    }

    const participant = await isTripParticipant(trip, req.user);

    if (!participant) {
      return fail(res, 'You are not authorized to cancel this trip', 403);
    }

    if (req.user.role === 'passenger' && trip.status === 'in_progress') {
      return fail(res, 'Passengers cannot cancel a trip that is in progress', 400);
    }

    const cancelledBy = req.user.role === 'driver' ? 'driver' : 'passenger';

    if (trip.status === 'requested') {
      clearOfferTimeout(trip._id);
    }

    const updatedTrip = await transitionTrip(trip._id, 'cancelled', {
      cancelledBy,
      cancellationReason: reason || 'Trip cancelled by user',
    });

    if (trip.driver) {
      await releaseDriver(trip.driver);
    }

    return success(res, updatedTrip);
  } catch (error) {
    if (error.message === 'Invalid status transition') {
      return fail(res, 'Trip cannot be cancelled in its current state', 400);
    }

    next(error);
  }
};

const updateTripStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return fail(res, 'Trip not found', 404);
    }

    if (isTerminal(trip.status)) {
      return fail(res, 'Trip is already in a terminal state', 400);
    }

    const participant = await isTripParticipant(trip, req.user);

    if (!participant) {
      return fail(res, 'You are not authorized to update this trip', 403);
    }

    if (req.user.role === 'passenger') {
      if (status !== 'cancelled') {
        return fail(res, 'Passengers can only cancel trips through this endpoint', 403);
      }

      if (trip.status === 'in_progress') {
        return fail(res, 'Passengers cannot cancel a trip that is in progress', 400);
      }

      if (trip.status === 'requested') {
        clearOfferTimeout(trip._id);
      }

      const updatedTrip = await transitionTrip(trip._id, 'cancelled', {
        cancelledBy: 'passenger',
        cancellationReason: reason || 'Trip cancelled by passenger',
      });

      if (trip.driver) {
        await releaseDriver(trip.driver);
      }

      return success(res, updatedTrip);
    }

    const driver = await getDriverByUserId(req.user._id);
    const allowedDriverStatuses = ['driver_arriving', 'in_progress', 'completed'];

    if (!allowedDriverStatuses.includes(status)) {
      return fail(res, 'Invalid status update for driver', 400);
    }

    if (!driver || trip.driver?.toString() !== driver._id.toString()) {
      return fail(res, 'You are not the assigned driver for this trip', 403);
    }

    const updatedTrip = await transitionTrip(trip._id, status, {
      cancellationReason: reason,
    });

    if (status === 'completed') {
      await releaseDriver(trip.driver, false);
    }

    return success(res, updatedTrip);
  } catch (error) {
    if (error.message === 'Invalid status transition') {
      return fail(res, 'Invalid status transition for current trip state', 400);
    }

    next(error);
  }
};

const getTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.tripId)
      .populate('passenger', 'name email phone averageRating')
      .populate({
        path: 'driver',
        populate: {
          path: 'user',
          select: 'name phone averageRating',
        },
      });

    if (!trip) {
      return fail(res, 'Trip not found', 404);
    }

    const participant = await isTripParticipant(trip, req.user);

    if (!participant) {
      return fail(res, 'You are not authorized to view this trip', 403);
    }

    return success(res, trip);
  } catch (error) {
    next(error);
  }
};

const getMyTrips = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const driver = await getDriverByUserId(req.user._id);
    const query = {
      $or: [{ passenger: req.user._id }],
    };

    if (driver) {
      query.$or.push({ driver: driver._id });
    }

    const [items, total] = await Promise.all([
      Trip.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('passenger', 'name averageRating')
        .populate({
          path: 'driver',
          populate: {
            path: 'user',
            select: 'name averageRating',
          },
        }),
      Trip.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return success(res, {
      items,
      page,
      totalPages,
      total,
    });
  } catch (error) {
    next(error);
  }
};

const getActiveTrip = async (req, res, next) => {
  try {
    const driver = await getDriverByUserId(req.user._id);
    const query = {
      status: { $nin: ['completed', 'cancelled'] },
      $or: [{ passenger: req.user._id }],
    };

    if (driver) {
      query.$or.push({ driver: driver._id });
    }

    const trip = await Trip.findOne(query)
      .sort({ createdAt: -1 })
      .populate('passenger', 'name phone averageRating')
      .populate({
        path: 'driver',
        populate: {
          path: 'user',
          select: 'name phone averageRating',
        },
      });

    return success(res, trip);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestTrip,
  acceptTrip,
  cancelTrip,
  updateTripStatus,
  getTrip,
  getMyTrips,
  getActiveTrip,
};
