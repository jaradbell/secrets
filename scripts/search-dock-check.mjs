import { chromium } from 'playwright-core'

const run = async () => {
  const browser = await chromium.launch({
    executablePath:
      '/Users/jaradbell/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  })
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  await page.goto('http://localhost:5179/#project-grid')
  await page.waitForTimeout(1600)
  await page.screenshot({ path: 'scripts/shots/search-1-rest.png' })

  // Tap the floating chip.
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'scripts/shots/search-2-open.png' })

  // Type "ky" on the fake keys — the grid should filter to Kyoto.
  await page.getByRole('button', { name: 'k', exact: true }).dispatchEvent('pointerdown')
  await page.waitForTimeout(150)
  await page.getByRole('button', { name: 'y', exact: true }).dispatchEvent('pointerdown')
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'scripts/shots/search-3-typed.png' })

  // Search key puts the keyboard down, keeps the filter on the chip.
  await page.getByRole('button', { name: 'Search', exact: true }).last().dispatchEvent('pointerdown')
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'scripts/shots/search-4-applied.png' })

  await browser.close()
}

run()
