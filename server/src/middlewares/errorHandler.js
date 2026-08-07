const logger = require('../utils/logger');

// A 4xx message is written for the person reading it — "Select a farmer, or
// choose Other and enter a name." — and must reach the client intact.
//
// A 5xx message is not. Controllers pass the raw Supabase/PostgREST error text
// so it gets logged, and that text carries table names, column names and
// constraint names. Returning it to the browser hands an attacker the schema.
// So in production a 5xx becomes a fixed sentence plus a correlation id: the
// user can quote the id in a bug report, and the real message is in the logs
// next to that same id.
const GENERIC_5XX = 'Something went wrong on our side. Please try again.';
 
// Short, unambiguous, and cheap — this is a log correlation handle, not a
// secret, so crypto-grade randomness would be beside the point.
const newErrorId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

const errorHandler = (err, req, res, _next) => {
  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const isServerError = statusCode >= 500;
 
  const context = {
    url: req.originalUrl,
    method: req.method,
    // Who hit it, so a repeated failure can be traced to an account without
    // logging the token or the body (either could contain credentials).
    user_id: req.user?.id,
    role: req.user?.profile?.role,
  };
 
  const body = { success: false };
 
  if (isServerError) {
    const errorId = newErrorId();
    logger.error(`[${errorId}] ${err.message}`, { ...context, stack: err.stack });
    body.error_id = errorId;
    body.message = process.env.NODE_ENV === 'production' ? GENERIC_5XX : err.message;
    if (process.env.NODE_ENV === 'development') body.stack = err.stack;
  } else {
    logger.warn(`${statusCode} - ${err.message}`, context);
    body.message = err.message || 'Request failed.';
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;