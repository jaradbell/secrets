import { chromium } from 'playwright-core'

const run = async () => {
  const browser = await chromium.launch({
    executablePath:
      '/Users/jaradbell/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  })
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  await page.goto('http://localhost:49488/#projects-moodboard')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: 'scripts/shots/mood-pages-1-upcoming.png' })

  await page.getByRole('button', { name: 'Files' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'scripts/shots/mood-pages-2-files.png' })

  await browser.close()
}

run()
