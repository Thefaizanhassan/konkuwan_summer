const router = require('express').Router();
const contactController = require('../controllers/contact.controller');
const { authenticate, authorize } = require('../middlewares/auth');
 
router.use(authenticate);
router.use(authorize('super_admin', 'order_manager'));
 
router.get('/', contactController.getSubmissions);
router.patch('/:id/status', contactController.updateStatus);
router.delete('/:id', contactController.deleteSubmission);
 
module.exports = router;