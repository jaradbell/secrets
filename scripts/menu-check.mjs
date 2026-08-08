/**
 * Walks 5E's Timepage-style menu: Assistant home → menu open (the app
 * pulls right into a floating card over the dark menu floor) → tap the
 * card to come home → menu again → tap a loose thread to sail straight
 * into its conversation → chevron back to the grid.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'
const CARD = 1100 // card spring + menu content stagger

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#project-grid-menu')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')

// 1 — Assistant home, three-bar handle top-left.
await frame.screenshot({ path: `${OUT}/m1-home.png` })

// 2 — menu open: app carded right, dark floor with nav + threads.
await page.click('button[aria-label="Open menu"]')
await page.waitForTimeout(CARD)
await frame.screenshot({ path: `${OUT}/m2-menu-floor.png` })

// 3 — tap the card anywhere to come home. The 393px frame is centered
// in the 1280px page (x ≈ 443–837); the carded app's visible sliver
// lives along the frame's right edge.
await page.mouse.click(790, 470)
await page.waitForTimeout(CARD)
await frame.screenshot({ path: `${OUT}/m3-card-home.png` })

// 4 — menu again, open a loose thread from the Conversations section.
await page.click('button[aria-label="Open menu"]')
await page.waitForTimeout(CARD)
await page
  .getByRole('dialog', { name: 'Menu' })
  .getByRole('button', { name: 'Gift ideas for Mom' })
  .click()
await page.waitForTimeout(3200)
await frame.screenshot({ path: `${OUT}/m4-thread-from-menu.png` })

// 5 — chevron pops back to the grid.
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(3200)
await frame.screenshot({ path: `${OUT}/m5-back-home.png` })

await browser.close()
console.log('done')
