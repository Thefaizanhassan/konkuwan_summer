const router = require('express').Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload'); // multer instance

router.use(authenticate);
router.use(authorize('super_admin', 'product_manager'));

router.get('/', productController.getProducts);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Images
router.post('/:id/images', upload.array('images', 5), productController.uploadProductImages);
router.post('/:id/images/link', productController.linkProductImage);
router.put('/:id/images/:imageId/primary', productController.setPrimaryImage);
router.delete('/:id/images/:imageId', productController.deleteProductImage);

module.exports = router;