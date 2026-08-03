// require('dotenv').config();
// Local Node only. Resolve server/.env explicitly rather than relying on the
// working directory, so the server starts the same way from server/ or the
// repo root. On Cloudflare Workers there is no .env file and no __dirname —
// the values arrive on process.env from the Worker's vars and secrets.
if (typeof __dirname !== 'undefined') {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5500,

  upload: {
    // Product images go to Supabase Storage; this is only the size cap.
    bucket: process.env.SUPABASE_IMAGE_BUCKET || 'product-images',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
  },
};

// Validate required env variables in production.
//
// On Cloudflare this runs while the Worker is being validated at deploy time,
// so a missing value fails the deploy rather than shipping a broken Worker.
// Report every missing name at once and say where to set them — a bare
// "Missing SUPABASE_URL" sends people to the wrong screen. These are runtime
// SECRETS on the Worker; Workers Builds "Build variables" are a different
// setting that only exists while `vite build` runs and never reaches
// process.env at request time (that is where the VITE_* values belong).
if (config.env === 'production') {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
        'On Cloudflare set these as Worker secrets — Workers & Pages > your Worker > ' +
        'Settings > Variables and Secrets > Add > type "Secret" — or run ' +
        `${missing.map((k) => `\`npx wrangler secret put ${k}\``).join(' and ')}. ` +
        'Note that Workers Builds "Build variables" are a separate setting and are ' +
        'NOT visible to the Worker at runtime.'
    );
  }
}

module.exports = config;