const env = require('../config/env');

const notFound = (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
  }

  if (env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
  }

  if (env.NODE_ENV === 'development') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
