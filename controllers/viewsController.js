const Test = require('../models/testModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Enroll = require('../models/enrollModel');
const Report = require('../models/reportModel');
const APIFeatures = require('../utils/apiFeatures');
const helper = require('../utils/helper');

exports.getOverview = catchAsync(async (req, res, next) => {
	let sortBy = req.query.sort
		? `{ ${req.query.sort.split(',').join(': -1 ,').concat(': -1')} }`
		: {
				enrollmentDate: -1,
				modifiedDate: -1,
		  };
	const page = req.query.page * 1 || 1;
	const limit = req.query.limit * 1 || 100;
	const skip = (page - 1) * limit;
	const stats = await Enroll.aggregate([
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
					{ environment: { $eq: 'qa' } },
					{ environment: { $eq: 'stage' } },
					{ environment: { $eq: 'prod' } },
				],
			},
		},
		{
			$group: {
				_id: { $toUpper: '$tenant' },
				enrolls: {
					$push: {
						id: '$_id',
						tenant: '$tenant',
						url: '$urls',
						language: '$language',
						testTypes: '$testTypes',
						author: '$author',
						slug: '$slug',
						environment: '$environment',
						avgCompatibility: '$avgCompatibility',
						avgDuration: '$avgDuration',
						numTests: '$numTests',
						avgPixelDifference: '$avgPixelDifference',
						speedTestScore: '$avgPageSpeedScore',
						numTests: '$numTests',
						enrollmentDate: '$enrollmentDate',
						approverEmails: '$approverEmails',
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
	res.status(200).render('overview', {
		title: 'Overview',
		total_results: stats.length,
		calculateCompatibity: helper.calculateCompatibity,
		enrolls: stats,
	});
});
exports.getTenantByEnroll = catchAsync(async (req, res, next) => {
	let tenants = await Enroll.find({ tenant: req.params.tenantSlug });
	console.log(req.params.tenantSlug);
	console.log(tenants);
	let numTests = tenants.reduce((acc, curr) => {
		return curr.numTests;
	});

	res.status(200).render('tenant', {
		title: 'Tenant Report',
		name: req.params.tenantSlug,
		calculateCompatibity: helper.calculateCompatibity,
		tenants,
		numTests,
	});
});
exports.getTestByEnroll = catchAsync(async (req, res, next) => {
	let { tenantSlug, enrollSlug } = req.params;
	const enroll = await Enroll.findOne({ slug: enrollSlug });

	res.status(200).render('testlist', {
		title: 'Enrolled Test For this Environment',
		name: tenantSlug,
		calculateCompatibity: helper.calculateCompatibity,
		enroll,
	});
});
exports.getAllTests = catchAsync(async (req, res, next) => {
	// 1) Get test data from collection
	// const tests = await Test.find();

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

	res.status(200).render('alltests', {
		title: 'All Tests',
		tests: stats,
	});
});

exports.getTest = catchAsync(async (req, res, next) => {
	// 1) Get the data, for the requested slug
	const test = await Test.findOne({ slug: req.params.slug });
	if (!test) {
		return next(new AppError('There is no test with that name.', 404));
	}
	// 2) Bild the template
	res.status(200).render('test', {
		title: `${test.tenant} ${test.type} Test`,
		test,
	});
});

exports.getReportOfTest = catchAsync(async (req, res, next) => {
	// 1) Get the data, for the requested slug
	const report = await Report.findById(req.params.reportId);
	if (!report) {
		return next(new AppError('There is no report with that name.', 404));
	}
	// 2) Bild the template

	res.status(200).render('report', {
		title: `Report for the Test is ${report.status}`,
		report,
	});
});
exports.getReports = catchAsync(async (req, res, next) => {
	// 1) Find all reports
	const reports = await Report.find({ author: req.user.id });
	if (!reports) {
		return next(new AppError('There is no reports with the user.', 404));
	}
	res.status(200).render('reports', {
		title: 'My Test Reports',
		reports,
	});
});

exports.getLoginForm = (req, res) => {
	res.status(200).render('login', {
		title: 'Log into your account',
	});
};
exports.getSSOLogin = async (req, res) => {
	res.redirect(`/api/v1/users/login/sso`);
};

exports.getSignupForm = (req, res) => {
	res.status(200).render('signup', {
		title: 'Register your new account',
	});
};

exports.getEnrollForm = (req, res) => {
	res.status(200).render('enrollment', {
		title: 'Enroll new Tests',
	});
};

exports.getAccount = (req, res) => {
	res.status(200).render('account', {
		title: 'Your account',
	});
};
exports.getMyTests = catchAsync(async (req, res, next) => {
	// 1) Find all tests
	const enrollments = await Enroll.find({ author: req.user.id });
	// 2) Find tests with the returned IDs

	const testPromises = enrollments.map(async el => {
		const tests = await Test.find({ _id: { $in: el.tests } });
		return tests;
	});

	let tests = await Promise.all(testPromises);
	let flattenedTestsArray = tests.reduce(
		(accumulator, currentValue) => accumulator.concat(currentValue),
		[]
	);
	if (!flattenedTestsArray || flattenedTestsArray.length === 0) {
		return next(new AppError('There is no test with this user.', 404));
	}

	res.status(200).render('mytests', {
		title: 'My Tests',
		tests: flattenedTestsArray,
	});
});
exports.updateUserData = catchAsync(async (req, res, next) => {
	const updatedUser = await User.findByIdAndUpdate(
		req.user.id,
		{
			name: req.body.name,
			email: req.body.email,
		},
		{
			new: true,
			runValidators: true,
		}
	);
	res.status(200).render('account', {
		title: 'Your account',
		user: updatedUser,
	});
});
