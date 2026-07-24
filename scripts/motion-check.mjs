/**
 * Continuity check for the glyph: samples the glyph canvas as PNG data at
 * short intervals and reports how many pixels changed between consecutive
 * frames. Continuous motion = every sample differs. Run after edits with:
 * node scripts/motion-check.mjs
 */
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--hide-scrollbars'],
})
const page = await browser.newPage({ viewport: { width: 800, height: 1000 } })
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

const samples = []
for (let i = 0; i < 6; i++) {
  samples.push(
    await page.evaluate(() => {
      const canvas = document.querySelector('button canvas')
      return canvas.toDataURL()
    }),
  )
  await page.waitForTimeout(120)
}
let changed = 0
for (let i = 1; i < samples.length; i++) {
  if (samples[i] !== samples[i - 1]) changed++
}
console.log(`frames sampled: ${samples.length}, consecutive diffs: ${changed}/5`)
await browser.close()
