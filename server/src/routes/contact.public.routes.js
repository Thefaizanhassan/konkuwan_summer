const router = require('express').Router();
const contactController = require('../controllers/contact.controller');
 
// Public — no auth. Global rate limiter in app.js applies.
router.post('/buyer', contactController.submitBuyer);
router.post('/investor', contactController.submitInvestor);
 
module.exports = router;