const puppeteer = require('puppeteer');
const sanitizeHtml = require('sanitize-html');
const Diff = require('text-diff');
const htmlToText = require('html-to-text');
const Enroll = require('../models/enrollModel');
const Asset = require('../models/assetModel');
const Report = require('../models/reportModel');
const Test = require('../models/testModel');
const AppError = require('./appError');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const Email = require('./../utils/email');
const axios = require('axios');
const dotenv = require('dotenv');
const awsImageUploadService = require('../services/awsImageUpload');
dotenv.config({ path: './config.env' });

const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing testUtils.js....');

exports.doScreenCapture = async (url, site_name, device) => {
	const d = new Date();
	const current_time = `${d.getFullYear()}_${d.getMonth() + 1}
	  _${d.getDate()}_${d.getHours()}_${d.getMinutes()}`;
	  console.log("browser")
	  try {
		const browser = await puppeteer.launch();
	  } catch (error) {
		  console.error(error)
	  }
	const browser = await puppeteer.launch();
	
	const page = await browser.newPage();
	
	// Configure the navigation timeout
	await page.setDefaultNavigationTimeout(0);
	if (device === 'mobile') {
		await page.setViewport({ width: 375, height: 812 });
	} else if (device === 'tablet') {
		await page.setViewport({ width: 768, height: 1024 });
	} else if (device === 'desktop') {
		await page.setViewport({ width: 1366, height: 768 });
	}
	await page.goto(url, { waitUntil: 'networkidle0' });
	await page.waitFor(2 * 1000);
	let shotResult = await page
		.screenshot({
			fullPage: true,
			// path: `${current_time}_${site_name}.png`,
		})
		.then(result => {
			return result;
		})
		.catch(e => {
			console.error(
				`[${current_time}_${site_name}] Error in snapshotting page`,
				e
			);
			return false;
		});
	// capture is successful, or else return null
	if (shotResult) {
		await browser.close();
		return shotResult;
	} else {
		await browser.close();
		return null;
	}
};

exports.mesureImageDiff = async test => {
	// 1) Get the Latest SourceAsset and Target Asset based on test ID
	let srcImage, targetImage;
	const imageIDs = test.assets;
	const threshold = 0;

	for (let i = 0; i < imageIDs.length; i++) {
		imageObj = await Asset.findById(imageIDs[i]);
		if (imageObj.type === 'SourceAsset') srcImage = imageObj;
		if (imageObj.type === 'TargetAsset') targetImage = imageObj;
	}
	// 2) Create PNG image type from buffer image data

	const img1 = PNG.sync.read(srcImage.asset.data);
	const img2 = PNG.sync.read(targetImage.asset.data);
	// fs.writeFileSync(`./image-diff/test-1.png`, PNG.sync.write(img1));
	// fs.writeFileSync(`./image-diff/test-2.png`, PNG.sync.write(img2));
	const { width, height } = img1;
	const diff = await new PNG({ width, height });

	if (img2.width !== width || img2.height !== height) {
		logger.error(
			`Image dimensions do not match: ${width}x${height} vs ${img2.width}x${img2.height}`
		);
	}
	// 3) Invoke pixelmatch method
	const options = {};
	if (threshold !== undefined) options.threshold = +threshold;
	// if (includeAA !== undefined) options.includeAA = includeAA !== 'false';
	console.time('matched in');
	const pixelDifference = pixelmatch(
		img1.data,
		img2.data,
		diff.data,
		width,
		height,
		{
			threshold: threshold,
		}
	);
	console.timeEnd('matched in');
	const compatibility = 100 - (pixelDifference * 100) / (width * height);
	console.log(`Compatibility: ${compatibility}%`);
	console.log(`${pixelDifference} pixels differents`);
	if (!diff) {
		logger.error('Error while executing imageDiff test');
	}
	// fs.writeFileSync(`./image-diff/test-diff.png`, PNG.sync.write(diff));

	// 4) return object with { pixelDifference, assetData }
	return {
		pixelDifference: pixelDifference,
		imageDiff: PNG.sync.write(diff),
		compatibility: compatibility,
	};
};

