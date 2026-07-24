// Quick visual check: screenshot a prototype from the running dev server.
// Usage: node scripts/screenshot.mjs [hash] [outfile]
import { chromium } from 'playwright-core'

const hash = process.argv[2] ?? 'transaction'
const out = process.argv[3] ?? `/tmp/secrets-${hash}.png`

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1200, height: 950 } })
await page.goto(`http://localhost:5173/#${hash}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500) // let the shader settle a few frames
await page.screenshot({ path: out })
await browser.close()
console.log(out)
