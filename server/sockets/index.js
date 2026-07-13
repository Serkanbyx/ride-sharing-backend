const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const env = require('../config/env');
const User = require('../models/User');
const { getDriverByUserId } = require('../services/driverService');
const { registerSocketHandlers } = require('./handlers');
const { setIo, emitToTrip, emitToUser, emitToDriver } = require('./emitters');

let io = null;

const initSockets = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  setIo(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('Authentication required'));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
      };

      next();
    } catch {
      next(new Error('Authentication required'));
    }
  });

  registerSocketHandlers(io);

  io.on('connection', async (socket) => {
    const { id: userId, role } = socket.user;

    socket.join(`user:${userId}`);

    if (role === 'driver') {
      const driver = await getDriverByUserId(userId);

      if (driver) {
        socket.driverId = driver._id.toString();
        socket.join(`driver:${driver._id}`);
      }
    }

    if (env.NODE_ENV === 'development') {
      console.log(`Socket connected: user:${userId} (${role})`);
    }

    socket.on('disconnect', () => {
      if (env.NODE_ENV === 'development') {
        console.log(`Socket disconnected: user:${userId}`);
      }
    });
  });

  return io;
};

module.exports = {
  initSockets,
  emitToTrip,
  emitToUser,
  emitToDriver,
};

Object.defineProperty(module.exports, 'io', {
  enumerable: true,
  get() {
    return io;
  },
});
