/* Screenshot check for the 4D wallet-pass receipt gallery. */
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:49488/#receipt-objects-4d'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(BASE)
await page.waitForTimeout(1600)

await page.screenshot({ path: '/tmp/receipt-4d-top.png' })

const scroller = page.locator('#app-viewport [style*="scrollbar"]').first()
for (const [name, y] of [
  ['dining', 620],
  ['ride', 1240],
  ['hotel', 1860],
  ['tickets', 2480],
]) {
  await scroller.evaluate((el, top) => el.scrollTo({ top }), y)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `/tmp/receipt-4d-${name}.png` })
}

await browser.close()
console.log('done')
