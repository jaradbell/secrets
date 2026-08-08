/**
 * Walks the two draft empty states:
 *
 * 5B (templates) — new project → LogoGoo centered under "Ask anything",
 * the template deck fanned behind the composer (no island yet) → swipe
 * the front card aside → tap the new front card → the card becomes the
 * first chat bubble on this same screen, the agent replies with a
 * question + suggestions, the island appears fit-to-text → pick a
 * suggestion (another exchange in place) → back to the grid (card
 * saved). Then open another draft, say nothing, and leave — no husk.
 *
 * 5C (trio) — three rooms under one segmented pill (Todo · Do · Decide,
 * Do home) → Todo is the board, Decide the quiet calls room → a new
 * project morphs the pill into the context chip (no goo, no page feel)
 * → seed chip starts the conversation, the chip carries the name →
 * collapse morphs the chip back into the segments, project saved.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'
const GOO = 2800

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
const frame = page.locator('#app-viewport')

// ── 5B: templates ─────────────────────────────────────────────────────
await page.goto('http://localhost:49488/#project-grid')
await page.waitForTimeout(1800)
await page.getByText('New project', { exact: true }).first().click()
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/b1-fan-rest.png` })

// Swipe the front template card aside — it swims to the back
const front = page.locator('[aria-label="Start from template: Plan a birthday weekend"]')
const box = await front.boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
for (let i = 1; i <= 8; i++) {
  await page.mouse.move(box.x + box.width / 2 - i * 20, box.y + box.height / 2 + i * 1.5)
  await page.waitForTimeout(16)
}
await page.mouse.up()
await page.waitForTimeout(700)
await frame.screenshot({ path: `${OUT}/b2-fan-swiped.png` })

// Tap the new front card — it morphs into the first chat bubble on this
// same screen; the agent replies with a question + suggested first moves
await page.locator('[aria-label="Start from template: Family vacation"]').click()
await page.waitForTimeout(260)
await frame.screenshot({ path: `${OUT}/b3-chat-bubble.png` })
await page.waitForTimeout(1640)
await frame.screenshot({ path: `${OUT}/b4-chat-reply.png` })
const bubble = await page.getByText('Start a project for a family vacation.').count()
console.log('card became chat bubble:', bubble > 0 ? 'yes' : 'NO — MISSING')

// Answer the agent's question — the script advances to recommendations
await page.getByText('Maui in June').click()
await page.waitForTimeout(1500)
await frame.screenshot({ path: `${OUT}/b5-chat-recs.png` })
const recs = await page.getByText('Grand Wailea').count()
console.log('recommendations surfaced:', recs > 0 ? 'yes' : 'NO — MISSING')

// Pick a recommendation — the agent wraps up with next moves
await page.getByText('Grand Wailea').click()
await page.waitForTimeout(1500)
await frame.screenshot({ path: `${OUT}/b6-chat-wrapup.png` })

// Back to the grid — the named project is saved as a card
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/b7-grid-saved.png` })
const saved = await page.getByText('Family vacation').count()
console.log('named draft on grid:', saved > 0 ? 'yes' : 'NO — MISSING')

// Abandon path: open a fresh draft, say nothing, leave — no husk saved
await page.getByText('New project', { exact: true }).first().click()
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/b8-fan-unnamed-no-island.png` })
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(GOO)
const husks = await page.getByText('Planning · just started').count()
console.log('planning cards after abandon (want 1):', husks)
await frame.screenshot({ path: `${OUT}/b9-grid-no-husk.png` })

// ── 5C: trio ──────────────────────────────────────────────────────────
await page.goto('http://localhost:49488/#project-grid-ask')
await page.waitForTimeout(2000)
// Do is home: the assistant composition under the three-segment pill.
const segs = await page.locator(
  'button[aria-label="Todo"], button[aria-label="Do"], button[aria-label="Decide"]',
).count()
console.log('trio segments at home (want 3):', segs)
await frame.screenshot({ path: `${OUT}/c1-trio-home.png` })

// Todo — the board, titled by the pill alone (no island of its own).
await page.click('button[aria-label="Todo"]')
await page.waitForTimeout(1400)
await frame.screenshot({ path: `${OUT}/c2-trio-todo.png` })

// Decide — the quiet calls room on the full mesh.
await page.click('button[aria-label="Decide"]')
await page.waitForTimeout(1400)
await frame.screenshot({ path: `${OUT}/c3-trio-decide.png` })

// A new project from the board: no goo — the pill morphs into the chip.
await page.click('button[aria-label="Todo"]')
await page.waitForTimeout(1200)
await page.getByText('New project', { exact: true }).first().click()
await page.waitForTimeout(320)
await frame.screenshot({ path: `${OUT}/c4-trio-morph.png` })
await page.waitForTimeout(1400)
const chip = await page.getByText('New project', { exact: true }).count()
console.log('pill became context chip (want ≥1):', chip)
await frame.screenshot({ path: `${OUT}/c5-trio-draft.png` })

// A seed chip names the conversation; the chip carries the new name.
await page.getByText('Organize a birthday dinner').click()
await page.waitForTimeout(1700)
await frame.screenshot({ path: `${OUT}/c6-trio-chat.png` })

// Collapse — the chip morphs back into the segments; project saved.
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(1600)
const back = await page.locator('button[aria-label="Do"]').count()
console.log('segments back after collapse (want 1):', back)
await frame.screenshot({ path: `${OUT}/c7-trio-back.png` })

await browser.close()
console.log('done')
