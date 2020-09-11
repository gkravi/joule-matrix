const express = require('express');
const reportController = require('./../controllers/reportController');
const authController = require('./../controllers/authController');
const router = express.Router({ mergeParams: true });

// POST /test/3434fd3/reports
// GET /test/ds4r4534/reports
// GET /test/45dfgsgvf/reports/4r5rdfsr

router.use(authController.protect);

router
	.route('/')
	.get(reportController.getAllReports)
	.post(
		authController.restrictTo('admin', 'test-user', 'report-user'),
		reportController.setTestUserIds,
		reportController.createReport
	);
router
	.route('/:id')
	.get(reportController.getReport)
	.patch(
		authController.restrictTo('admin', 'test-user', 'report-user'),
		reportController.updateReport
	)
	.delete(
		authController.restrictTo('admin', 'test-user', 'report-user'),
		reportController.deleteReport
	);

module.exports = router;
