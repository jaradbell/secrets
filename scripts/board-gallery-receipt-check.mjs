/**
 * Walks 5A's booking marks and photo roll: tap the Expedia sticker → the
 * mark climbs and its receipt object unfurls beneath; dismiss. Tap a
 * photo → it flies into a vertical portrait roll (lookbook, not a stack)
 * with an editable note + provenance under each shot and the voice orb
 * still live at the base; scroll the roll, upload a photo from disk onto
 * its open end, type its note, and close.
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

// 1 — the Expedia mark is the hotel booking's face.
await page.locator('img[src="/providers/expedia.png"]').click({ force: true })
await page.waitForTimeout(1100)
await frame.screenshot({ path: `${OUT}/g1-sticker-receipt.png` })

// 2 — dismiss; the mark flies home, the receipt slips away.
await page.mouse.click(470, 880)
await page.waitForTimeout(900)

// 3 — a photo opens the roll, seated on that shot. Orb stays live below.
await page.locator('img[src="/receipts/photos/hotel-pool.jpg"]').first().click({ force: true })
await page.waitForTimeout(1300)
await frame.screenshot({ path: `${OUT}/g2-gallery-open.png` })

// 4 — scroll down the roll to the neighbor shot.
await page.evaluate(() => {
  const el = document.querySelector('.overscroll-contain')
  el.scrollBy({ top: el.clientHeight * 0.62, behavior: 'smooth' })
})
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/g3-gallery-swiped.png` })

// 5 — the roll's open end takes real files.
await page.evaluate(() => {
  const el = document.querySelector('.overscroll-contain')
  el.scrollTo({ top: el.scrollHeight, behavior: 'instant' })
})
await page.waitForTimeout(500)
await frame.screenshot({ path: `${OUT}/g4-add-tile.png` })
await page.locator('input[type="file"]').setInputFiles('public/places/bravas.jpg')
await page.waitForTimeout(1200)

// 6 — uploads take a hand-typed note.
await page.locator('input[placeholder="Add a note…"]').last().click()
await page.keyboard.type('Tapas idea for Friday')
await page.waitForTimeout(400)
await frame.screenshot({ path: `${OUT}/g5-uploaded-captioned.png` })

// 7 — the close chip puts the roll away; the board photo pops back.
await page.getByRole('button', { name: 'Close gallery' }).click()
await page.waitForTimeout(800)
await frame.screenshot({ path: `${OUT}/g6-back-on-board.png` })

await browser.close()
console.log('done')
