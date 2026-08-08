import { chromium } from 'playwright-core'

const run = async () => {
  const browser = await chromium.launch({
    executablePath:
      '/Users/jaradbell/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  })
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 3,
  })
  await page.goto('http://localhost:49488/#projects-moodboard')
  await page.waitForTimeout(1600)
  const control = page.getByRole('button', { name: 'Assistant' }).locator('..')
  await control.screenshot({ path: 'scripts/shots/seg-zoom.png' })
  await browser.close()
}

run()
