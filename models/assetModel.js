// status / diffNumber / duration / ref to test / ref to testUser / createdAt / modifiedAt / assetID [ ]
const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
	{
		asset: {
			contentType: String,
			data: Buffer,
			name: String,
		},
		type: {
			type: String,
			required: [true, 'A Asset must have a asset type'],
			default: 'SourceAsset',
			enum: {
				values: [
					'SourceAsset',
					'SourceHtml',
					'TargetAsset',
					'TargetHtml',
					'DiffImage',
					'DiffHtml',
					'SpeedTest',
				],
				message:
					'Asset Type is either: SourceAsset, TargetAsset,SourceHtml,TargetHtml, DiffImage, DiffHtml, SpeedTest',
			},
		},
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
		language: {
			type: String,
			trim: true,
			required: [true, 'A Test must have a language'],
		},
		urls: {
			type: String,
			trim: true,
		},
		inS3Bucket: {
			type: Boolean,
			default: false,
		},
		s3LocationUrl: {
			type: String,
		},
		device: {
			type: String,
			required: [true, 'A Asset must have a device'],
			default: 'desktop',
			enum: {
				values: ['desktop', 'mobile', 'tablet'],
				message: 'Device is either: desktop, mobile, tablet',
			},
		},
		createdAt: {
			type: Date,
			default: Date.now(),
			select: false,
		},
		test: {
			type: mongoose.Schema.ObjectId,
			ref: 'Test',
		},
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// QUERY MIDDLEWARE
assetSchema.pre(/^find/, function (next) {
	// this.populate({
	// 	path: 'test',
	// 	select: '-__v',
	// });
	next();
});

const Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset;
