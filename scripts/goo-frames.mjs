// Capture the LogoGoo animation at several points in its 11s cycle.
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 800, height: 1000 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)

// Times (ms into the cycle) chosen to hit: home, absorb, dormant+C-pulse, re-bud, settled.
const marks = [500, 2900, 4300, 5900, 8500]
let prev = 0
for (const m of marks) {
  await page.waitForTimeout(m - prev)
  prev = m
  await page.screenshot({ path: `/tmp/goo-frame-${m}.png`, clip: { x: 320, y: 290, width: 160, height: 160 } })
}
await browser.close()
console.log('done')
