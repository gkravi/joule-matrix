const express = require('express');
const testController = require('./../controllers/testController');
const authController = require('./../controllers/authController');
const reportRouter = require('./../routes/reportRoutes');
const MQService = require('../services/MQService');

const router = express.Router();

// router.param('id', testController.checkID);

// POST /test/3434fd3/reports
// GET /test/ds4r4534/reports
// GET /test/45dfgsgvf/reports/4r5rdfsr

router.use('/:testId/reports', reportRouter);

/**
 * @swagger
 * /api/v1/tests/top-5-tests:
 *  get:
 *   description: This is the api for Visual testing
 *   responses:
 *    '200':
 *      description: A successful response
 */
router
	.route('/top-5-tests')
	.get(testController.aliasTopTests, testController.getAllTests);

/**
 * @swagger
 * /api/v1/tests/test-stats:
 *  get:
 *   description: This is the api for Visual testing
 *   responses:
 *    '200':
 *      description: A successful response
 */
router.route('/test-stats').get(testController.getTestStats);

router
	.route('/')
	.get(testController.getAllTests)
	.post(
		authController.protect,
		authController.restrictTo('admin', 'test-user'),
		testController.createTest
	);
router
	.route('/:id')
	.get(testController.getTest)
	.patch(
		authController.protect,
		authController.restrictTo('admin', 'test-user'),
		testController.updateTest
	)
	.delete(
		authController.protect,
		authController.restrictTo('admin', 'test-user'),
		testController.deleteTest
	);

/**
 * @swagger
 * /api/v1/tests/:testId/trigger:
 *  post:
 *   description: This is the api for Visual testing
 *   responses:
 *    '200':
 *      description: A successful response
 */
router
	.route('/:testId/trigger')
	.post(
		authController.protect,
		testController.publishTask
	);
router
	.route('/:tenantId/triggerAll')
	.post(authController.protect, testController.triggerTestByTenant);
router
	.route('/:testId/approve')
	.patch(authController.protect, testController.approveTest);

router
	.route('/:tenantId/approveAll')
	.patch(authController.protect, testController.approveAllTest);
router
	.route('/:testId/isApproved')
	.get(authController.protect, testController.isTestApproved);

router
	.route('/:tenantId/isAllApproved')
	.get(authController.protect, testController.isAllTestApproved);
// MIDDLEWARE to protect all route after this
router.use(
	authController.protect,
	authController.restrictTo('user', 'admin', 'test-user', 'report-user')
);

/**
 * @swagger
 * /api/v1/tests/imagediff:
 *  post:
 *   description: This is the api for Visual testing
 *   responses:
 *    '200':
 *      description: A successful response
 */
router.route('/imagediff').post(testController.mesureImageDiff);

/**
 * @swagger
 * /api/v1/tests/takescreenshot:
 *  post:
 *   description: This is the api for Visual testing
 *   responses:
 *    '200':
 *      description: A successful response
 */
router.route('/takescreenshot').post(testController.takeScreenShot);
/**
 * @swagger
 * /api/v1/tests/monthly-tests/:year:
 *  get:
 *   description: This is the api for Visual testing
 *   responses:
 *    '200':
 *      description: A successful response
 */
router.route('/monthly-tests/:year').get(testController.getMonthlyTests);

module.exports = router;
