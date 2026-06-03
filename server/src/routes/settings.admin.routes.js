const router = require('express').Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middlewares/auth1');

router.use(authenticate);
router.use(authorize('super_admin'));

router.get('/', settingsController.getAllSettings);
router.put('/', settingsController.updateSettings);
module.exports = router;