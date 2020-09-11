const puppeteer = require('puppeteer');
const { toMatchImageSnapshot } = require('jest-image-snapshot');

expect.extend({ toMatchImageSnapshot });

describe('Visual Regression Testing', () => {
	let browser;
	let page;
	let pageURL;
	let id;
	let device;
	let tenant;
	let language;
	beforeAll(async function () {
		browser = await puppeteer.launch({ headless: true });
		page = await browser.newPage();
		await page.setDefaultTimeout(10000); //override default timeout
		await page.setDefaultNavigationTimeout(20000); // override navigation timeout

		const testBody = JSON.parse(process.env['TEST_BODY']);
		pageURL = testBody.url;
		id = testBody.id;
		device = testBody.device;
		tenant = testBody.tenant;
		language = testBody.language;
	});

	afterAll(async function () {
		await browser.close();
	});

	it(`Desktop | Full Page Snapshot # ${id}`, async function () {
		await page.setViewport({ width: 1650, height: 1050 });
		await page.goto(pageURL, { waitUntil: 'networkidle0' });
		const image = await page.screenshot({
			path: `${id}-desktop.png`,
			fullPage: true,
		});
		expect(image).toMatchImageSnapshot({
			failureTresholdType: 'percent',
			failureTreshold: 0.1,
		});
	});

	// it('Single Element Snapshot', async function () {
	// 	await page.goto('https://honeywell.com', { waitUntil: 'networkidle0' });
	// 	const h1 = await page.waitForSelector('h1');
	// 	const image = await h1.screenshot({
	// 		path: 'hon-single.png',
	// 		fullPage: true,
	// 	});
	// 	expect(image).toMatchImageSnapshot({
	// 		failureTresholdType: 'percent',
	// 		failureTreshold: 0.01,
	// 	});
	// });

	it('Mobile Snapshot', async function () {
		await page.goto(pageURL, { waitUntil: 'networkidle0' });
		await page.emulate(puppeteer.devices['iPhone X']);
		const image = await page.screenshot({
			path: `${id}-mobile.png`,
			fullPage: true,
		});
		expect(image).toMatchImageSnapshot({
			failureTresholdType: 'percent',
			failureTreshold: 0.01,
		});
	});

	it('Tablet Snapshot', async function () {
		await page.goto(pageURL, { waitUntil: 'networkidle0' });
		await page.emulate(puppeteer.devices['iPad landscape']);
		const image = await page.screenshot({
			path: `${id}-tablet.png`,
			fullPage: true,
		});
		expect(image).toMatchImageSnapshot({
			failureTresholdType: 'percent',
			failureTreshold: 0.01,
		});
	});

	// it.only('Remove Element Before Snapshot', async function () {
	// 	await page.goto('https://www.example.com')
	// 	await page.evaluate(() => {
	// 		;(document.querySelectorAll('h1') || []).forEach((el) => el.remove())
	// 	})
	// 	await page.waitFor(5000)
	// })
});
