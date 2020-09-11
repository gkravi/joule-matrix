const puppeteer = require('puppeteer')
const expect = require('chai').expect //chai is assertion library
const { click, getCount, getText, shouldNotExist } = require('../lib/helpers')

describe('My First Puppeteer Test', () => {
	let browser
	let page
	before(async function () {
		browser = await puppeteer.launch({
			headless: true,
			slowMo: 10,
			devtools: false,
		})
		page = await browser.newPage()
		await page.setDefaultTimeout(10000) //override default timeout
		await page.setDefaultNavigationTimeout(20000) // override navigation timeout
	})
	after(async function () {
		await browser.close()
	})

	beforeEach(async function () {
		// Runs before each test steps
	})
	afterEach(async function () {
		// Runs after each test steps
	})

	it('should launch the browser', async function () {
		await page.goto('https://example.com/')
		await page.waitForXPath('//h1')

		const title = await page.title()
		const url = await page.url()
		// const text = await page.$eval('h1', element => element.textContent)
		// const count = await page.$$eval('p', element => element.length)
		const text = await getText(page, 'h1')
		const count = await getCount(page, 'p')

		expect(title).to.be.a('string', 'Example Domain')
		expect(url).to.include('example.com')
		expect(text).to.be.a('string', 'Example Domain')
		expect(count).to.equals(2)

		await page.goto('http://zero.webappsecurity.com/index.html')
		//await page.waitForSelector('#signin_button')
		//await page.click('#signin_button')
		await click(page, '#signin_button')
		await shouldNotExist(page, '#signin_button')
		await page.waitFor(2000)
		// await page.waitFor(() => !document.querySelector('#signin_button'))
		// await page.waitForSelector('#signin_button', {
		// 	hidden: true,
		// 	timeout: 3000,
		// })
		// await page.waitForSelector('#searchTerm')
		// await page.type('#searchTerm', 'Hello World')
		// await page.keyboard.press('Enter', { delay: 10 })
		await page.waitFor(5000)
	})
})
