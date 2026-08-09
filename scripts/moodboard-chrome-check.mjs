/**
 * Walks 5A's chrome: Home|Board switch left-anchored, drawer handle top
 * right, + and keyboard flanking the orb → drawer floor and back → the
 * drawer's Wallet / Receipts row fans the global deck → X closes →
 * Board face → dock + raises the composer.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/moodboard'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#projects-moodboard')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')

// 1 — Home face: switch left, handle right, dock flanks.
await frame.screenshot({ path: `${OUT}/h1-home.png` })

// 2 — drawer: app cards right over the menu floor.
await page.click('button[aria-label="Open menu"]')
await page.waitForTimeout(1100)
await frame.screenshot({ path: `${OUT}/h2-menu.png` })

// 3 — the Wallet / Receipts row fans the global deck.
await page
  .getByRole('dialog', { name: 'Menu' })
  .getByRole('button', { name: 'Wallet / Receipts' })
  .click()
await page.waitForTimeout(1600)
await frame.screenshot({ path: `${OUT}/h4-wallet.png` })

// 4 — X closes the deck.
await page.click('button[aria-label="Close receipts"]')
await page.waitForTimeout(1200)

// 5 — Board face.
await page.getByRole('button', { name: 'Board' }).click()
await page.waitForTimeout(1400)
await frame.screenshot({ path: `${OUT}/h3-board.png` })

// 6 — dock + raises the composer.
await page.click('button[aria-label="New"]')
await page.waitForTimeout(1000)
await frame.screenshot({ path: `${OUT}/h5-compose.png` })

await browser.close()
console.log('done')
