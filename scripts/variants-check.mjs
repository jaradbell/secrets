// Walks each transaction direction (2A-2D) through: open details →
// "Get reservation" → fill time + party → book → receipt, capturing
// screenshots at each stage to /tmp/variant-<id>-<step>.png.
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
page.on('pageerror', (e) => console.log('[page error]', e.message))

const shot = async (name, clip) => page.screenshot({ path: `/tmp/variant-${name}.png`, clip })

const VARIANTS = ['2a', '2b', '2c', '2d']

for (const v of VARIANTS) {
  await page.goto(`http://localhost:5173/#transaction-${v}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)
  const frame = await page.locator('#app-viewport').boundingBox()
  const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }

  // Open details, start the follow-up with a bare intent.
  await page.locator('[data-place-card]').first().click()
  await page.waitForTimeout(1100)
  await page.getByRole('button', { name: 'Get reservation' }).click()
  await page.waitForTimeout(900)
  await shot(`${v}-followup`, clip)

  // Fill time + party through each direction's own surface.
  if (v === '2a') {
    await page.getByRole('button', { name: 'Time', exact: true }).click()
    await page.waitForTimeout(450)
    await page.getByRole('button', { name: '7:30 PM' }).click()
    await page.waitForTimeout(450)
    await page.getByRole('button', { name: 'Party', exact: true }).click()
    await page.waitForTimeout(450)
    await page.getByRole('button', { name: '4', exact: true }).click()
  } else if (v === '2b') {
    await page.getByRole('button', { name: /Add time/ }).click()
    await page.waitForTimeout(450)
    await page.getByRole('button', { name: '7:30 PM' }).click()
    await page.waitForTimeout(450)
    await page.getByRole('button', { name: /Add guests/ }).click()
    await page.waitForTimeout(450)
    await page.getByRole('button', { name: '4', exact: true }).click()
  } else if (v === '2c') {
    // Detail rows open picker sheets with an explicit Save.
    await page.getByRole('button', { name: /Add a time/ }).click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `/tmp/variant-${v}-sheet.png`, clip })
    await page.getByRole('button', { name: '7:30 PM' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: /Add guests/ }).click()
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: '4 guests' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Save' }).click()
  } else {
    // 2D exposes the chips directly.
    await page.getByRole('button', { name: '7:30 PM' }).click()
    await page.waitForTimeout(350)
    await page.getByRole('button', { name: '4', exact: true }).click()
  }
  await page.waitForTimeout(800)
  await shot(`${v}-ready`, clip)

  // The explicit go.
  if (v === '2a') {
    await page.getByRole('button', { name: 'Book', exact: true }).click()
  } else if (v === '2b') {
    await page.getByRole('button', { name: 'Confirm reservation' }).click()
  } else {
    await page.getByRole('button', { name: /Book 7:30 PM for 4/ }).click()
  }
  await page.waitForTimeout(600)
  await shot(`${v}-booking`, clip)
  await page.waitForTimeout(2200)
  await shot(`${v}-receipt`, clip)

  console.log(`variant ${v}: ok`)
}

console.log('done')
await browser.close()
