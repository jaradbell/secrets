// 2C draft-object flow: pick turn stays; booking appends exchanges.
// 1. Get reservation → user bubble + assistant + empty draft card
// 2. Hold orb → simulated utterance appends a turn; old card hides, new card
// 3. Tap card body → full place details view; back returns to the draft;
//    a field row opens its own picker sheet
// 4. Confirm on the card → booking → confirmed turn with the 4E ticket
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:49488/#transaction-2c', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const frame = await page.locator('#app-viewport').boundingBox()
const clip = { x: frame.x, y: frame.y, width: frame.width, height: frame.height }
const shot = (name) =>
  page.screenshot({ path: `screens/transaction-2c-draft/${name}.png`, clip })

// Open details from the stack, start the reservation with empty slots.
const box = await page.locator('[aria-roledescription="carousel"]').boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + 55)
await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Get reservation' }).click()
await page.waitForTimeout(600)
await shot('1-draft-typing')
await page.waitForTimeout(1400)
await shot('2-draft-empty')

// Hold the orb — the simulated utterance answers time + party, which
// appends a new user turn and a fresh draft card.
const orb = await page
  .locator('button[aria-label*="speak"], button[aria-label="Voice input"], button[aria-label*="Ready"]')
  .last()
  .boundingBox()
await page.mouse.move(orb.x + orb.width / 2, orb.y + orb.height / 2)
await page.mouse.down()
await page.waitForTimeout(900)
await page.mouse.up()
await page.waitForTimeout(500)
await shot('3-update-typing')
await page.waitForTimeout(1500)
await shot('4-draft-filled')

// Summary → details: the card body opens the restaurant's full details
// view; back returns to the thread. Then a field row edits just its slot.
const card = await page.getByRole('button', { name: 'View restaurant details' }).boundingBox()
await page.mouse.click(card.x + card.width / 2, card.y + 90)
await page.waitForTimeout(1200)
await shot('5-place-details')
await page.getByRole('button', { name: 'Back to results' }).click()
await page.waitForTimeout(900)
await page.getByRole('button', { name: 'Edit time' }).click()
await page.waitForTimeout(700)
await page.getByRole('button', { name: '8:00 PM' }).click()
await page.waitForTimeout(900)
await shot('6-draft-after-edit')

// The explicit go — confirm on the card, wait out booking, receipt lands.
await page.getByRole('button', { name: 'Confirm reservation' }).click()
await page.waitForTimeout(600)
await shot('7-confirming')
await page.waitForTimeout(3200)
await shot('8-receipt-turn')

console.log('done')
await browser.close()
