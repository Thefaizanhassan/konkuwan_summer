const express = require('express');

const meRoutes = require('./routes/me.routes');
const userAdminRoutes = require('./routes/user.admin.routes');
const auditAdminRoutes = require('./routes/audit.admin.routes');
const settingsAdminRoutes = require('./routes/settings.admin.routes');

const customerAdminRoutes = require('./routes/customer.admin.routes');
const orderAdminRoutes = require('./routes/order.admin.routes');
const challanAdminRoutes = require('./routes/challan.admin.routes');

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

const config = require('./config');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Security headers ──
app.use(helmet());

// ── CORS ──
// Not needed: the SPA and this API are served from the same Worker origin.
// If you ever split them into two Workers, re-add `cors({ origin: ... })`.

// ── Rate limiting ──
// Handled by Cloudflare WAF rate-limiting rules, not in-process. An in-memory
// limiter is per-isolate on Workers, so its counters reset constantly and the
// limit would be effectively unenforced.

// ── Body parsing ──
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Compression ──
// Cloudflare compresses at the edge; doing it again here only burns CPU.

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ──
// Authentication is handled by Supabase Auth in the client; this API only
// verifies the Supabase JWT (see middlewares/auth.js).
app.use('/api/me', meRoutes);

app.use('/api/admin/users', userAdminRoutes);
app.use('/api/admin/audit-logs', auditAdminRoutes);
app.use('/api/admin/settings', settingsAdminRoutes);

app.use('/api/admin/analytics', analyticsAdminRoutes);
app.use('/api/admin/farm', farmAdminRoutes);

app.use('/api/admin/customers', customerAdminRoutes);
app.use('/api/admin/orders', orderAdminRoutes);
app.use('/api/admin/challans', challanAdminRoutes);

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