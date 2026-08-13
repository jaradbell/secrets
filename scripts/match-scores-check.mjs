/**
 * Walks the three Match Score explorations (7A score / 7B rank / 7C purple
 * gradient): open compare from the pill, capture the half detent's map pins
 * + list, then open the lead row's details for the ring treatment.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/match-scores'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })

for (const [tag, id] of [
  ['7a', 'match-scores-7a'],
  ['7b', 'match-scores-7b'],
  ['7c', 'match-scores-7c'],
  ['7d', 'match-scores-7d'],
  ['7e', 'match-scores-7e'],
  ['7f', 'match-scores-7f'],
  ['7g', 'match-scores-7g'],
  ['7h', 'match-scores-7h'],
]) {
  await page.goto(`http://localhost:49488/#${id}`)
  await page.reload()
  await page.waitForTimeout(2500)

  const frame = page.locator('#app-viewport')

  // Open compare from the pill — half detent shows map pins + list rows.
  await page.getByText('Compare restaurants').click()
  await page.waitForTimeout(1400)
  await frame.screenshot({ path: `${OUT}/${tag}-1-compare.png` })

  // Open the lead row's details for the match ring.
  await page.getByText('Valette Restaurant').last().click()
  await page.waitForTimeout(1500)
  await frame.screenshot({ path: `${OUT}/${tag}-2-details.png` })
}

await browser.close()
console.log('done')
