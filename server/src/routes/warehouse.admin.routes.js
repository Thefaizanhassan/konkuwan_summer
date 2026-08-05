const router = require('express').Router();
const warehouseController = require('../controllers/warehouse.controller');
const { authenticate, authorize } = require('../middlewares/auth');
 
router.use(authenticate);
 
// Anyone who can raise a challan needs to read the warehouse list to fill the
// source/destination fields.
router.get('/', authorize('super_admin', 'farm_manager', 'order_manager'), warehouseController.list);
router.get('/:id', authorize('super_admin', 'farm_manager', 'order_manager'), warehouseController.getOne);
 
// Managing the list itself is a super-admin action, like Settings.
router.post('/', authorize('super_admin'), warehouseController.create);
router.put('/:id', authorize('super_admin'), warehouseController.update);
router.patch('/:id/deactivate', authorize('super_admin'), warehouseController.deactivate);
router.delete('/:id', authorize('super_admin'), warehouseController.remove);
 
module.exports = router;