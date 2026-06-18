const router = require('express').Router();
const productController = require('../controllers/product.controller');

router.get('/', productController.getProducts);
router.get('/:slug', productController.getProductBySlug);

module.exports = router;