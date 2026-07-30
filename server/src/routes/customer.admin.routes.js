const router = require('express').Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.use(authorize('super_admin', 'order_manager'));

router.get('/', customerController.getAllCustomers);
router.get('/export', customerController.exportCustomers); // must be before /:id
router.get('/:id/profile', customerController.getCustomerProfile);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);
router.post('/import', customerController.importCustomers);

module.exports = router;