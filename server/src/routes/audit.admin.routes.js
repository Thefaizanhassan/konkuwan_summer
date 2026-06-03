const router = require('express').Router();
const auditController = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middlewares/auth1');

router.use(authenticate);
router.use(authorize('super_admin', 'order_manager', 'viewer')); // viewer can see logs

router.get('/', auditController.getLogs);
module.exports = router;