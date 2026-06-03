const router = require('express').Router();
const productController = require('../controllers/product.controller');

router.get('/', productController.getAllProducts);
router.get('/:slug', productController.getProductBySlug);

module.exports = router;