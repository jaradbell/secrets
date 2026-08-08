/**
 * Walks the three-altitude loop:
 * home → Files → Sisters project container → receipts fan → back →
 * thread via the thread card → collapse (one floor: project) → collapse
 * (home).
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-home'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#file-room')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')
const box = await frame.boundingBox()
const cx = box.x + box.width / 2

// Notch dash → the Files state → Sisters project container
await page.click('button[aria-label="Files"]')
await page.waitForTimeout(1000)
await page.getByText('Sisters Birthday Weekend').click()
await page.waitForTimeout(2800)
await frame.screenshot({ path: `${OUT}/1-project-container.png` })

// Hero card → the receipts fan pulls up over the container
await page.getByRole('button', { name: /Dinner at Valette/ }).click()
await page.waitForTimeout(1300)
await frame.screenshot({ path: `${OUT}/2-receipts-fan.png` })

// Backdrop tap steps back to the container
await page.mouse.click(cx, box.y + box.height * 0.05)
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/3-back-to-container.png` })

// Thread card → descend into the conversation
await page.getByText('Open conversation').click()
await page.waitForTimeout(2800)
await frame.screenshot({ path: `${OUT}/4-thread.png` })

// Chevron climbs ONE floor — back to the project container
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(2800)
await frame.screenshot({ path: `${OUT}/5-back-to-project.png` })

// Chevron again — home
await page.click('button[aria-label="Back to home"]')
await page.waitForTimeout(2800)
await frame.screenshot({ path: `${OUT}/6-home.png` })

await browser.close()
console.log('done')
