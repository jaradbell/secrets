import { chromium } from 'playwright-core'

const run = async () => {
  const browser = await chromium.launch({
    executablePath:
      '/Users/jaradbell/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  })
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  await page.goto('http://localhost:49488/#projects-moodboard')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: 'scripts/shots/mood-1-assistant.png' })

  // To the board — catch the pop-on stagger mid-flight, then settled.
  await page.getByRole('button', { name: 'Board' }).click()
  await page.waitForTimeout(650)
  await page.screenshot({ path: 'scripts/shots/mood-2-board-entering.png' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'scripts/shots/mood-3-board.png' })

  // Back to the assistant — catch the unpin drop mid-fall.
  await page.getByRole('button', { name: 'Assistant' }).click()
  await page.waitForTimeout(260)
  await page.screenshot({ path: 'scripts/shots/mood-4-unpin.png' })
  await page.waitForTimeout(1400)
  await page.screenshot({ path: 'scripts/shots/mood-5-assistant-back.png' })

  await browser.close()
}

run()
