/**
 * Verifies the composer orb rides above 2D's overlays: land on the
 * transaction, open a place's details, then step into checkout — the dock
 * orb should stay visible at every layer.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/txn-2d'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#transaction-2d')
await page.waitForTimeout(2500)

const frame = page.locator('#app-viewport')
await frame.screenshot({ path: `${OUT}/f1-landing.png` })

// Open the focused place card's details.
await page.locator('[data-place-card]').first().click()
await page.waitForTimeout(1600)
await frame.screenshot({ path: `${OUT}/f2-details.png` })

// Step into checkout.
await page.getByText('Get reservation', { exact: true }).click()
await page.waitForTimeout(1600)
await frame.screenshot({ path: `${OUT}/f3-checkout.png` })

await browser.close()
console.log('done')
