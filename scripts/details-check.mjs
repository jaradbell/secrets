import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:5173/#transaction', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

// Tap the front card to open details.
const box = await page.locator('[aria-roledescription="carousel"]').boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + 55)

// Mid-flight frame of the morph.
await page.waitForTimeout(200)
await page.screenshot({ path: '/tmp/details-midflight.png', clip })

await page.waitForTimeout(1200)
await page.screenshot({ path: '/tmp/details-top.png', clip })

// Scroll the overlay to the middle and bottom sections.
const overlay = page.locator('#app-viewport .overflow-y-auto')
await overlay.evaluate((el) => el.scrollTo({ top: 620 }))
await page.waitForTimeout(400)
await page.screenshot({ path: '/tmp/details-mid.png', clip })
await overlay.evaluate((el) => el.scrollTo({ top: 99999 }))
await page.waitForTimeout(400)
await page.screenshot({ path: '/tmp/details-bottom.png', clip })

// Back — morph should return to the card.
await overlay.evaluate((el) => el.scrollTo({ top: 0 }))
await page.waitForTimeout(300)
await page.click('button[aria-label="Back to results"]')
await page.waitForTimeout(250)
await page.screenshot({ path: '/tmp/details-return-mid.png', clip })
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/details-closed.png', clip })

console.log('done')
await browser.close()
