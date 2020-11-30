const sanitizeHtml = require('sanitize-html');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const fs = require('fs');
const axios = require('axios');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const testUtils = require('../utils/testUtils');
const Test = require('../models/testModel');
const Enroll = require('../models/enrollModel');
const Asset = require('../models/assetModel');
const User = require('../models/userModel');
const awsImageUploadService = require('../services/awsImageUpload');
const amqp = require('amqplib/callback_api');
const asyncObj = require('async');
const MQService = require('../services/MQService');

const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing testController.js....');

//ROUTE HANDLERS
exports.aliasTopTests = (req, res, next) => {
	req.query.limit = '10';
	req.query.sort = '-modifieddAt,averageCompatibility';
	//req.query.fields = 'tenant,urls,language,averageCompatibility,avgPixelDifference,numReports,averageDuration,image';
	next();
};

// TODO: not complete
exports.takeScreenShot = catchAsync(async (req, res, next) => {
	const d = new Date();
	const current_time = `${d.getFullYear()}_${d.getMonth() + 1}
	  _${d.getDate()}_${d.getHours()}_${d.getMinutes()}`;

	const { url, tenant, device } = req.body;

	await doScreenCapture(url, tenant, device)
		.then(imageData => {
			var image = {
				data: imageData,
				contentType: 'image/png',
				name: `${site_name}_${req.body.language}_${device}_${current_time}.png`,
			};
			logger.info('Create Test....');
			return Test.create({ ...req.body, assets: image });
		})
		.then(data => {
			res.status(201).json({
				status: 'success',
				data: {
					result: data,
				},
			});
		})
		.catch(error => {
			res.status(400).json({
				status: 'fail',
				data: {
					error: error,
				},
			});
		});
});

exports.getAllTests = factory.getAll(Test);
exports.getTest = factory.getOne(Test, { path: 'report' });
exports.createTest = factory.createOne(Test);
exports.updateTest = factory.updateOne(Test);
exports.deleteTest = factory.deleteOne(Test);

// TODO: not complete
exports.getTestStats = catchAsync(async (req, res, next) => {
	let sortBy = req.query.sort
		? `{ ${req.query.sort.split(',').join(': -1 ,').concat(': -1')} }`
		: {
				modifieddAt: -1,
				createdAt: -1,
		  };
	const page = req.query.page * 1 || 1;
	const limit = req.query.limit * 1 || 100;
	const skip = (page - 1) * limit;

	// To allow for nested GET report on test
	const stats = await Test.aggregate([
		{
			$lookup: {
				from: User.collection.name,
				localField: 'author',
				foreignField: '_id',
				as: 'author',
			},
		},
		{
			$unwind: '$author',
		},
		{
			$project: {
				'author.password': 0,
				'author.photo': 0,
				'author.role': 0,
				'author.active': 0,
				'author.__v': 0,
			},
		},
		{
			$match: {
				$or: [
					{ type: { $eq: 'imagediff' } },
					{ type: { $eq: 'screenshot' } },
					{ type: { $eq: 'webscraping' } },
					{ type: { $eq: 'htmldiff' } },
				],
			},
		},
		{
			$group: {
				_id: { $toUpper: '$tenant' },
				tests: {
					$push: {
						id: '$_id',
						tenant: '$tenant',
						url: '$urls',
						language: '$language',
						device: '$device',
						type: '$type',
						author: '$author',
						slug: '$slug',
						assets: '$assets',
						reports: '$reports',
						hasTestComplete: '$hasTestComplete',
						modifieddAt: '$modifieddAt',
						averageCompatibility: '$averageCompatibility',
						avgPixelDifference: '$avgPixelDifference',
						numReports: '$numReports',
						averageDuration: '$averageDuration',
					},
				},
			},
		},
		{
			$sort: sortBy,
		},
		{
			$limit: limit,
		},
		{ $skip: skip },
	]);
	res.status(200).json({
		status: 'success',
		data: {
			stats,
		},
	});
});

