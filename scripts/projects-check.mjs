/**
 * Walks 5A — the projects moodboard: initial board, then scrolled to the
 * middle and bottom clusters.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/projects'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#projects-moodboard')
await page.waitForTimeout(2200)

const frame = page.locator('#app-viewport')
const box = await frame.boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2

await frame.screenshot({ path: `${OUT}/5a-1-board.png` })

// Scroll to the middle cluster
await page.mouse.move(cx, cy)
await page.mouse.wheel(0, 300)
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/5a-2-mid.png` })

// Scroll to the bottom of the board
await page.mouse.wheel(0, 600)
await page.waitForTimeout(900)
await frame.screenshot({ path: `${OUT}/5a-3-bottom.png` })

await browser.close()
console.log('done')
