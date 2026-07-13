const Trip = require('../models/Trip');
const {
  getDriverByUserId,
  updateDriverLocation,
} = require('../services/driverService');
const { emitToTrip } = require('./emitters');

const isTripParticipant = async (tripId, userId, role) => {
  const trip = await Trip.findById(tripId);

  if (!trip) {
    return { allowed: false, message: 'Trip not found' };
  }

  if (trip.passenger.toString() === userId) {
    return { allowed: true, trip };
  }

  if (role === 'driver') {
    const driver = await getDriverByUserId(userId);

    if (
      driver &&
      trip.driver &&
      trip.driver.toString() === driver._id.toString()
    ) {
      return { allowed: true, trip };
    }
  }

  return { allowed: false, message: 'You are not a participant of this trip' };
};

const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_trip', async ({ tripId } = {}) => {
      const { id: userId, role } = socket.user;

      if (!tripId) {
        socket.emit('error', { message: 'tripId is required' });
        return;
      }

      const participation = await isTripParticipant(tripId, userId, role);

      if (!participation.allowed) {
        socket.emit('error', { message: participation.message });
        return;
      }

      socket.join(`trip:${tripId}`);
    });

    socket.on('leave_trip', ({ tripId } = {}) => {
      if (!tripId) {
        return;
      }

      socket.leave(`trip:${tripId}`);
    });

    socket.on('driver_location_update', async ({ lng, lat, heading } = {}) => {
      const { id: userId, role } = socket.user;

      if (role !== 'driver') {
        socket.emit('error', { message: 'Driver access required' });
        return;
      }

      if (!socket.driverId) {
        socket.emit('error', { message: 'Driver profile not found' });
        return;
      }

      try {
        await updateDriverLocation(
          socket.driverId,
          Number(lng),
          Number(lat),
          heading !== undefined ? Number(heading) : 0
        );

        const activeTrip = await Trip.findOne({
          driver: socket.driverId,
          status: { $nin: ['completed', 'cancelled'] },
        });

        if (activeTrip) {
          emitToTrip(activeTrip._id.toString(), 'driver_location_update', {
            tripId: activeTrip._id.toString(),
            driverId: socket.driverId,
            lng: Number(lng),
            lat: Number(lat),
            heading: heading !== undefined ? Number(heading) : 0,
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
  });
};

module.exports = {
  isTripParticipant,
  registerSocketHandlers,
};
