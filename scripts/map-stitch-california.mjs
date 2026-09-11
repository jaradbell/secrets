/**
 * Regenerates public/map/california.png — the flight details view's
 * basemap framing the San Diego → San Francisco route. Esri World Light
 * Gray canvas (base + reference labels), z7, scaled 0.8, browser as the
 * compositor (same approach as map-stitch.mjs).
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const Z = 7
const XS = [19, 20, 21, 22]
const YS = [48, 49, 50, 51]
const TILE = 256
const SCALE = 0.8
const T = TILE * SCALE
const W = 786
const H = 580
// Crop framing both endpoints on the scaled canvas: SF ≈ (303, 301),
// SD ≈ (684, 754) — offsets keep margins around the route.
const LEFT = 100
const TOP = 236

const LAYERS = ['World_Light_Gray_Base', 'World_Light_Gray_Reference']

const dir = mkdtempSync(join(tmpdir(), 'map-tiles-'))

await Promise.all(
  LAYERS.flatMap((layer) =>
    YS.flatMap((y) =>
      XS.map(async (x) => {
        const res = await fetch(
          `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layer}/MapServer/tile/${Z}/${y}/${x}`,
        )
        writeFileSync(join(dir, `${layer}_${x}_${y}.png`), Buffer.from(await res.arrayBuffer()))
      }),
    ),
  ),
)

const imgs = LAYERS.flatMap((layer) =>
  YS.flatMap((y, r) =>
    XS.map(
      (x, c) =>
        `<img src="${pathToFileURL(join(dir, `${layer}_${x}_${y}.png`)).href}" style="position:absolute;left:${c * T - LEFT}px;top:${r * T - TOP}px;width:${T}px;height:${T}px">`,
    ),
  ),
).join('')

const stage = join(dir, 'stage.html')
writeFileSync(
  stage,
  `<!doctype html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;position:relative;background:#e8ecef">${imgs}</body>`,
)

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.goto(pathToFileURL(stage).href)
await page.waitForTimeout(800)
await page.screenshot({ path: 'public/map/california.png' })
await browser.close()
console.log('stitched → public/map/california.png')
