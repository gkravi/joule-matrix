const express = require('express');
const router = express.Router();
const MQService = require('../services/MQService');

router.post('/message', async (req, res, next) => {
	let { queueName, payload } = req.body;
	await MQService.publishToQueue(queueName, payload);
	res.statusCode = 200;
	res.data = { 'message-sent': true };
	res.status(200).json({
		status: 'success',
		data: {
			data: res.data,
		},
	});
	// next();
});

module.exports = router;
