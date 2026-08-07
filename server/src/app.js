// MUST come first: this runs dotenv.config(), and modules required below
// read process.env while they are being loaded.
require('./config');

const express = require('express');

const meRoutes = require('./routes/me.routes');
const userAdminRoutes = require('./routes/user.admin.routes');
const auditAdminRoutes = require('./routes/audit.admin.routes');
const settingsAdminRoutes = require('./routes/settings.admin.routes');

const customerAdminRoutes = require('./routes/customer.admin.routes');
const orderAdminRoutes = require('./routes/order.admin.routes');
const challanAdminRoutes = require('./routes/challan.admin.routes');
const warehouseAdminRoutes = require('./routes/warehouse.admin.routes');

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

// const config = require('./config');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Security headers ──
// These land on `/api/*` responses only. On Workers, `run_worker_first` routes
// just the API through Express — the SPA is served by Static Assets and never
// reaches this middleware, so the headers protecting the *page* are generated
// into client/dist/_headers at build time (see client/vite-plugin-headers.js).
// Keep the two in step.
//
// CSP is off here on purpose: a JSON response has no scripts, styles or frames
// to restrict, and a second policy on this path would only be one more thing to
// keep aligned with the real one.
app.use(helmet({ contentSecurityPolicy: false }));

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

// New product images go to Supabase Storage and are stored as absolute URLs.
// Rows created before that change hold relative paths like
// /uploads/products/x.jpg, and those files may still exist on a developer's
// disk — so keep serving them locally rather than breaking old images.
// Skipped entirely on Workers, which has no such directory.
if (typeof __dirname !== 'undefined') {
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
  }
}

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
app.use('/api/admin/warehouses', warehouseAdminRoutes);

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

// ── Single-page app ──
//
// Only used when running as a container or a plain Node process. On Cloudflare
// the SPA is served by Workers Static Assets and never reaches Express, which
// is why this is guarded on the directory existing rather than on NODE_ENV:
// the bundle has no __dirname and no client/dist, so it is skipped there.
//
// Registered after every /api route so an unknown API path still 404s as JSON
// instead of being answered with index.html.
if (typeof __dirname !== 'undefined') {
  const fs = require('fs');
  const path = require('path');
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    // The document headers. client/dist/_headers carries these on Cloudflare,
    // but that file is consumed by Static Assets and means nothing to Express —
    // so a container would otherwise serve the SPA with no CSP at all. Same
    // policy, applied by whichever runtime is actually serving the page.
    const supabaseOrigin = (() => {
      try { return new URL(process.env.SUPABASE_URL).origin; } catch { return ''; }
    })();
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self'",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
      `connect-src 'self' ${supabaseOrigin}`.trim(),
    ].join('; ');
 
    const documentHeaders = (res) => {
      res.setHeader('Content-Security-Policy', csp);
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
    };
 
    // _headers and _redirects are Cloudflare deployment metadata. Static Assets
    // consumes them and never serves them; express.static would hand them out
    // as files, so exclude them explicitly (dotfiles:'ignore' does not apply —
    // they start with an underscore, not a dot).
    app.use(['/_headers', '/_redirects'], (req, res) => res.status(404).end());
 
    app.use(express.static(clientDist, {
      // index.html is served by the catch-all below, which sets the document
      // headers; letting static serve it too would bypass them.
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res, filePath) => {
        // Hashed filenames are content-addressed, so they can be cached hard.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
 
    // Client-side routing: any non-API path renders the app.
    //
    // /assets/ is excluded on purpose. Answering a missing bundle with
    // index.html returns HTML under a .js content type, which the browser
    // rejects with a confusing MIME error and which hides the real problem —
    // a stale index.html pointing at a hash that is no longer deployed.
    app.get(/^(?!\/(api|assets)\/).*/, (req, res) => {
      documentHeaders(res);
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
 
    logger.info('Serving the SPA from client/dist');
  }
}

// ── Catch-all 404 ──
app.use(notFound);

// ── Global error handler ──
app.use(errorHandler);

module.exports = app;