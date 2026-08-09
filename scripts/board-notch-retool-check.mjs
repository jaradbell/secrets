/**
 * Walks 5A's retooled chrome: the wallet now lives top-right on both
 * faces (deck fans from the Assistant too), and the board notch carries
 * two board verbs — find (search sheet + one-tap lenses) and tidy
 * (the collage squares up, tap again to relax).
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#projects-moodboard')
await page.waitForTimeout(1500)
const frame = page.locator('#app-viewport')

// 1 — Assistant face: wallet in the top-right chrome.
await frame.screenshot({ path: `${OUT}/n1-assistant-wallet-chrome.png` })

// 2 — the deck fans over the Assistant, no board required.
await page.getByRole('button', { name: 'Open wallet' }).click()
await page.waitForTimeout(1200)
await frame.screenshot({ path: `${OUT}/n2-wallet-over-assistant.png` })

// 3 — fresh page onto the board: notch holds find + tidy.
await page.reload()
await page.waitForTimeout(1500)
await page.getByRole('button', { name: 'Board' }).click()
await page.waitForTimeout(2200)
await frame.screenshot({ path: `${OUT}/n3-board-notch-find-tidy.png` })

// 4 — find: the sheet rises wearing the lenses above the field.
await page.getByRole('button', { name: 'Find on the board' }).click()
await page.waitForTimeout(800)
await frame.screenshot({ path: `${OUT}/n4-find-sheet-lenses.png` })

// 5 — one tap of "Booked": Kyoto (no bookings) recedes; put the
// keyboard down and the resting chip wears the lens.
await page.getByRole('button', { name: 'Booked' }).click()
await page.waitForTimeout(600)
await page.getByRole('button', { name: 'Dismiss search' }).click()
await page.waitForTimeout(700)
await frame.screenshot({ path: `${OUT}/n5-lens-applied.png` })

// 6 — tidy: every pin squares up and holds still.
await page.getByRole('button', { name: 'Tidy the board' }).click()
await page.waitForTimeout(1000)
await frame.screenshot({ path: `${OUT}/n6-tidied.png` })

await browser.close()
console.log('done')
