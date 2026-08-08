// Drives the 2C booking flow to the confirmed turn and screenshots the
// in-thread 4E dining ticket (compact scale).
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:49488/#transaction-2c', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

// Open details, start the reservation (details close; inline card in thread).
const box = await page.locator('[aria-roledescription="carousel"]').boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + 55)
await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Get reservation' }).click()
await page.waitForTimeout(1000)

// Fill slots via a hold (simulated utterance), then hold again to book.
const orbBox = await page
  .locator('button[aria-label*="speak"], button[aria-label="Voice input"], button[aria-label*="Ready"], button[aria-label*="Listening"]')
  .last()
  .boundingBox()
const hold = async () => {
  await page.mouse.move(orbBox.x + orbBox.width / 2, orbBox.y + orbBox.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(900)
  await page.mouse.up()
  await page.waitForTimeout(800)
}
await hold()
await hold()
await page.waitForTimeout(3500)
await page.screenshot({ path: 'screens/receipt-ticket-inline/1-receipt-turn.png', clip })

console.log('done')
await browser.close()
