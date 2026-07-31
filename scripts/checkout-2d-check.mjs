import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:49488/#transaction-2d', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

// Open details for the front card, then start the reservation.
const box = await page.locator('[aria-roledescription="carousel"]').boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + 55)
await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Get reservation' }).click()
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/checkout-empty.png', clip })

// Pick a late time (needs the row to scroll) and a large party.
const timeRow = page.locator('button:has-text("9:00 PM")')
await timeRow.scrollIntoViewIfNeeded()
await timeRow.click()
const party = page.locator('button', { hasText: /^10$/ }).first()
await party.scrollIntoViewIfNeeded()
await party.click()
await page.waitForTimeout(400)
await page.screenshot({ path: '/tmp/checkout-ready.png', clip })

// Voice confirm: with the sheet complete, a press+hold on the orb (no real
// speech in headless) should act as the spoken "book it" and reach the
// receipt.
const orb = await page.locator('button[aria-label*="Listening"], button[aria-label*="speak"], button[aria-label*="Ready"], button[aria-label*="Voice"]').last().boundingBox()
await page.mouse.move(orb.x + orb.width / 2, orb.y + orb.height / 2)
await page.mouse.down()
await page.waitForTimeout(900)
await page.mouse.up()
await page.waitForTimeout(4500)
await page.screenshot({ path: '/tmp/checkout-voice-confirm.png', clip })

console.log('done')
await browser.close()
