/**
 * Walks the 5B descent and its history-based back:
 * grid → Sisters conversation (card is a doorway to the convo) → island
 * opens the project container → back pops to the conversation → back to
 * the grid, then grid → investors conversation → back → grid. Finishes by
 * re-checking 1C: Files rows drop straight into conversations.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'
const GOO = 2800 // full goo transition: veil + loader beat + reveal

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#project-grid')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')

await frame.screenshot({ path: `${OUT}/1-grid.png` })

// Sisters card → its conversation
await page.getByText('Sisters Birthday Weekend').click()
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/2-thread.png` })

// The island → the project container
await page.click('button[aria-label="Conversation: Sisters Birthday Weekend"]')
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/3-project-home.png` })

// Back pops to the conversation (came from there)
await page.click('button[aria-label="Back to home"]')
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/4-back-to-thread.png` })

// Back again pops to the grid
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/5-back-to-grid.png` })

// Investors card → straight into its conversation
await page.getByText('Dinner with investors').click()
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/6-investors-thread.png` })

// Back pops to the grid
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/7-back-to-grid.png` })

// ── 1C re-check: project rows are conversation doorways ──────────────────
await page.goto('http://localhost:49488/#file-room')
await page.waitForTimeout(1800)
await page.click('button[aria-label="Files"]')
await page.waitForTimeout(1000)
await page.getByText('Sisters Birthday Weekend').click()
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/8-1c-sisters-thread.png` })
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/9-1c-back-home.png` })

await browser.close()
console.log('done')
