/**
 * Walks 5B's new-project birth (voice path), with speech recognition
 * stubbed so it runs headless: grid → tap the orb, "say" an intent → the
 * words become the project and the goo drops into its named conversation →
 * collapse → grid with the named planning card.
 */
import { chromium } from 'playwright-core'

const OUT = 'screens/project-grid'
const GOO = 2800

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 940 } })

// Stub the Web Speech API: one utterance, then a natural end.
await page.addInitScript(() => {
  class FakeRecognition {
    continuous = false
    interimResults = false
    lang = ''
    onresult = null
    onend = null
    onerror = null
    start() {
      setTimeout(() => {
        this.onresult?.({
          results: [[{ transcript: 'plan a bachelor party in Austin' }]],
        })
        setTimeout(() => this.onend?.(), 700)
      }, 900)
    }
    stop() {
      this.onend?.()
    }
  }
  window.SpeechRecognition = FakeRecognition
})

await page.goto('http://localhost:49488/#project-grid')
await page.waitForTimeout(1800)

const frame = page.locator('#app-viewport')

// Tap the orb — the fake utterance arrives while listening
await page.click('button[aria-label="Hold or tap to speak"]')
await page.waitForTimeout(1000)
await frame.screenshot({ path: `${OUT}/v1-listening.png` })

// Utterance ends → project born from the words → goo into its thread
await page.waitForTimeout(1200 + GOO)
await frame.screenshot({ path: `${OUT}/v2-named-draft.png` })

// Back pops to the grid with the named card
await page.click('button[aria-label="Collapse conversation"]')
await page.waitForTimeout(GOO)
await frame.screenshot({ path: `${OUT}/v3-grid-named-card.png` })

await browser.close()
console.log('done')
