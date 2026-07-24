import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
await context.grantPermissions(['microphone'])
const page = await context.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console error]', m.text())
})
await page.goto('http://localhost:5173/#transaction', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

// Open the details sheet for the front card, then tap "Get reservation"
// (a quick tap = bare intent, so the agent must follow up).
await page.locator('[data-place-card]').first().click()
await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Get reservation' }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: '/tmp/followup-1.png', clip })
// After the transient window the prompt should hand back to the hint.
await page.waitForTimeout(3200)
await page.screenshot({ path: '/tmp/followup-2.png', clip })

// Fill the time slot via its popover — the prompt should re-develop.
await page.getByRole('button', { name: 'Time' }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: '7:30 PM' }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: '/tmp/followup-3.png', clip })
await page.waitForTimeout(3200)
await page.screenshot({ path: '/tmp/followup-4.png', clip })

// Change of heart — the cancel circle should abandon the follow-up and
// morph the pill back down to the orb.
await page.getByRole('button', { name: 'Cancel reservation follow-up' }).click()
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/followup-5.png', clip })

console.log('done')
await browser.close()
