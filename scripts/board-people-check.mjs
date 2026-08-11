/**
 * Walks 5A's collaborators chip: each cluster pins a faces chip; tapping
 * the Sisters one lifts it and unfolds the roster card — everyone on the
 * board with roles, plus an invite row that adds for real. Invite
 * "Jordan", watch the roster and the lifted chip take the new face,
 * dismiss, and see the board chip wear it too.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#projects-moodboard')
await page.waitForTimeout(1500)
const frame = page.locator('#app-viewport')

await page.getByRole('button', { name: 'Board' }).click()
await page.waitForTimeout(2200)

// 1 — the chips on the board.
await frame.screenshot({ path: `${OUT}/p1-faces-chips.png` })

// 2 — lift the Sisters chip (Morganne's face is unique to it).
await page.locator('img[alt="Morganne"]').click({ force: true })
await page.waitForTimeout(1100)
await frame.screenshot({ path: `${OUT}/p2-roster-open.png` })

// 3 — invite someone; they land in the roster and the lifted chip.
await page.getByLabel('Invite someone').click()
await page.keyboard.type('Jordan')
await page.getByRole('button', { name: 'Invite' }).click()
await page.waitForTimeout(700)
await frame.screenshot({ path: `${OUT}/p3-invited.png` })

// 4 — dismiss; the cluster chip wears the new face count.
await page.mouse.click(470, 880)
await page.waitForTimeout(1000)
await frame.screenshot({ path: `${OUT}/p4-back-with-guest.png` })

await browser.close()
console.log('done')
