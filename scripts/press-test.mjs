/**
 * Drives a real Chrome through the voice interaction: press-and-hold the orb
 * (fake mic auto-granted), screenshot mid-hold and mid-rise, release, and
 * screenshot the recede. Run: node scripts/press-test.mjs
 */
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--hide-scrollbars',
  ],
})
const page = await browser.newPage({ viewport: { width: 800, height: 1000 } })
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

const box = await page.locator('button').boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2

await page.mouse.move(cx, cy)
await page.mouse.down()
await page.waitForTimeout(700)
await page.screenshot({ path: '/tmp/liquid-rising.png' })
await page.waitForTimeout(2000)
await page.screenshot({ path: '/tmp/liquid-full.png' })

await page.mouse.up()
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/liquid-receding.png' })

await browser.close()
console.log('OK')
