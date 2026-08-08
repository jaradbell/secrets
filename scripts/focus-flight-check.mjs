/** Grabs mid-flight frames of the task note lift to confirm no reflow,
    samples the card's box over time (the growth must be monotonic — no
    holds, no end-snap), and walks the return leg to check the landing. */
import { chromium } from 'playwright-core'
const OUT = 'screens/project-grid'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })
await page.goto('http://localhost:49488/#projects-moodboard')
await page.waitForTimeout(1500)
const frame = page.locator('#app-viewport')
await page.getByRole('button', { name: 'Board' }).click()
await page.waitForTimeout(2200)

// Sample the flying note's box every animation frame from the tap.
await page.evaluate(() => {
  window.__samples = []
  const tick = () => {
    const el = document.querySelector('[data-focus-clone]')
    const clip = document.querySelector('[data-focus-clip]')
    if (el) {
      const r = el.getBoundingClientRect()
      window.__samples.push({
        t: performance.now(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        // Untransformed layout heights: the clip box and its content.
        clip: clip ? clip.offsetHeight : -1,
        inner: clip && clip.firstElementChild ? clip.firstElementChild.offsetHeight : -1,
      })
    }
    if (window.__samples.length < 90) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
await page.getByText('Split the hotel with Anna').click({ force: true })
await page.waitForTimeout(120)
await frame.screenshot({ path: `${OUT}/ff1-mid1.png` })
await page.waitForTimeout(120)
await frame.screenshot({ path: `${OUT}/ff2-mid2.png` })
await page.waitForTimeout(700)
await frame.screenshot({ path: `${OUT}/ff3-settled.png` })

const samples = await page.evaluate(() => window.__samples)
if (samples.length) {
  const t0 = samples[0].t
  console.log(
    samples
      .filter((_, i) => i % 3 === 0)
      .map((s) => `${Math.round(s.t - t0)}ms ${s.w}x${s.h} clip=${s.clip} inner=${s.inner}`)
      .join('\n'),
  )
}

// The return leg — tap the scrim (inside the phone frame, below the
// note), catch the landing frames.
const box = await frame.boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height - 220)
await page.waitForTimeout(120)
await frame.screenshot({ path: `${OUT}/ff4-return-mid.png` })
await page.waitForTimeout(110)
await frame.screenshot({ path: `${OUT}/ff5-landing.png` })
await page.waitForTimeout(500)
await frame.screenshot({ path: `${OUT}/ff6-landed.png` })
await browser.close()
console.log('done')
