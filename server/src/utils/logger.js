// Cloudflare Workers has no persistent filesystem, so the previous Winston
// file transports (logs/error.log, logs/combined.log) wrote to nothing.
// Workers Logs captures console output automatically, so a console sink is the
// correct destination. The logger.info/warn/error/debug surface is unchanged,
// so every existing call site keeps working.
const LEVELS = ['error', 'warn', 'info', 'debug'];
const threshold = LEVELS.indexOf(
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'
);

const emit = (level, args) => {
  if (LEVELS.indexOf(level) > threshold) return;
  const meta = {
    level,
    service: 'konkuwan-api',
    timestamp: new Date().toISOString(),
  };
  // console.debug is not surfaced by every runtime — fall back to console.log.
  const sink = level === 'debug' ? console.log : console[level];
  sink(JSON.stringify(meta), ...args);
};

module.exports = {
  error: (...args) => emit('error', args),
  warn: (...args) => emit('warn', args),
  info: (...args) => emit('info', args),
  debug: (...args) => emit('debug', args),
};