// TODO: not complete
exports.getMonthlyTests = catchAsync(async (req, res, next) => {
	const year = req.params.year * 1;

	const monthlyTests = await Test.aggregate([
		{
			$unwind: '$modifieddAt',
		},
		{
			$match: {
				createdAt: {
					$gte: new Date(`${year}-01-01`),
					$lte: new Date(`${year}-12-31`),
				},
			},
		},
		{
			$group: {
				_id: { $month: '$createdAt' },
				numTestStats: { $sum: 1 },
				tests: { $push: '$tenant' },
			},
		},
		{
			$addFields: { month: '$_id' },
		},
		{
			$project: {
				_id: 0,
			},
		},
		{
			$sort: { numTestStats: -1 },
		},
		{
			$limit: 12,
		},
	]);
	res.status(200).json({
		status: 'success',
		data: {
			monthlyTests,
		},
	});
});
// TODO: not complete
exports.mesureImageDiff = catchAsync(async (req, res, next) => {
	// Get input from request body
	const image1Src = req.body.image1Src;
	const image2Src = req.body.image2Src;
	const threshold = req.body.threshold || 0;

	const img1 = PNG.sync.read(fs.readFileSync(image1Src));
	const img2 = PNG.sync.read(fs.readFileSync(image2Src));
	const { width, height } = img1;
	const diff = new PNG({ width, height });
	// console.log(`Image1 dimension: ${width} ${height}`)
	// console.log(`Image1 dimension: ${width} ${height}`)
	const diffNumber = pixelmatch(
		img1.data,
		img2.data,
		diff.data,
		width,
		height,
		{
			threshold: threshold,
		}
	);
	if (!diff) {
		return next(new AppError('Error while executing this test', 500));
	}
	var imageModelData = {
		data: PNG.sync.write(diff),
		contentType: 'image/png',
		name: `${new Date().toISOString()}_diff.png`,
	};

	const imageBody = {
		image: imageModelData,
		type: 'DiffImage',
		tenant: 'API',
		language: 'en',
	};
	const image = await Asset.create(imageBody);
	if (!image) {
		return next(
			new AppError('Not able to save screenshot in Asset Collection.', 400)
		);
	}
	res.status(201).json({
		status: 'success',
		data: {
			diffNumber: diffNumber,
			data: image._id,
		},
	});
});

exports.triggerTests = catchAsync(async (req, res, next) => {
	// 1) Get Test by slug
	const test = await Test.findOne({ slug: req.params.testId });
	if (!test) {
		logger.warn('No test found with that testId');
		return next(new AppError('No document found with that ID', 404));
	}
	// 2) Trigger Test screenshot, imagediff, htmldiff, webscraping.
	const url = `${req.protocol}://${req.get('host')}/test/${test.slug}`;
	const author = req.user.id;
	const { type, assetType } = req.body;
	logger.info(`Executing test of type ${type}`);
	let testUpdated;
	if (type === 'screenshot') {
		const filename = `${test.slug}-${Date.now().toString()}.png`;
		const contentType = 'image/png';
		const data = { type, filename, contentType, assetType, author, url };
		testUpdated = await testUtils.triggerScreenshot(data, test);
	} else if (type === 'imagediff') {
		const filename = `${test.slug}-${Date.now().toString()}.png`;
		const contentType = 'image/png';
		const data = { type, filename, contentType, assetType, author, url };
		testUpdated = await testUtils.triggerImageDiffing(data, test);
	} else if (type === 'webscraping') {
		const filename = `${test.slug}-${Date.now().toString()}.html`;
		const contentType = 'text/html';
		const data = { type, filename, contentType, assetType, author, url };
		testUpdated = await testUtils.triggerWebScraping(data, test);
	} else if (type === 'htmldiff') {
		const contentType = 'text/html';
		const filename = `${test.slug}-${Date.now().toString()}.html`;
		const data = { type, filename, contentType, assetType, author, url };
		testUpdated = await testUtils.triggerHTMLDiffing(data, test);
	} else if (type === 'speedtest') {
		const contentType = 'application/json';
		const filename = `${test.slug}-${Date.now().toString()}.json`;
		const data = { type, filename, contentType, assetType, author, url };
		testUpdated = await testUtils.triggerSpeedTest(data, test);
	} else {
		return next(new AppError('Not a valid test type.', 400));
	}
	res.status(200).json({
		status: 'success',
		data: {
			data: testUpdated,
		},
	});
});

exports.approveTest = catchAsync(async (req, res, next) => {
	const test = await Test.findOneAndUpdate(
		{ slug: req.params.testId },
		req.body,
		{
			new: true,
			runValidators: true,
		}
	);
	if (!test) {
		return next(new AppError('No test found with that slug ID', 404));
	}
	res.status(200).json({
		status: 'success',
		data: {
			data: test,
		},
	});
});

