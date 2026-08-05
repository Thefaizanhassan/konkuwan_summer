const router = require('express').Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const STAFF = ['super_admin', 'order_manager', 'viewer'];

// All analytics routes are protected and accessible to admins and viewers
router.use(authenticate);

// A stakeholder reaches the dashboard and nothing else. The controller then
// reduces that one payload to the widgets they were granted, so the route
// check and the field filter are two separate gates: this one decides which
// endpoints exist for them, the filter decides which numbers come back.
router.get('/dashboard', authorize(...STAFF, 'stakeholder'), analyticsController.getDashboardStats);
 
router.use(authorize(...STAFF));

router.get('/revenue', analyticsController.getRevenueReport);
router.get('/sales', analyticsController.getSalesReport);
router.get('/products', analyticsController.getProductPerformance);
router.get('/customers', analyticsController.getCustomerInsights);
router.get('/inventory', analyticsController.getInventoryReport);
router.get('/order-trends', analyticsController.getOrderTrends);
router.get('/pricing-history', analyticsController.getPricingHistory);

module.exports = router;