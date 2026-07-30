

const router = require('express').Router();
const challanController = require('../controllers/challan.controller');
const { authenticate, authorize } = require('../middlewares/auth');
 
router.use(authenticate);
router.use(authorize('super_admin', 'farm_manager', 'order_manager'));
 
router.get('/', challanController.getAllChallans);
router.get('/:id', challanController.getChallanById);
router.post('/', challanController.createChallan);
router.delete('/:id', challanController.deleteChallan);
 
module.exports = router;