exports.isTestApproved = catchAsync(async (req, res, next) => {
	const test = await Test.findOne({ slug: req.params.testId });

	if (!test) {
		return next(new AppError('No test found with that slug Id', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			data: test.isApproved,
		},
	});
});

exports.isAllTestApproved = catchAsync(async (req, res, next) => {
	const tests = await Test.find({ tenant: req.params.tenantId });

	if (!tests) {
		return next(new AppError('Not All tests found with that tenant Id', 404));
	}
	let isAllApproved = true;

	tests.forEach(test => {
		if (!test.isApproved || test.isApproved === 'false') isAllApproved = false;
	});

	res.status(200).json({
		status: 'success',
		data: {
			data: isAllApproved,
		},
	});
});

exports.approveAllTest = catchAsync(async (req, res, next) => {
	// Get all test per tenant
	logger.info(`TenantId is  ${req.params.tenantId}`);
	const enroll = await Enroll.findOne({ slug: req.params.tenantId });

	if (!enroll) {
		return next(new AppError('No enroll found with that slug ID', 404));
	}
	// execute each test by testController.triggerTest
	const testPromises = enroll.tests.map(async id => {
		return await Test.findByIdAndUpdate(
			id,
			{
				isApproved: 'Accepted',
			},
			{
				new: true,
				runValidators: true,
			}
		);
	});
	let testResolved = await Promise.all(testPromises);
	const result = testResolved.map(el => {
		return el.data;
	});
	if (result.length === testPromises.length) {
		await Enroll.findByIdAndUpdate(
			enroll._id,
			{
				isAllTestApproved: true,
			},
			{
				new: true,
				runValidators: true,
			}
		);
	}
	res.status(200).json({
		status: 'success',
		data: {
			data: result,
		},
	});
});

exports.publishTask = catchAsync(async (req, res, next) => {
	MQService.publishToQueue(req, res, next);
	res.status(200).json({
		status: 'success',
		data: {
			data: `Tests Queued!`,
		},
	});
});
exports.triggerTestByTenant = catchAsync(async (req, res, next) => {
	// Get all test per tenant
	const tests = await Test.find({ tenant: req.params.tenantId });
	if (!tests) {
		return next(new AppError('No test found with that slug ID', 404));
	}
	const apiCalls = GetAllAPICalls(req, tests);
	// var q = asyncObj.queue(async function (task, callback) {
	// 	console.log('Executing ' + task.name);
	// 	if (task.test.type === 'screenshot') {
	// 		const data = { type: task.test.type, assetType: task.name };
	// 		await testUtils.triggerScreenshot(task.data, task.test);
	// 	} else if (task.test.type === 'imagediff') {
	// 		const data = { type: task.test.type, assetType: task.name };
	// 		await testUtils.triggerImageDiffing(task.data, task.test);
	// 	} else if (task.test.type === 'webscraping') {
	// 		const data = { type: task.test.type, assetType: task.name };
	// 		await testUtils.triggerWebScraping(task.data, task.test);
	// 	} else if (task.test.type === 'htmldiff') {
	// 		const data = { type: task.test.type, assetType: task.name };
	// 		await testUtils.triggerHTMLDiffing(task.data, task.test);
	// 	} else if (task.test.type === 'speedtest') {
	// 		const data = { type: task.test.type, assetType: task.name };
	// 		await testUtils.triggerSpeedTest(task.data, task.test);
	// 	} else {
	// 		logger.warn(`Not a valid test type ${task.test.type}`);
	// 	}
	// 	callback();
	// }, 5);

	// assign a callback
	// q.drain = function () {
	// 	logger.info('All items have been processed');
	// };

	apiCalls.forEach(el => {
		req.body = {
			test: el.test,
			data: el.data,
			type: el.type,
		};
		MQService.publishToQueue(req, res, next);
		// q.push(
		// 	{ name: el.type, data: el.data, url: el.url, test: el.test },
		// 	function (err) {
		// 		logger.info('Finished processing test');
		// 	}
		// );
	});
	res.status(200).json({
		status: 'success',
		data: {
			data: `${apiCalls.length} Tests Queued!`,
		},
	});
});

