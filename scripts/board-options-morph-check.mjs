import { chromium } from 'playwright-core'

const run = async () => {
  const browser = await chromium.launch({
    executablePath:
      '/Users/jaradbell/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  })
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  await page.goto('http://localhost:49488/#project-grid-menu')
  await page.waitForTimeout(1600)

  // Into the board through its doorway (goo transition between).
  await page.getByRole('button', { name: 'Projects' }).click()
  await page.waitForTimeout(3200)

  // Open — catch the grow mid-morph, then settled.
  await page.getByRole('button', { name: /tap for options/ }).click()
  await page.waitForTimeout(90)
  await page.screenshot({ path: 'scripts/shots/opt-1-opening.png' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'scripts/shots/opt-2-open.png' })

  // Pick "Archived" — the panel shrinks back to the chip; catch it
  // mid-shrink (this was the ballooning-label frame) and settled.
  await page.getByRole('menuitemradio', { name: 'Archived' }).click().catch(async () => {
    await page.getByRole('button', { name: 'Archived' }).click()
  })
  await page.waitForTimeout(90)
  await page.screenshot({ path: 'scripts/shots/opt-3-closing.png' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'scripts/shots/opt-4-closed.png' })

  await browser.close()
}

run()
