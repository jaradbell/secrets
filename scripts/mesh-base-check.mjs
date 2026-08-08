/**
 * One-off: verify 5E keeps the mesh poured at the base — Assistant home,
 * the Projects board, and a project floor should all show the glow along
 * the bottom, never the full-frame flood.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'
const SLIDE = 2600 // place crossfade + mesh settle
const DRAWER = 900

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#project-grid-menu')
await page.waitForTimeout(2600)

const frame = page.locator('#app-viewport')

// 1 — Assistant home: mesh should sit at the base, canvas white above.
await frame.screenshot({ path: `${OUT}/mb1-home-base-mesh.png` })

// 2 — Projects board via the drawer: same base glow.
await page.click('button[aria-label="Open menu"]')
await page.waitForTimeout(DRAWER)
await page
  .getByRole('dialog', { name: 'Menu' })
  .getByRole('button', { name: 'Projects', exact: true })
  .click()
await page.waitForTimeout(SLIDE)
await frame.screenshot({ path: `${OUT}/mb2-projects-base-mesh.png` })

// 3 — open a project floor: still the base glow (no full-mesh flood).
await page.getByText('Kyoto in the fall').first().click()
await page.waitForTimeout(3200)
await frame.screenshot({ path: `${OUT}/mb3-project-base-mesh.png` })

await browser.close()
console.log('done')
