const router = require('express').Router();

const userAdminController = require('../controllers/user.admin.controller');

const {
  authenticate,
  authorize,
} = require('../middlewares/auth1');

router.use(authenticate);
router.use(authorize('super_admin'));

// Users
router.get('/', userAdminController.listUsers);

router.put('/:id', userAdminController.updateUser);

router.patch(
  '/:id/deactivate',
  userAdminController.deactivateUser
);

// Invite user
router.post(
  '/invite',
  userAdminController.inviteUser
);

module.exports = router;

// const router = require('express').Router();
// const adminController = require('../controllers/admin.controller');
// const { authenticate, authorize } = require('../middlewares/auth1');

// router.use(authenticate);
// router.use(authorize('super_admin')); // only super admin can manage users

// router.get('/', adminController.listUsers);
// router.get('/:id', adminController.getUser);
// router.post('/', adminController.createUser);
// router.put('/:id', adminController.updateUser);
// router.patch('/:id/deactivate', adminController.deactivateUser);

// module.exports = router;