const mongoose = require('mongoose');
const validator = require('validator');
const Test = require('./testModel');
const slugify = require('slugify');
const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing enrollModel.js....');

const enrollSchema = new mongoose.Schema(
	{
		tenant: {
			type: String,
			required: [true, 'A Enrollment must have a tenant name'],
			trim: true,
			maxlength: [
				20,
				'A Enrollment tenant name must have less or equal than 20 characters',
			],
			minlength: [
				3,
				'A Enrollment tenant name must have more or equal than 3 characters',
			],
		},
		environment: {
			type: String,
			required: [true, 'A Enrollment must have a environment name'],
			trim: true,
			default: 'qa',
			enum: {
				values: ['qa', 'stage', 'prod'],
				message: 'Environment is either: QA, Stage, Prod',
			},
		},
		testTypes: {
			type: [String],
			required: [true, 'A Enroll must have a test type'],
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
		avgCompatibility: {
			type: Number,
			default: 0,
			set: val => Math.round(val * 10) / 10,
		},
		avgDuration: {
			type: Number,
			default: 0,
		},
		numTests: {
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
		language: {
			type: String,
			trim: true,
			required: [true, 'A Enroll must have a language'],
		},
		urls: [
			{
				type: [String],
				trim: true,
				required: [true, 'A Enroll must have a page url'],
			},
		],
		enrollmentDate: {
			type: Date,
			default: Date.now(),
		},
		modifiedDate: {
			type: Date,
		},
		slug: {
			type: String,
		},
		author: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			required: [true, 'A Enrollment must have a author.'],
		},
		isAllTestApproved: {
			type: String,
		},
		tests: [
			{
				type: mongoose.Schema.ObjectId,
				ref: 'Test',
				required: [true, 'Report must belong to a test.'],
			},
		],
		approverEmails: [
			{
				type: String,
				required: [true, "A Enrollment must have a Approver's email contact"],
				trim: true,
				lowercase: true,
				validate: [validator.isEmail, 'Please provide a valid email'],
			},
		],
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Combination of tenant, language  will be unique
enrollSchema.index(
	{ tenant: 1, language: 1, environment: 1 },
	{ unique: true }
);

//DOCUMENT MIDDLEWARE: which runs before .save() commands and .create()
// wont run with insertMany()
// enrollSchema.pre('save', function (next) {
// 	next();
// });

enrollSchema.virtual('enroll', {
	ref: 'Enroll',
	foreignField: 'enrollment',
	localField: '_id',
});

//DOCUMENT MIDDLEWARE: which runs before .save() commands and .create()
// wont run with insertMany()
enrollSchema.pre('save', function (next) {
	this.slug = slugify(
		`${this.environment}-${this.tenant}-${this.language}-enroll`,
		{
			lower: true,
		}
	);
	next();
});

//findByIdAndUpdate
//findByIdAndDelete
enrollSchema.pre(/^findOneAnd/, async function (next) {
	const enroll = await this.model.findOne(this.getQuery());
	enroll.modifiedDate = new Date();
	await enroll.save();
	next();
});

//Embedding user in tests documents by adding a embedding field { testers: Array, }
// enrollSchema.pre('save', async function (next) {
// 	const testersPromises = this.testers.map(async id => await User.findById(id));
// 	this.testers = await Promise.all(testersPromises);
// 	next();
// });

// enrollSchema.post('save', function (doc, next) {
// 	console.log(doc);
// 	next();
// });

//QUERY MIDDLEWARE:
//This will filter out results which doesn't match with the below find
// criteria i.e. hasTestComplete != true (incomplete test data)
enrollSchema.pre(/^find/, function (next) {
	this.start = Date.now();
	next();
});
//POST QUERY MIDDLEWARE
enrollSchema.post(/^find/, function (docs, next) {
	console.log(`Query took ${Date.now() - this.start} milliseconds!`);
	next();
});

enrollSchema.pre(/^find/, function (next) {
	this.populate({
		path: 'author',
		select: '-__v -passwordChangedAt',
	}).populate({
		path: 'tests',
		select:
			'-__v -averageDuration -numReports -averageDiffPercentage -slugUrls',
	});
	next();
});

const Enroll = mongoose.model('Enroll', enrollSchema);

module.exports = Enroll;
