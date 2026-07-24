import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:5173/#transaction', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

const box = await page.locator('[aria-roledescription="carousel"]').boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + 55)

for (let i = 1; i <= 4; i++) {
  await page.waitForTimeout(90)
  await page.screenshot({ path: `/tmp/open-${i}.png`, clip })
}
await page.waitForTimeout(700)
await page.screenshot({ path: '/tmp/open-final.png', clip })

await page.click('button[aria-label="Back to results"]')
for (let i = 1; i <= 4; i++) {
  await page.waitForTimeout(90)
  await page.screenshot({ path: `/tmp/close-${i}.png`, clip })
}
await page.waitForTimeout(700)
await page.screenshot({ path: '/tmp/close-final.png', clip })

console.log('done')
await browser.close()
