const router = require('express').Router();
const orderController = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middlewares/auth1');

router.use(authenticate);
router.use(authorize('super_admin', 'order_manager'));

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id/status', orderController.updateOrderStatus);
router.put('/:id/items/:itemId/final-price', orderController.setFinalPrice);
router.get('/:id/invoice', orderController.generateInvoice);

module.exports = router;