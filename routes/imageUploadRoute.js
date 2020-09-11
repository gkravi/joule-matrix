const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const awsImageUploadService = require('../services/awsImageUpload');

const singleUpload = awsImageUploadService.upload.single('image');

router.post('/image-upload', authController.protect, function (req, res) {
	console.log({ ...req });
	singleUpload(req, res, function (err) {
		if (err) {
			return res.status(422).send({
				errors: [{ title: 'Image Upload Error', detail: err.message }],
			});
		}
		console.log({ ...req });
		return res.json({ imageUrl: req.file.location });
	});
});

module.exports = router;