exports.doWebHTMLCapture = async (url, site_name, device) => {
	const d = new Date();
	const current_time = `${d.getFullYear()}_${d.getMonth() + 1}
	  _${d.getDate()}_${d.getHours()}_${d.getMinutes()}`;

	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	// Configure the navigation timeout
	await page.setDefaultNavigationTimeout(0);
	if (device === 'mobile') {
		await page.setViewport({ width: 375, height: 812 });
	} else if (device === 'tablet') {
		await page.setViewport({ width: 768, height: 1024 });
	}
	await page.goto(url, { waitUntil: 'networkidle0' });

	const websiteContent = await page.content();
	await browser.close();
	// capture is successful, or else return null
	if (websiteContent) {
		return websiteContent;
	} else {
		return null;
	}
};

exports.doTextDiff = async test => {
	// 1) Get the Latest SourceAsset and Target Asset based on test ID
	let srcText, targettext;
	const imageIDs = test.assets;
	const threshold = 0;

	for (let i = 0; i < imageIDs.length; i++) {
		textObj = await Asset.findById(imageIDs[i]);
		if (textObj.type === 'SourceHtml') srcText = textObj;
		if (textObj.type === 'TargetHtml') targettext = textObj;
	}
	let textSrcHtml = srcText
		? htmlToText.fromString(srcText.asset.data.toString('utf-8'))
		: '';
	let textTrgHtml = targettext
		? htmlToText.fromString(targettext.asset.data.toString('utf-8'))
		: '';
	const diff = new Diff({ timeout: 2, editCost: 4 });
	const textDiff = diff.main(textSrcHtml, textTrgHtml);
	return diff.prettyHtml(textDiff);
};

