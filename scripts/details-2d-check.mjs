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
await page.goto('http://localhost:5173/#receipt', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

// Tap the front card to open details.
const card = await page.locator('[data-place-card="valette"]').boundingBox()
await page.mouse.click(card.x + card.width / 2, card.y + card.height / 2)
await page.waitForTimeout(250)
await page.screenshot({ path: '/tmp/details-2d-mid.png', clip })
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/details-2d-open.png', clip })

// Scroll the sheet to see the lower sections.
await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2)
await page.mouse.wheel(0, 500)
await page.waitForTimeout(500)
await page.screenshot({ path: '/tmp/details-2d-scrolled.png', clip })

// Close via back.
await page.mouse.wheel(0, -800)
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Back to results' }).click()
await page.waitForTimeout(250)
await page.screenshot({ path: '/tmp/details-2d-closing.png', clip })
await page.waitForTimeout(600)
await page.screenshot({ path: '/tmp/details-2d-closed.png', clip })

console.log('done')
await browser.close()
