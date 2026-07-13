let io = null;

const setIo = (instance) => {
  io = instance;
};

const emitToTrip = (tripId, event, data) => {
  if (!io) {
    return;
  }

  io.to(`trip:${tripId}`).emit(event, data);
};

const emitToUser = (userId, event, data) => {
  if (!io) {
    return;
  }

  io.to(`user:${userId}`).emit(event, data);
};

const emitToDriver = (driverId, event, data) => {
  if (!io) {
    return;
  }

  io.to(`driver:${driverId}`).emit(event, data);
};

module.exports = {
  setIo,
  emitToTrip,
  emitToUser,
  emitToDriver,
};
