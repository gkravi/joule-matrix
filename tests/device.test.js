const puppeteer = require('puppeteer')

describe('Device Emulation', function () {
	let browser
	let page

	before(async function () {
		browser = await puppeteer.launch({
			headless: false,
			slowMo: 10,
			devtools: false,
		})
		const context = await browser.createIncognitoBrowserContext()  // to make use of incognito mode in test
		page = await context.newPage()
		await page.setDefaultTimeout(10000) //override default timeout
		await page.setDefaultNavigationTimeout(20000) // override navigation timeout
	})
	after(async function () {
		await browser.close()
	})
	it('Desktop Device Test', async function () {
		await page.setViewport({ width: 1650, height: 1050 })
		await page.goto('http://example.com')
		await page.waitFor(5000)
	})
	it('Tablet Device Test', async function () {
		const tablet = puppeteer.devices['iPad landscape']
		await page.emulate(tablet)
		await page.goto('http://example.com')
		await page.waitFor(5000)
	})
	it('Mobile Device Test', async function () {
		const mobile = puppeteer.devices['iPhone X']
		await page.emulate(mobile)
		await page.goto('http://example.com')
		await page.waitFor(5000)
	})
})
