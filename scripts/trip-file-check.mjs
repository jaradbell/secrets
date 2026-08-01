/* Trip file overlay check: island tap → gradient + blur + ticket fan,
   orb→X morph, swipe to flip tickets, X tap to close. */
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:49488'
const OUT = 'screens/trip-file'

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto(`${BASE}/#transaction-2a`)
await page.waitForTimeout(1600)

const frame = page.locator('#app-viewport')
await frame.screenshot({ path: `${OUT}/0-idle.png` })

// Tap the header island
await page.click('button[aria-label^="Conversation:"]')
await page.waitForTimeout(500)
await frame.screenshot({ path: `${OUT}/1-opening.png` })
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/2-open.png` })

// Swipe the fan left twice (focus hotel, then dining)
const fanBox = await frame.boundingBox()
const cx = fanBox.x + fanBox.width / 2
const cy = fanBox.y + fanBox.height * 0.45
for (const n of [3, 4]) {
  await page.mouse.move(cx + 80, cy)
  await page.mouse.down()
  await page.mouse.move(cx - 100, cy, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(700)
  await frame.screenshot({ path: `${OUT}/${n}-swiped.png` })
}

// Close via the X (dock button) — catch a mid-exit frame too
await page.click('button[aria-label="Close receipts"]')
await page.waitForTimeout(180)
await frame.screenshot({ path: `${OUT}/5-closing.png` })
await page.waitForTimeout(700)
await frame.screenshot({ path: `${OUT}/6-closed.png` })

await browser.close()
console.log('done')
