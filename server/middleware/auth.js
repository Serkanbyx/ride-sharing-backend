const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
};

const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch {
    next();
  }
};

const driverOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
  }

  if (req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Driver access required',
    });
  }

  next();
};

const passengerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
  }

  if (req.user.role !== 'passenger') {
    return res.status(403).json({
      success: false,
      message: 'Passenger access required',
    });
  }

  next();
};

module.exports = {
  protect,
  optionalAuth,
  driverOnly,
  passengerOnly,
};
