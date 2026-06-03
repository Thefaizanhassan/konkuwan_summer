const logger = require('../utils/logger');

// Handle Sequelize validation errors (when we start using ORM)
const handleSequelizeValidationError = (err) => {
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    return { statusCode: 400, message: `Validation error: ${messages.join('. ')}` };
  }
  return null;
};

// Handle JWT errors
const handleJwtError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token. Please log in again.' };
  }
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Your token has expired. Please log in again.' };
  }
  return null;
};

const errorHandler = (err, req, res, _next) => {
  // Default to 500 Internal Server Error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Check known errors
  const sequelizeErr = handleSequelizeValidationError(err);
  if (sequelizeErr) {
    statusCode = sequelizeErr.statusCode;
    message = sequelizeErr.message;
  }

  const jwtErr = handleJwtError(err);
  if (jwtErr) {
    statusCode = jwtErr.statusCode;
    message = jwtErr.message;
  }

  // Log the error
  if (statusCode === 500) {
    logger.error('Internal Server Error', { stack: err.stack, url: req.originalUrl });
  } else {
    logger.warn(`${statusCode} - ${message}`, { url: req.originalUrl });
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      message,
      stack: err.stack,
    });
  } else {
    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

module.exports = errorHandler;