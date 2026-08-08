/**
 * Walks 5E's board options chip: open the board, bloom the panel,
 * unfold each section, and exercise the live lenses — Archived shelf,
 * A-to-Z sort, Open-tasks filter, and the stacked + list views.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#project-grid-menu')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')
const chip = () => page.locator('button[aria-label*="tap for options"]')

// Onto the board.
await page.click('button[aria-label="Projects"]')
await page.waitForTimeout(2200)
await frame.screenshot({ path: `${OUT}/o1-board.png` })

// 1 — panel blooms from the chip.
await chip().click()
await page.waitForTimeout(600)
await frame.screenshot({ path: `${OUT}/o2-panel.png` })

// 2 — View section unfolded.
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'View' }).click()
await page.waitForTimeout(500)
await frame.screenshot({ path: `${OUT}/o3-view-open.png` })

// 3 — List view.
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'List' }).click()
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/o4-list.png` })

// 4 — Stacked view.
await chip().click()
await page.waitForTimeout(400)
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'View' }).click()
await page.waitForTimeout(450)
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'Stacked' }).click()
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/o5-stacked.png` })

// 5 — back to grid, filtered to open tasks.
await chip().click()
await page.waitForTimeout(400)
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'View' }).click()
await page.waitForTimeout(450)
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'Grid' }).click()
await page.waitForTimeout(700)
await chip().click()
await page.waitForTimeout(400)
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'Filter' }).click()
await page.waitForTimeout(450)
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'Open tasks' }).click()
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/o6-filter-tasks.png` })

// 6 — Archived shelf (also resets nothing else — filter persists by design).
await chip().click()
await page.waitForTimeout(400)
await page.getByRole('menu', { name: 'Board options' }).getByRole('button', { name: 'Archived' }).click()
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/o7-archived.png` })

await browser.close()
console.log('done')
