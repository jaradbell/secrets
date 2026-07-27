import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:5173/#receipt', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

const box = await page.locator('[aria-roledescription="carousel"]').boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + 55)
await page.waitForTimeout(500)
await page.screenshot({ path: '/tmp/inline-entering.png', clip })
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/inline-expanded.png', clip })

// Count chip rows — should be exactly one (dock), none floating mid-sheet.
const chipCount = await page.locator('button:has-text("Get reservation")').count()
const directionsCount = await page.locator('button:has-text("Directions")').count()
console.log({ chipCount, directionsCount })

await page.click('button[aria-expanded="true"]')
await page.waitForTimeout(700)
await page.screenshot({ path: '/tmp/inline-collapsed.png', clip })

console.log('done')
await browser.close()
