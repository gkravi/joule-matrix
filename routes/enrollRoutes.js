const express = require('express');
const enrollController = require('./../controllers/enrollController');
const authController = require('./../controllers/authController');
const router = express.Router();

router.use(authController.protect);

router.route('/').get(enrollController.getAllEnrolls).post(
	authController.protect,
	enrollController.setAuthorUserId,
	enrollController.createEnroll
);
router
	.route('/:id')
	.get(enrollController.getEnroll)
	.patch(enrollController.updateEnroll)
	.delete(enrollController.deleteEnroll);

module.exports = router;
