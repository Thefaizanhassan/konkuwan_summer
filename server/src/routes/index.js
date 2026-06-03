const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/products', require('./product.routes')); // public product routes
router.use('/admin/products', require('./product.routes')); // admin prefix will be set externally
// But we want /api/products and /api/admin/products. Let's reorganize: better to have two separate router files or mount twice.

// Instead, in app.js we can mount:
//   /api/products  → product public router (with public methods only)
//   /api/admin/products → product admin router (with admin methods only)
// We'll split the product routes into two files for clarity. Let's do that.

module.exports = router;