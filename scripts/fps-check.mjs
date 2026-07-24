/**
 * Measures rendering smoothness: samples requestAnimationFrame deltas for
 * ~3s at idle and ~3s while holding the orb, and prints avg fps plus the
 * count of dropped frames (delta > 25ms). Run: node scripts/fps-check.mjs
 */
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--hide-scrollbars',
  ],
})
const page = await browser.newPage({ viewport: { width: 800, height: 1000 } })
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

const sample = () =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = []
        let last = performance.now()
        const tick = (now) => {
          deltas.push(now - last)
          last = now
          if (deltas.length < 180) requestAnimationFrame(tick)
          else {
            const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length
            resolve({
              avgFps: Math.round(1000 / avg),
              dropped: deltas.filter((d) => d > 25).length,
              worstMs: Math.round(Math.max(...deltas)),
            })
          }
        }
        requestAnimationFrame(tick)
      }),
  )

const idle = await sample()

const box = await page.locator('button').boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.waitForTimeout(500)
const listening = await sample()
await page.mouse.up()

console.log('idle:     ', JSON.stringify(idle))
console.log('listening:', JSON.stringify(listening))
await browser.close()
