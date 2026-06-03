/**
 * Operational error with HTTP status code.
 * All operational errors thrown in the app should use this class.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;