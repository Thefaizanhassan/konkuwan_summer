const router = require('express').Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// All routes protected
router.use(authenticate);
router.use(authorize('super_admin', 'product_manager'));

router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Image management
router.post('/:id/images', upload.array('images', 5), productController.uploadProductImages);
router.put('/:id/images/:imageId/primary', productController.setPrimaryImage);
router.delete('/:id/images/:imageId', productController.deleteProductImage);

module.exports = router;