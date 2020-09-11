const Enroll = require('../models/enrollModel');
const factory = require('./handlerFactory');
const Test = require('../models/testModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const User = require('./../models/userModel');
const Email = require('../utils/email');
//ROUTE HANDLERS
exports.setAuthorUserId = (req, res, next) => {
	// Allow nested routes
	console.log(req.body);
	if (!req.body.author) req.body.author = req.user.id;
	next();
};

exports.enrollTests = catchAsync(async (req, res, next) => {
	const urls = req.body.urls || '';
	if (!req.body.tests) req.body.tests = [];
	const devices = ['desktop', 'tablet', 'mobile'];
	const testType = ['imagediff', 'htmldiff'];
	if (urls) {
		for (let i = 0; i < urls.length; i++) {
			for (let j = 0; j < devices.length; j++) {
				for (let k = 0; k < testType.length; k++) {
					let testDoc = {
						tenant: req.body.tenant,
						language: req.body.language,
						type: testType[k],
						device: devices[j],
						urls: urls[i],
						author: req.body.author,
					};
					const test = await Test.create(testDoc);

					if (test) req.body.tests.push(test._id);
				}
			}
		}
		const user = await User.findById(req.user.id);
		const url = `${req.protocol}://${req.get('host')}/my-tests`;
		await new Email(user, url).sendWelcomeToEnrolledUser();
	}
	next();
});

exports.getAllEnrolls = factory.getAll(Enroll);
exports.getEnroll = factory.getOne(Enroll);
exports.createEnroll = catchAsync(async (req, res, next) => {
	const { tenant, language, environments } = req.body;
	console.log(req.body);

	// console.log(environment[0].qa);
	// console.log(environment[1].stage);
	// console.log(environment[1].stage.urls);
	const enrollPromises = environments.map(async env => {
		console.log(env);
		let tests = [];
		let enrollment = await Enroll.create({
			tenant: tenant.toLowerCase(),
			language,
			environment: env.environment,
			testTypes: env.testTypes,
			urls: env.urls,
			approverEmails: env.approverEmails,
			author: req.body.author,
		});
		const { urls, testTypes, approverEmails } = env;
		for (let i = 0; i < urls.length; i++) {
			console.log(`${urls[i]}`);
			for (let j = 0; j < testTypes.length; j++) {
				console.log(`${testTypes[j]}`);
				if (testTypes[j] === 'imagediff') {
					const devices = ['desktop', 'tablet', 'mobile'];
					for (let k = 0; k < devices.length; k++) {
						console.log(`${devices[k]}`);
						const test = await Test.create({
							tenant: tenant.toLowerCase(),
							environment: env.environment,
							language: language,
							type: testTypes[j],
							device: devices[k],
							urls: urls[i],
							enrollment: enrollment._id,
							author: req.body.author,
						});
						if (test) tests.push(test._id);
					}
				} else if (testTypes[j] === 'speedtest') {
					const devices = ['desktop', 'mobile'];
					for (let k = 0; k < devices.length; k++) {
						console.log(`${devices[k]}`);
						if (env.environment === 'prod') {
							const test = await Test.create({
								tenant: tenant.toLowerCase(),
								environment: env.environment,
								language: language,
								type: testTypes[j],
								device: devices[k],
								urls: urls[i],
								enrollment: enrollment._id,
								author: req.body.author,
							});
							if (test) tests.push(test._id);
						}
					}
				} else {
					const devices = ['desktop'];
					for (let k = 0; k < devices.length; k++) {
						console.log(`${devices[k]}`);
						const test = await Test.create({
							tenant: tenant.toLowerCase(),
							environment: env.environment,
							language: language,
							type: testTypes[j],
							device: devices[k],
							urls: urls[i],
							enrollment: enrollment._id,
							author: req.body.author,
						});
						if (test) tests.push(test._id);
					}
				}
			}
		}
		return await Enroll.findByIdAndUpdate(enrollment._id, {
			tests,
		});
		tests = [];
	});
	let enrolls = await Promise.all(enrollPromises);
	const result = enrolls.map(el => {
		return el.data;
	});
	if (result) {
		const user = await User.findById(req.user.id);
		const url = `${req.protocol}://${req.get('host')}/my-tests`;
		await new Email(user, url).sendWelcomeToEnrolledUser();
	}

	res.status(201).json({
		status: 'success',
		data: {
			data: result,
		},
	});
});
exports.updateEnroll = factory.updateOne(Enroll);
exports.deleteEnroll = factory.deleteOne(Enroll);
