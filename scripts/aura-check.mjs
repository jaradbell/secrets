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

const orb = await page.getByRole('button', { name: 'Hold or tap to speak' }).boundingBox()
await page.mouse.move(orb.x + orb.width / 2, orb.y + orb.height / 2)
await page.mouse.down()

for (let i = 1; i <= 5; i++) {
  await page.waitForTimeout(140)
  await page.screenshot({ path: `/tmp/aura-${i}.png`, clip })
}
await page.waitForTimeout(1200)
await page.screenshot({ path: '/tmp/aura-held.png', clip })
await page.waitForTimeout(600)
await page.screenshot({ path: '/tmp/aura-held2.png', clip })

await page.mouse.up()
await page.waitForTimeout(250)
await page.screenshot({ path: '/tmp/aura-release.png', clip })
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/aura-after.png', clip })

console.log('done')
await browser.close()
