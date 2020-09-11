const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const fs = require('fs');
const catchAsync = require('./../utils/catchAsync');
const testUtils = require('../utils/testUtils');

const AppError = require('./../utils/appError');
const dotenv = require('dotenv');
dotenv.config({ path: '../config.env' });

const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing awsImageUpload.js....');

aws.config.update({
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	region: process.env.AWS_REGION,
});

const s3 = new aws.S3();
let fileExtention;
const fileFilter = (req, file, cb) => {
	if (file.mimetype === 'image/jpeg') {
		fileExtention = '.jpg';
		cb(null, true);
	} else if (file.mimetype === 'image/png') {
		fileExtention = '.png';
		cb(null, true);
	} else {
		cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
	}
};

exports.upload = multer({
	fileFilter,
	storage: multerS3({
		acl: 'public-read',
		s3,
		bucket: process.env.S3_BUCKET_NAME,
		contentType: multerS3.AUTO_CONTENT_TYPE,
		metadata: function (req, file, cb) {
			cb(null, { fieldName: 'TESTING_METADATA' });
		},
		key: function (req, file, cb) {
			cb(null, `${Date.now().toString()}${fileExtention}`);
		},
	}),
});

exports.saveToS3AndUpdateDB = async data => {
	this.start = Date.now();
	const {
		test,
		bufferdata,
		pixelDifference,
		hasTestComplete,
		compatibility,
		speedTestResult,
		reqData,
	} = data;
	const { type, filename, contentType, assetType, author, url } = reqData;
	var params = {
		ACL: 'public-read',
		Bucket: process.env.S3_BUCKET_NAME,
		ContentType: contentType || multerS3.AUTO_CONTENT_TYPE,
		Body: bufferdata,
		Key: `${assetType}/${filename}`,
	};

	s3.upload(params, async (err, data) => {
		if (err) {
			logger.error(
				`Error occured while trying to upload to S3 bucket: Error 🔥🔥 ${err}`
			);
			throw err;
		} else {
			if (data) {
				let testDuration = Date.now() - this.start;
				console.log(data.Location);
				const testDoc = await testUtils.createImageAndReportThenUpdateTest(
					reqData,
					{
						test,
						s3Location: data.Location,
						assetData: bufferdata,
						pixelDifference,
						hasTestComplete,
						testDuration,
						compatibility,
						speedTestResult,
						data,
					}
				);
				return testDoc;
			}
		}
	});
};
