/**
 * Walks the 2D compare surface: open from the Compare pill, capture the
 * half detent, drag the sheet to docked and to full, toggle providers, and
 * open a row's details — screenshots at every stop.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/txn-2d'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#transaction-2d')
await page.waitForTimeout(2500)

const frame = page.locator('#app-viewport')

// Open compare from the pill.
await page.getByText('Compare restaurants').click()
await page.waitForTimeout(1400)
await frame.screenshot({ path: `${OUT}/c1-half.png` })

// Drag from the sheet's header handle, clamped inside the page.
const grabber = page.locator('[data-compare-handle]')
const dragFrom = async (dy) => {
  const box = await grabber.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + 12
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 14; i++) {
    await page.mouse.move(x, Math.max(2, y + (dy * i) / 14), { steps: 2 })
  }
  await page.mouse.up()
  await page.waitForTimeout(1100)
}

// Down to docked.
await dragFrom(420)
await frame.screenshot({ path: `${OUT}/c2-docked.png` })

// Toggle provider while docked — pins should rewrite.
await page.getByRole('button', { name: 'Google Places' }).last().click()
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/c3-docked-google.png` })

// Up to full.
await dragFrom(-900)
await frame.screenshot({ path: `${OUT}/c4-full.png` })

// Toggle provider at full — rows should re-rank.
await page.getByRole('button', { name: 'OpenTable' }).last().click()
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/c5-full-opentable.png` })

// Open a row's details above the compare surface.
await page.getByText('Valette Restaurant').last().click()
await page.waitForTimeout(1500)
await frame.screenshot({ path: `${OUT}/c6-details-from-compare.png` })

await browser.close()
console.log('done')
