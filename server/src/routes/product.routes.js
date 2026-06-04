const router = require('express').Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:slug', productController.getProductBySlug);

// Admin routes
router.post('/', authenticate, authorize('super_admin', 'product_manager'), productController.createProduct);
router.put('/:id', authenticate, authorize('super_admin', 'product_manager'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('super_admin', 'product_manager'), productController.deleteProduct);

// Image management
router.post(
  '/:id/images',
  authenticate,
  authorize('super_admin', 'product_manager'),
  upload.array('images', 5), // max 5 files
  productController.uploadProductImages
);
router.put(
  '/:id/images/:imageId/primary',
  authenticate,
  authorize('super_admin', 'product_manager'),
  productController.setPrimaryImage
);
router.delete(
  '/:id/images/:imageId',
  authenticate,
  authorize('super_admin', 'product_manager'),
  productController.deleteProductImage
);

module.exports = router;