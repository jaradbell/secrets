import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:49488/#transaction-2a', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

// Open details, then hold the orb: full-context spoken intent → booking.
const box = await page.locator('[aria-roledescription="carousel"]').boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + 55)
await page.waitForTimeout(1200)

const orbBox = await page
  .locator('button[aria-label*="speak"], button[aria-label="Voice input"]')
  .last()
  .boundingBox()
await page.mouse.move(orbBox.x + orbBox.width / 2, orbBox.y + orbBox.height / 2)
await page.mouse.down()
await page.waitForTimeout(900)
await page.mouse.up()
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/2a-booking.png', clip })
await page.waitForTimeout(3200)
await page.screenshot({ path: '/tmp/2a-receipt.png', clip })

console.log('done')
await browser.close()
