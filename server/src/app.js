const express = require('express');
const authRoutes = require('./routes/auth.routes');

const userAdminRoutes = require('./routes/user.admin.routes');
const auditAdminRoutes = require('./routes/audit.admin.routes');
const settingsAdminRoutes = require('./routes/settings.admin.routes');

const customerAdminRoutes = require('./routes/customer.admin.routes');
const orderAdminRoutes = require('./routes/order.admin.routes');

// Product routes
const productPublicRoutes = require('./routes/product.public.routes');
const productAdminRoutes = require('./routes/product.admin.routes');

// Category routes
const categoryPublicRoutes = require('./routes/category.public.routes');
const categoryAdminRoutes = require('./routes/category.admin.routes');

const analyticsAdminRoutes = require('./routes/analytics.admin.routes');
const farmAdminRoutes = require('./routes/farm.admin.routes');

// Contact routes
const contactPublicRoutes = require('./routes/contact.public.routes');
const contactAdminRoutes = require('./routes/contact.admin.routes');

const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Security headers ──
app.use(helmet());

// ── CORS ──
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// ── Rate limiting ──
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ── Body parsing ──
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Compression ──
app.use(compression());

// ── Serve uploaded files (future product images) ──
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', config.upload.dir))
);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Placeholder routes (will be populated later) ──
// app.use('/api/auth', require('./routes/auth.routes'));
// Mount after body parsing and before 404
// ── API Routes ──
// Authentication
app.use('/api/auth', authRoutes);

app.use('/api/admin/users', userAdminRoutes);
app.use('/api/admin/audit-logs', auditAdminRoutes);
app.use('/api/admin/settings', settingsAdminRoutes);

app.use('/api/admin/analytics', analyticsAdminRoutes);
app.use('/api/admin/farm', farmAdminRoutes);

app.use('/api/admin/customers', customerAdminRoutes);
app.use('/api/admin/orders', orderAdminRoutes);

// Products
app.use('/api/products', productPublicRoutes);
app.use('/api/admin/products', productAdminRoutes);

// Categories
app.use('/api/categories', categoryPublicRoutes);
app.use('/api/admin/categories', categoryAdminRoutes);
 
// Contact (public form + admin inbox)
app.use('/api/contact', contactPublicRoutes);
app.use('/api/admin/contact', contactAdminRoutes);
// app.use('/api/products', require('./routes/product.routes'));

// ── Catch-all 404 ──
app.use(notFound);

// ── Global error handler ──
app.use(errorHandler);

module.exports = app;