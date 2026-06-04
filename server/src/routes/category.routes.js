const router = require('express').Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

// Admin routes
router.post('/', authenticate, authorize('super_admin', 'product_manager'), categoryController.createCategory);
router.put('/:id', authenticate, authorize('super_admin', 'product_manager'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('super_admin', 'product_manager'), categoryController.deleteCategory);

module.exports = router;