require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5500,

  upload: {
    // Product images go to Supabase Storage; this is only the size cap.
    bucket: process.env.SUPABASE_IMAGE_BUCKET || 'product-images',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
  },
};

// Validate required env variables in production
if (config.env === 'production') {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  required.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
}

module.exports = config;