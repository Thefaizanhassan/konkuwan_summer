const router = require('express').Router();
const farmController = require('../controllers/farm.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.use(authorize('super_admin', 'farm_manager'));

router.get('/crops', farmController.getCrops);
router.put('/crops/:cropId', farmController.updateCrop);
router.post('/crops/:cropId/pop', farmController.generatePOP);
router.get('/crops/:cropId/observations', farmController.getObservations);
router.post('/crops/:cropId/observations', farmController.addObservation);
router.get('/expenses', farmController.getExpenses);
router.post('/expenses', farmController.addExpense);
router.delete('/expenses/:id', farmController.deleteExpense);
router.get('/farmers', farmController.getFarmers);
router.post('/farmers', farmController.addFarmer);
router.delete('/farmers/:id', farmController.deleteFarmer);
router.post('/farmers/:id/visits', farmController.addVisit);
router.get('/cash', farmController.getCash);
router.put('/cash', farmController.updateCash);
router.get('/finance-settings', farmController.getFinanceSettings);
router.post('/warroom-brief', farmController.generateBrief);
router.get('/warroom-briefs', farmController.getBriefs);
router.get('/analytics', farmController.getFarmAnalytics);

module.exports = router;