exports.doSpeedTest = async test => {
	// 1) Get the Latest SourceAsset and Target Asset based on test ID
	const testAPIURL = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${test.urls}&key=${process.env.GOOGLE_API_KEY}&strategy=${test.device}&locale=${test.language}`;
	console.log(testAPIURL);
	const speedTestResult = await pageSpeedTest(testAPIURL);
	return speedTestResult;
};

exports.createImageAndReportThenUpdateTest = async (reqData, data) => {
	const {
		test,
		s3Location,
		assetData,
		pixelDifference,
		hasTestComplete,
		testDuration,
		compatibility,
		speedTestResult,
	} = data;
	const { type, filename, contentType, assetType, author, url } = reqData;
	// 1) Save screenshot to Image collection
	const asset = await createAsset({ reqData, test, assetData, s3Location });

	if (!asset) {
		logger.error(
			`Not able to save screenshot/webscrapping in Asset Collection: Error 🔥🔥 ${err}`
		);
		throw err;
	}
	// 1) Save execution data in report collection
	// Find the latest report Id for the test
	let report = await updateOrCreateReport({
		asset,
		s3Location,
		pixelDifference,
		hasTestComplete,
		testDuration,
		compatibility,
		speedTestResult,
		test,
		reqData,
	});
	if (!report) {
		logger.error(
			`Not able to save report in Report Collection: Error 🔥🔥 ${err}`
		);
		throw err;
	}
	// 2) Update the test collection
	const testDoc = await updateTestAfterExecution({
		asset,
		report,
		hasTestComplete,
		speedTestResult,
		test,
		reqData,
	});

	if (hasTestComplete) {
		const user = { name: 'Test User' };
		const enroll = await Enroll.findOne({ tests: test._id });

		if (enroll)
			enroll.approverEmails.forEach(async el => {
				user.email = el;
				// await new Email(user, url).sendTestToApproverUser();
			});
	}
	if (!testDoc) {
		logger.error(`Error while updating Test: Error 🔥🔥 ${err}`);
		throw err;
	}
	// let Pusher = require('pusher');
	// let pusher = new Pusher({
	// 	appId: process.env.PUSHER_APP_ID,
	// 	key: process.env.PUSHER_APP_KEY,
	// 	secret: process.env.PUSHER_APP_SECRET,
	// 	cluster: process.env.PUSHER_APP_CLUSTER,
	// });

	// pusher.trigger('my-channel', 'my-event', {
	// 	message: 'hello world',
	// });
	return testDoc;
};

exports.triggerScreenshot = async (reqData, test) => {
	
	const { urls, tenant, device, language, slug } = test;
	console.log(`urls: ${urls}, tenant: ${tenant}, device: ${device}, language: ${language}`)
	const testResult = await this.doScreenCapture(urls, tenant, device);
	
	const testDoc = await awsImageUploadService.saveToS3AndUpdateDB({
		test,
		reqData,
		bufferdata: testResult,
		pixelDifference: 0,
		hasTestComplete: false,
		compatibility: 0,
	});
	return testDoc;
};

exports.triggerImageDiffing = async (reqData, test) => {
	const { urls, tenant, device, language, slug } = test;
	const { type, filename, contentType, assetType, author, url } = reqData;
	const {
		pixelDifference,
		imageDiff,
		compatibility,
	} = await this.mesureImageDiff(test);
	const testResult = imageDiff;
	if (!testResult)
		logger.error('Not able to get the testResult from mesureImageDiff');

	const testDoc = await awsImageUploadService.saveToS3AndUpdateDB({
		test,
		reqData,
		bufferdata: imageDiff,
		pixelDifference,
		hasTestComplete: true,
		compatibility,
	});
	return testDoc;
};

exports.triggerWebScraping = async (reqData, test) => {
	const { urls, tenant, device, language, slug } = test;

	const testResult = await this.doWebHTMLCapture(urls, tenant, device);
	if (!testResult)
		logger.error('Not able to get the testResult from doWebHTMLCapture.');

	const cleanHtml = sanitizeHtml(testResult, {
		allowedTags: false,
		allowedAttributes: false,
		disallowedTagsMode: 'recursiveEscape',
		enforceHtmlBoundary: true,
	});

	const testDoc = await awsImageUploadService.saveToS3AndUpdateDB({
		test,
		reqData,
		bufferdata: Buffer.from(cleanHtml, 'utf-8'),
		pixelDifference: 0,
		hasTestComplete: false,
		compatibility: 0,
	});
	return testDoc;
};

exports.triggerHTMLDiffing = async (reqData, test) => {
	const { urls, tenant, device, language, slug } = test;
	const { type, filename, contentType, assetType, author, url } = reqData;
	const testResult = await this.doTextDiff(test);
	if (!testResult)
		logger.error('Not able to get the testResult from doTextDiff.');

	const testDoc = await awsImageUploadService.saveToS3AndUpdateDB({
		test,
		reqData,
		bufferdata: Buffer.from(testResult, 'utf-8'),
		pixelDifference: 0,
		hasTestComplete: true,
		compatibility: 0,
	});
	return testDoc;
};

exports.triggerSpeedTest = async (reqData, test) => {
	const { urls, tenant, device, language, slug } = test;
	const testResult = await this.doSpeedTest(test);
	if (!testResult)
		logger.error('Not able to get the testResult from doSpeedTest.');

	const testDoc = await awsImageUploadService.saveToS3AndUpdateDB({
		test,
		reqData,
		bufferdata: Buffer.from(JSON.stringify(testResult), 'utf-8'),
		pixelDifference: 0,
		speedTestResult: testResult,
		hasTestComplete: true,
		compatibility: 0,
	});
	return testDoc;
};

const createAsset = async data => {
	const { reqData, test, assetData, s3Location, body } = data;
	const { type, filename, contentType, assetType, author, url } = reqData;
	return await Asset.create({
		asset: {
			data: assetData,
			contentType: contentType,
			name: filename,
		},
		type: assetType,
		device: test.device,
		s3LocationUrl: s3Location,
		inS3Bucket: true,
		tenant: test.tenant,
		language: test.language,
		urls: test.urls,
		test: test._id,
	});
};

const updateOrCreateReport = async data => {
	const {
		asset,
		s3Location,
		pixelDifference,
		hasTestComplete,
		testDuration,
		compatibility,
		speedTestResult,
		test,
		reqData,
	} = data;
	let { type, filename, contentType, assetType, author, url } = reqData;
	let report;
	let status = hasTestComplete ? 'Completed' : 'InProgress';

	if (type === 'screenshot' || type === 'imagediff') type = 'imagediff';
	else if (type === 'webscraping' || type === 'htmldiff') type = 'htmldiff';
	else if (type === 'speedtest') type = 'speedtest';

	console.log(`type ${type}`);
	let latestReportId =
		test.reports && test.reports.length > 0
			? test.reports[test.reports.length - 1]
			: undefined;
	const latestReport = latestReportId
		? await Report.findById(latestReportId)
		: undefined;

	const assets = latestReport && latestReport.active ? latestReport.assets : [];
	assets.push(asset._id);
	const s3ImageLocation =
		latestReport && latestReport.active ? latestReport.s3AssetLocation : [];
	s3ImageLocation.push(s3Location);
	var performance = speedTestResult
		? speedTestResult.find(el => {
				if (el.performance) return el;
		  })
		: null;
	if (!latestReport || !latestReport.active) {
		logger.info('no report create new report');
		report = await Report.create({
			status,
			author,
			test: test._id,
			pixelDifference,
			compatibility,
			duration: testDuration,
			active: !hasTestComplete,
			type,
			assets,
			s3AssetLocation: s3ImageLocation,
			speedTestReport: JSON.stringify(speedTestResult),
			pageSpeedScore: performance
				? performance.performance.lighthouseResult.categories.performance.score
				: 0,
		});
	} else {
		logger.info(`Already has report, update report : ${latestReportId}`);
		report = await Report.findByIdAndUpdate(
			latestReportId,
			{
				status,
				author,
				test: test._id,
				pixelDifference,
				compatibility,
				duration: testDuration,
				active: !hasTestComplete,
				type,
				assets,
				s3AssetLocation: s3ImageLocation,
				speedTestReport: speedTestResult,
				pageSpeedScore: performance
					? performance.performance.lighthouseResult.categories.performance
							.score
					: 0,
			},
			{
				new: true,
				runValidators: false,
			}
		);
	}
	return report;
};

const updateTestAfterExecution = async data => {
	const { asset, report, hasTestComplete, test, reqData } = data;
	const { type, filename, contentType, assetType, author, url } = reqData;
	let assets = test.assets || [];
	let reports = test.reports || [];

	let reportIDs = reports.map(el => el.id);
	let reportId = reportIDs.includes(report._id) ? undefined : report._id;

	if (!assets.includes(asset._id)) assets.push(asset._id);
	if (!reportIDs.includes(report._id)) reports.push(report._id);

	return await Test.findByIdAndUpdate(
		test._id,
		{
			hasTestComplete,
			assets,
			reports,
		},
		{
			new: true,
			runValidators: false,
		}
	);
};

const pageSpeedTest = async url => {
	try {
		const testPromises = [
			'accessibility',
			'best-practices',
			'performance',
			'seo',
			'pwa',
		].map(async el => {
			let result = await axios({
				method: 'GET',
				url: `${url}&category=${el}`,
			});

			return { [el]: result.data };
		});

		let tests = await Promise.all(testPromises);
		return tests.reduce(
			(accumulator, currentValue) => accumulator.concat(currentValue),
			[]
		);
	} catch (err) {
		logger.error(`Image dimensions do not match: ${err.response.data.message}`);
	}
};
