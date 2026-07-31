import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:49488/#receipt-objects-4c', { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }
await page.screenshot({ path: '/tmp/receipt-4c.png', clip })

await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2)
await page.mouse.wheel(0, 400)
await page.waitForTimeout(600)
await page.screenshot({ path: '/tmp/receipt-4c-scrolled.png', clip })

console.log('done')
await browser.close()
