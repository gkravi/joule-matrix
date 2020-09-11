const express = require('express');
const assetController = require('./../controllers/assetController');
const authController = require('../controllers/authController');
const router = express.Router();

router.use(
	authController.protect,
	authController.restrictTo('admin', 'test-user', 'report-user')
);

router
	.route('/')
	.get(assetController.getAllAssets)
	.post(authController.protect, assetController.createAsset);
router
	.route('/:id')
	.get(assetController.getAsset)
	.patch(assetController.updateAsset)
	.delete(assetController.deleteAsset);

module.exports = router;
