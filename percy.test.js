const puppeteer = require('puppeteer')
const { percySnapshot } = require('@percy/puppeteer')

describe('Percy Visual Test', () => {
	let browser
	let page

	beforeAll(async function () {
		browser = await puppeteer.launch({ headless: true })
		page = await browser.newPage()
	})

	afterAll(async function () {
		await browser.close()
	})

	it('Full Page percy Snapshot', async () => {
		await page.goto('http://example.com')
		await page.waitFor(1000)
		await page.evaluate(() => {
			;(document.querySelectorAll('h1') || []).forEach((el) => el.remove())
		})
		await percySnapshot(page, 'Example Page')
	})
})
