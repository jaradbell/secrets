/* Trip file overlay check: island tap → gradient + blur + ticket fan,
   orb→X morph, swipe left/right through tickets, swipe up to the tasks
   deck, and each task-row door: done → focused receipt, active → thread
   highlight, todo → new seeded thread. */
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
const box = await frame.boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height * 0.45

const dragTo = async (dx, dy) => {
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + dx, cy + dy, { steps: 10 })
  await page.mouse.up()
}

await frame.screenshot({ path: `${OUT}/0-idle.png` })

// Open via the header island
await page.click('button[aria-label^="Conversation:"]')
await page.waitForTimeout(1400)
await frame.screenshot({ path: `${OUT}/1-receipts.png` })

// Horizontal: step the fan
await dragTo(-180, 0)
await page.waitForTimeout(700)
await frame.screenshot({ path: `${OUT}/2-fan-swiped.png` })

// Vertical: swipe up to the tasks deck
await dragTo(0, -160)
await page.waitForTimeout(800)
await frame.screenshot({ path: `${OUT}/3-tasks.png` })

// Done row → flips back to receipts with the flight focused
await page.getByRole('button', { name: /Book flights to SFO/ }).click()
await page.waitForTimeout(800)
await frame.screenshot({ path: `${OUT}/4-flip-to-flight.png` })

// Back to tasks, tap the in-flight row → close + thread highlight pulse
await dragTo(0, -160)
await page.waitForTimeout(700)
await page.getByRole('button', { name: /Book the birthday dinner/ }).click()
await page.waitForTimeout(750)
await frame.screenshot({ path: `${OUT}/5-thread-highlight.png` })
await page.waitForTimeout(1800)

// Reopen, up to tasks, tap the untouched row → new seeded thread
await page.click('button[aria-label^="Conversation:"]')
await page.waitForTimeout(1200)
await dragTo(0, -160)
await page.waitForTimeout(700)
await frame.screenshot({ path: `${OUT}/6-tasks-again.png` })
await page.getByRole('button', { name: /Order a birthday cake/ }).click()
await page.waitForTimeout(700)
await frame.screenshot({ path: `${OUT}/7-cake-typing.png` })
await page.waitForTimeout(1800)
await frame.screenshot({ path: `${OUT}/8-cake-reply.png` })

// Breadcrumb back to the weekend thread
await page.getByRole('button', { name: /Sisters Birthday Weekend/ }).first().click()
await page.waitForTimeout(600)
await frame.screenshot({ path: `${OUT}/9-back-to-main.png` })

await browser.close()
console.log('done')
