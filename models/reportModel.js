// status / pixelDifference / duration / ref to test / ref to testUser / createdAt / modifiedAt / imageID [ ]
const mongoose = require('mongoose');
const Test = require('./testModel');
const slugify = require('slugify');
const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing reportModel.js....');

const reportSchema = new mongoose.Schema(
	{
		status: {
			type: String,
			default: 'InProgress',
			enum: {
				values: ['InProgress', 'NotStarted', 'Completed'],
				message: 'Status is either: InProgress, NotStarted, Completed',
			},
		},
		type: {
			type: String,
			required: [true, 'A Test must have a test type'],
			default: 'imagediff',
			enum: {
				values: ['imagediff', 'htmldiff', 'speedtest'],
				message: 'Type is either:  imagediff, htmldiff, speedtest',
			},
		},
		duration: {
			type: Number,
			default: 0,
		},
		pageSpeedScore: {
			type: Number,
			default: 0,
			set: val => Math.round(val * 100),
		},
		pixelDifference: {
			type: Number,
			default: 0,
			required: [true, 'A Test must have a pixelDifference'],
		},
		compatibility: {
			type: Number,
			default: 0,
			max: [100, 'A Test compatibility must have less or equal than 100%'],
			min: [0, 'A Test compatibility must have more or equal than 0%'],
			set: val => Math.round(val * 10) / 10,
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
		test: {
			type: mongoose.Schema.ObjectId,
			ref: 'Test',
			required: [true, 'Report must belong to a test.'],
		},
		author: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			required: [true, 'Report must belong to a user.'],
		},
		s3AssetLocation: {
			type: [String],
		},
		speedTestReport: String,
		assets: [
			{
				type: mongoose.Schema.ObjectId,
				ref: 'Asset',
			},
		],
		active: {
			type: Boolean,
			default: true,
		},
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Virtual populate
reportSchema.virtual('report', {
	ref: 'Report',
	foreignField: 'reports',
	localField: '_id',
});

reportSchema.pre('save', function (next) {
	//this.testDates.push(new Date());
	// const urlTrailPath = this.s3ImageLocation
	// 	? this.s3ImageLocation.match(/([^\/]*)\/*$/)[1].split('.')[0]
	// 	: '';
	this.slug = slugify(`${this._id}`, {
		lower: true,
	});
	next();
});
// QUERY MIDDLEWARE
reportSchema.pre(/^find/, function (next) {
	this.populate({
		path: 'author',
		select: '-__v -passwordChangedAt',
	}).populate({
		path: 'assets',
		select: '-__v -test -urls -language -tenant -createdAt -device -inS3Bucket',
	});

	next();
});

reportSchema.statics.calcAverageDuration = async function (testId) {
	const stats = await this.aggregate([
		{
			$match: { test: testId },
		},
		{
			$group: {
				_id: '$test',
				nTesting: { $sum: 1 },
				avgDuration: { $avg: '$duration' },
				avgCompatibility: { $avg: '$compatibility' },
				avgPixelDifference: { $avg: '$pixelDifference' },
				avgPageSpeedScore: { $avg: '$pageSpeedScore' },
			},
		},
	]);

	if (stats.length > 0) {
		console.log(`avgPageSpeedScore ${stats[0].avgPageSpeedScore}`);
		await Test.findByIdAndUpdate(testId, {
			numReports: stats[0].nTesting,
			averageDuration: stats[0].avgDuration,
			averageCompatibility: stats[0].avgCompatibility,
			avgPixelDifference: stats[0].avgPixelDifference,
			avgPageSpeedScore: stats[0].avgPageSpeedScore,
		});
	} else {
		await Test.findByIdAndUpdate(testId, {
			numReports: 0,
			averageDuration: 0,
			averageCompatibility: 0,
			avgPixelDifference: 0,
			avgPageSpeedScore: 0,
		});
	}
};

reportSchema.post('save', function () {
	// this points to current report
	this.constructor.calcAverageDuration(this.test);
	//next();
});
//findByIdAndUpdate
//findByIdAndDelete
reportSchema.pre(/^findOneAnd/, async function (next) {
	this.r = await this.findOne();
	next();
});
reportSchema.post(/^findOneAnd/, async function () {
	if (this.r) await this.r.constructor.calcAverageDuration(this.r.test);
});
const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