const GetAllAPICalls = (req, tests) => {
	const { postCI, diff } = req.body;
	const author = req.user.id;
	let apiCalls = [];
	// execute each test by testController.triggerTest
	tests.forEach(test => {
		// Do Tests
		const url = `${req.protocol}://${req.get('host')}/test/${test.slug}`;
		if (test.type === 'imagediff') {
			const filename = `${test.slug}-${Date.now().toString()}.png`;
			const contentType = 'image/png';
			if (postCI) {
				if (diff) {
					const data = {
						assetType: 'DiffImage',
						type: 'imagediff',
						filename,
						contentType,
						url,
						author,
						threshold: 0,
					};
					apiCalls.push({
						type: 'DiffImage',
						test,
						data,
						url,
					});
				} else {
					const data = {
						assetType: 'TargetAsset',
						type: 'screenshot',
						filename,
						contentType,
						url,
						author,
						threshold: 0,
					};
					apiCalls.push({
						type: 'TargetAsset',
						test,
						data,
						url,
					});
				}
			} else {
				const data = {
					assetType: 'SourceAsset',
					type: 'screenshot',
					filename,
					contentType,
					url,
					author,
					threshold: 0,
				};
				apiCalls.push({
					type: 'SourceAsset',
					data,
					test,
					url,
				});
			}
		} else if (test.type === 'htmldiff') {
			const filename = `${test.slug}-${Date.now().toString()}.html`;
			const contentType = 'text/html';
			if (postCI) {
				if (diff) {
					const data = {
						assetType: 'DiffHtml',
						type: 'htmldiff',
						filename,
						contentType,
						url,
						author,
						threshold: 0,
					};
					apiCalls.push({
						type: 'DiffHtml',
						test,
						data,
						url,
					});
				} else {
					const data = {
						assetType: 'TargetHtml',
						type: 'webscraping',
						filename,
						contentType,
						url,
						author,
						threshold: 0,
					};
					apiCalls.push({
						type: 'TargetHtml',
						test,
						data,
						url,
					});
				}
			} else {
				const data = {
					assetType: 'SourceHtml',
					type: 'webscraping',
					filename,
					contentType,
					url,
					author,
					threshold: 0,
				};
				apiCalls.push({
					type: 'SourceHtml',
					data,
					test,
					url,
				});
			}
		} else if (test.type === 'speedtest') {
			const filename = `${test.slug}-${Date.now().toString()}.json`;
			const contentType = 'application/json';
			const data = {
				assetType: 'SpeedTest',
				type: 'speedtest',
				filename,
				contentType,
				url,
				author,
				threshold: 0,
			};
			apiCalls.push({
				type: 'SpeedTest',
				data,
				test,
				url,
			});
		}
	});
	console.log(apiCalls.length);
	return apiCalls;
};

exports.consumeQueue = catchAsync(async (req, res, next) => {
	amqp.connect(process.env.AMQP_CONN_URL, function (err, conn) {
		conn.createChannel(function (err, ch) {
			ch.consume(
				'JouleVT-Test-Queue',
				function (msg) {
					console.log('.....');
					console.log(msg.content.toString());
					triggerTests(req, res, next);
				},
				{ noAck: true }
			);
		});
	});
});

///Backup
// const newId = crypto
// 		.createHash('md5')
// 		.update(JSON.stringify(req.body))
// 		.digest('hex');
// 	const newTest = Object.assign({ id: newId }, req.body);
// 	// set an environment variable at runtime
// 	process.env['TEST_BODY'] = JSON.stringify(newTest);
// 	//tests.push(newTest);

// 	// Add any Jest configuration options here
// 	const options = {
// 		projects: [`${__dirname}/../tests-snapshots`],
// 		silent: true,
// 		url: 'https://honeywell.com',
// 	};
// 	// jest
// 	// 	.runCLI(options, options.projects)
// 	try {
// 		//const image = await takeScreenShot(req.body.url, newId);
// 	} catch (error) {
// 		throw new Error('Error while taking screenshot');
// 	}

// 	measureImageDiff('img1.png', 'img2.png')
// 		.then(data => {
// 			res.status(201).json({
// 				status: 'success',
// 				data: {
// 					tests: data,
// 				},
// 			});
// 		})
// 		.catch(failure => {
// 			res.status(500).json({
// 				status: 'fail',
// 				data: {
// 					error: failure,
// 				},
// 			});
// 		});
