/**
 * Walks the 1C altitude loop, notch model:
 * home → notch to Files → Sisters project → its trip file → backdrop
 * back → "Dinner with investors" → thread (2D) → collapse → home.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/file-room'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#file-room')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')
const box = await frame.boundingBox()
const cx = box.x + box.width / 2

await frame.screenshot({ path: `${OUT}/1-home.png` })

// Notch dash → the Files state
await page.click('button[aria-label="Files"]')
await page.waitForTimeout(1000)
await frame.screenshot({ path: `${OUT}/2-files.png` })

// Open the Sisters project → its trip file pulls up over the home
await page.getByText('Sisters Birthday Weekend').click()
await page.waitForTimeout(1300)
await frame.screenshot({ path: `${OUT}/3-project-trip-file.png` })

// Backdrop tap (above the deck's drag surface) steps back down
await page.mouse.click(cx, box.y + box.height * 0.05)
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/4-back-to-files.png` })

// Drop into the investors thread
await page.getByText('Dinner with investors').click()
await page.waitForTimeout(1400)
await frame.screenshot({ path: `${OUT}/5-thread.png` })

// Collapse chevrons climb back to the home
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(1100)
await frame.screenshot({ path: `${OUT}/6-home-again.png` })

await browser.close()
console.log('done')
