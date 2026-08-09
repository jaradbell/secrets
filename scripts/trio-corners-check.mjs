/**
 * Walks 5C's new corner chrome: Do room home (menu handle left, wallet
 * ticket right, trio pill center) → wallet fans the receipt deck → X
 * closes → menu handle cards the app over the drawer floor → tap the
 * card to come home.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#project-grid-ask')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')

// 1 — Do room home with both corner glyphs.
await frame.screenshot({ path: `${OUT}/c1-home-corners.png` })

// 2 — a briefing stub opens the receipt cycler zoomed to its artifact.
await page.getByRole('button', { name: /Dinner at Valette/ }).click()
await page.waitForTimeout(1400)
await frame.screenshot({ path: `${OUT}/c2-wallet-fan.png` })

// 3 — the dock's X closes the file.
await page.click('button[aria-label="Close receipts"]')
await page.waitForTimeout(1200)
await frame.screenshot({ path: `${OUT}/c3-closed.png` })

// 4 — menu handle: app cards right over the drawer floor.
await page.click('button[aria-label="Open menu"]')
await page.waitForTimeout(1100)
await frame.screenshot({ path: `${OUT}/c4-menu-floor.png` })

// 5 — tap the card to come home.
await page.mouse.click(790, 470)
await page.waitForTimeout(1100)
await frame.screenshot({ path: `${OUT}/c5-back-home.png` })

await browser.close()
console.log('done')
