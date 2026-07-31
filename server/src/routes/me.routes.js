const router = require('express').Router();
const meController = require('../controllers/me.controller');
const { authenticate } = require('../middlewares/auth');
 
// Any signed-in user can read and update their own preferences.
router.use(authenticate);
 
router.get('/', meController.getMe);
router.patch('/preferences', meController.updatePreferences);
 
module.exports = router;