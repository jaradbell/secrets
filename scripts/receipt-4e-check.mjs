/* Screenshot check for the 4E editorial receipt gallery. */
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:49488/#receipt-objects-4e'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(BASE)
await page.waitForTimeout(1600)

await page.screenshot({ path: '/tmp/receipt-4e-top.png' })

const scroller = page.locator('#app-viewport [style*="scrollbar"]').first()
for (const [name, y] of [
  ['dining', 700],
  ['ride', 1400],
  ['hotel', 2100],
  ['tickets', 2800],
]) {
  await scroller.evaluate((el, top) => el.scrollTo({ top }), y)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `/tmp/receipt-4e-${name}.png` })
}

await browser.close()
console.log('done')
