const multer = require('multer');
const AppError = require('../utils/AppError');
const config = require('../config');

// Memory storage, not disk storage. Cloudflare Workers exposes only a virtual,
// per-request filesystem — anything written to disk is discarded when the
// request ends, so multer.diskStorage would report success and silently lose
// every upload. The buffer is handed straight to Supabase Storage instead
// (see product.controller.js → uploadProductImages).
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only .jpg, .png, and .webp image files are allowed.', 400), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter,
});

module.exports = upload;