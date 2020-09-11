const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const router = express.Router();

router.get('/', authController.isLoggedIn, viewsController.getOverview);
router.get(
	'/tenant/:tenantSlug',
	authController.protect,
	viewsController.getTenantByEnroll
);
router.get(
	'/all-tests',
	authController.isLoggedIn,
	viewsController.getAllTests
);
router.get(
	'/enrolls/:tenantSlug/:enrollSlug',
	authController.protect,
	viewsController.getTestByEnroll
);
router.get('/test/:slug', authController.protect, viewsController.getTest);
router.get('/reports', authController.protect, viewsController.getReports);
router.get(
	'/reports/:reportId',
	authController.protect,
	viewsController.getReportOfTest
);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get(
	'/login/sso',
	authController.isLoggedIn,
	viewsController.getSSOLogin
);
router.get('/signup', viewsController.getSignupForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tests', authController.protect, viewsController.getMyTests);
router.get('/enroll', authController.protect, viewsController.getEnrollForm);
router.get(
	'/test/:slug/:reportId/report',
	authController.isLoggedIn,
	viewsController.getReportOfTest
);

router.post(
	'/submit-user-data',
	authController.protect,
	viewsController.updateUserData
);

module.exports = router;
