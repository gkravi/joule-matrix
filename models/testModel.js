const mongoose = require('mongoose');
const Enroll = require('./enrollModel');
const slugify = require('slugify');
const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing testModel.js....');

const testSchema = new mongoose.Schema(
	{
		tenant: {
			type: String,
			required: [true, 'A Test must have a tenant name'],
			trim: true,
			maxlength: [
				20,
				'A Test tenant name must have less or equal than 20 characters',
			],
			minlength: [
				3,
				'A Test tenant name must have more or equal than 3 characters',
			],
		},
		device: {
			type: String,
			required: [true, 'A Test must have a device'],
			default: 'desktop',
			enum: {
				values: ['desktop', 'mobile', 'tablet'],
				message: 'Device is either: desktop, mobile, tablet',
			},
		},
		environment: {
			type: String,
			required: [true, 'A Enrollment must have a environment name'],
			trim: true,
			default: 'qa',
			enum: {
				values: ['qa', 'stage', 'prod'],
				message: 'Environment is either: Dev, QA, Stage, Prod',
			},
		},
		type: {
			type: String,
			required: [true, 'A Test must have a test type'],
			default: 'screenshot',
			enum: {
				values: [
					'screenshot',
					'imagediff',
					'webscraping',
					'htmldiff',
					'speedtest',
				],
				message:
					'Type is either: screenshot, imagediff, htmldiff, webscraping, speedtest',
			},
		},
		averageDuration: {
			type: Number,
			default: 0,
			set: val => Math.round(val * 10) / 10,
		},
		numReports: {
			type: Number,
			default: 0,
		},
		avgPixelDifference: {
			type: Number,
			default: 0,
			set: val => Math.round(val * 100) / 100,
		},
		avgPageSpeedScore: {
			type: Number,
			default: 0,
			set: val => Math.round(val * 100) / 100,
		},
		averageCompatibility: {
			type: Number,
			default: 0,
			set: val => Math.round(val * 10) / 10,
		},
		language: {
			type: String,
			trim: true,
			required: [true, 'A Test must have a language'],
		},
		urls: {
			type: String,
			trim: true,
			required: [true, 'A Test must have a page url'],
		},
		slug: String,
		createdAt: {
			type: Date,
			default: Date.now(),
			select: false,
		},
		modifieddAt: {
			type: Date,
			default: Date.now(),
			select: true,
		},
		testDates: [Date],
		hasTestComplete: {
			type: Boolean,
			default: false,
		},
		isApproved: {
			type: String,
		},
		author: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			required: [true, 'A Test must have a author.'],
		},
		enrollment: {
			type: mongoose.Schema.ObjectId,
			ref: 'Enroll',
			required: [true, 'Test must belong to a enroll.'],
		},
		reports: [
			{
				type: mongoose.Schema.ObjectId,
				ref: 'Report',
			},
		],
		assets: [
			{
				type: mongoose.Schema.ObjectId,
				ref: 'Asset',
			},
		],

		// testers: Array,
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

testSchema.index({ device: 1, testDates: -1 });

// Combination of tenant, language and urls will be unique
testSchema.index(
	{ tenant: 1, language: 1, urls: 1, device: 1, type: 1, environment: 1 },
	{ unique: true }
);

// Virtual populate
testSchema.virtual('report', {
	ref: 'Report',
	foreignField: 'test',
	localField: '_id',
});
testSchema.virtual('enroll', {
	ref: 'Enroll',
	foreignField: 'tests',
	localField: '_id',
});

testSchema.statics.calcAverageCompatibility = async function (enrollId) {
	const stats = await this.aggregate([
		{
			$match: { enrollment: enrollId },
		},
		{
			$group: {
				_id: '$enrollment',
				nTesting: { $sum: 1 },
				avgDuration: { $avg: '$averageDuration' },
				avgCompatibility: { $avg: '$averageCompatibility' },
				avgPixelDifference: { $avg: '$avgPixelDifference' },
				avgPageSpeedScore: { $avg: '$avgPageSpeedScore' },
			},
		},
	]);

	if (stats.length > 0) {
		await Enroll.findByIdAndUpdate(enrollId, {
			numTests: stats[0].nTesting,
			avgDuration: stats[0].avgDuration,
			avgCompatibility: stats[0].avgCompatibility,
			avgPixelDifference: stats[0].avgPixelDifference,
			avgPageSpeedScore: stats[0].avgPageSpeedScore,
		});
	} else {
		await Enroll.findByIdAndUpdate(testId, {
			numTests: 0,
			avgDuration: 0,
			avgCompatibility: 0,
			avgPixelDifference: 0,
			avgPageSpeedScore: 0,
		});
	}
};

//DOCUMENT MIDDLEWARE: which runs before .save() commands and .create()
// wont run with insertMany()
testSchema.pre('save', function (next) {
	//this.testDates.push(new Date());
	const urlTrailPath = this.urls.match(/([^\/]*)\/*$/)[1];
	this.slug = slugify(
		`${this.environment}-${this.tenant}-${this.language}-${urlTrailPath}-${this.device}-${this.type}`,
		{
			lower: true,
		}
	);
	next();
});

testSchema.post('save', function () {
	// this points to current report
	this.constructor.calcAverageCompatibility(this.enrollment);
	//next();
});

//Embedding user in tests documents by adding a embedding field { testers: Array, }
// testSchema.pre('save', async function (next) {
// 	const testersPromises = this.testers.map(async id => await User.findById(id));
// 	this.testers = await Promise.all(testersPromises);
// 	next();
// });

// testSchema.post('save', function (doc, next) {
// 	console.log(doc);
// 	next();
// });

//QUERY MIDDLEWARE:
//This will filter out results which doesn't match with the below find
// criteria i.e. hasTestComplete != true (incomplete test data)
testSchema.pre(/^find/, function (next) {
	// this.find({ hasTestComplete: { $ne: true } });
	this.start = Date.now();
	next();
});
//findByIdAndUpdate
//findByIdAndDelete
testSchema.pre(/^findOneAnd/, async function (next) {
	this.r = await this.findOne();
	const test = await this.model.findOne(this.getQuery());
	test.testDates.push(new Date());
	this.modifieddAt = new Date();
	await test.save();
	next();
});

//POST QUERY MIDDLEWARE
testSchema.post(/^findOneAnd/, async function () {
	if (this.r)
		await this.r.constructor.calcAverageCompatibility(this.r.enrollment);
});

testSchema.post(/^find/, function (docs, next) {
	console.log(`Query took ${Date.now() - this.start} milliseconds!`);
	next();
});

testSchema.pre(/^find/, function (next) {
	this.populate({
		path: 'author',
		select: '-__v -passwordChangedAt',
	}).populate({
		path: 'reports',
		select: '-__v -author -test',
	});
	next();
});

//AGGREGATION MIDDLEWARE
testSchema.pre('aggregate', function (next) {
	// this.pipeline().unshift({ $match: { hasTestComplete: { $ne: true } } });
	next();
});

const Test = mongoose.model('Test', testSchema);

module.exports = Test;
