const router = require('express').Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// All analytics routes are protected and accessible to admins and viewers
router.use(authenticate);
router.use(authorize('super_admin', 'order_manager', 'viewer'));

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/revenue', analyticsController.getRevenueReport);
router.get('/sales', analyticsController.getSalesReport);
router.get('/products', analyticsController.getProductPerformance);
router.get('/customers', analyticsController.getCustomerInsights);
router.get('/inventory', analyticsController.getInventoryReport);
router.get('/order-trends', analyticsController.getOrderTrends);
router.get('/pricing-history', analyticsController.getPricingHistory);

module.exports = router;