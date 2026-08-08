/**
 * Walks 5B's new-project birth (tap path):
 * grid → tap the dashed tile → the draft's guide floor → tap a seed
 * prompt (names the project) → collapse → grid again with the named
 * planning card over the tile.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'
const GOO = 2800 // full goo transition: veil + loader beat + reveal

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#project-grid')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')

await frame.screenshot({ path: `${OUT}/n1-grid.png` })

// The dashed tile births a project and drops into its conversation
await page.getByText('New project', { exact: true }).click()
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/n2-draft-guide.png` })

// A seed prompt names the project — same as speaking it
await page.getByText('Plan a weekend away').click()
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/n3-draft-named.png` })

// Back pops to the grid — the named card waits over the tile
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/n4-grid-with-draft.png` })

// The new card is a doorway back into its conversation
await page.getByText('Plan a weekend away').click()
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/n5-back-in-draft.png` })

await browser.close()
console.log('done')
