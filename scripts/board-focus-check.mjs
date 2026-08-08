/**
 * Walks 5A's artifact focus: tap the Sisters task note → it lifts off
 * the board (scrim behind), check a task off manually, raise the
 * assistant from a task label and let it complete the task, add a new
 * task, dismiss, then isolate a photo.
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

// 1 — lift the Sisters task note.
await page.getByText('Split the hotel with Anna').click({ force: true })
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/f1-note-focus.png` })

// 2 — manual check-off: the playlist task flips done.
await page.getByRole('button', { name: /Mark .Make the drive playlist. done/ }).click()
await page.waitForTimeout(500)

// 3 — the words raise the assistant.
await page.getByRole('button', { name: 'Order the birthday cake', exact: true }).click()
await page.waitForTimeout(500)
await frame.screenshot({ path: `${OUT}/f2-assistant-prompt.png` })

// 4 — let it handle the task (working beat, then done).
await page.getByRole('button', { name: 'Do it' }).click()
await page.waitForTimeout(400)
await frame.screenshot({ path: `${OUT}/f3-working.png` })
await page.waitForTimeout(1400)

// 5 — add a task.
await page.getByRole('button', { name: 'Add a task' }).click()
await page.keyboard.type('Book the spa morning')
await page.keyboard.press('Enter')
await page.waitForTimeout(500)
await frame.screenshot({ path: `${OUT}/f4-checked-added.png` })

// 6 — dismiss; the note flies home carrying its new state.
await page.mouse.click(470, 860)
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/f5-back-on-board.png` })

// 7 — a photo isolates too.
await page.locator('img[src="/receipts/photos/hotel-pool.jpg"]').click({ force: true })
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/f6-photo-focus.png` })

await browser.close()
console.log('done')
