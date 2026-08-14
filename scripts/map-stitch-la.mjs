/**
 * Regenerates public/map/la.png — the stays map surface's basemap.
 * Same recipe as map-stitch.mjs, pointed at Los Angeles: Carto light @2x
 * tiles at z11 (the basin from Santa Monica to Downtown), stitched into
 * one 786×1704 portrait crop (2× the 393×852 frame) using the browser as
 * the compositor so no image library is needed.
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const Z = 11
const XS = [350, 351]
const YS = [816, 817, 818, 819]
const TILE = 512
const W = 786
const H = 1704
const LEFT = (XS.length * TILE - W) / 2
const TOP = (YS.length * TILE - H) / 2

const dir = mkdtempSync(join(tmpdir(), 'map-tiles-'))

await Promise.all(
  YS.flatMap((y) =>
    XS.map(async (x) => {
      const res = await fetch(`https://a.basemaps.cartocdn.com/light_all/${Z}/${x}/${y}@2x.png`)
      writeFileSync(join(dir, `t_${x}_${y}.png`), Buffer.from(await res.arrayBuffer()))
    }),
  ),
)

const imgs = YS.flatMap((y, r) =>
  XS.map(
    (x, c) =>
      `<img src="${pathToFileURL(join(dir, `t_${x}_${y}.png`)).href}" style="position:absolute;left:${c * TILE - LEFT}px;top:${r * TILE - TOP}px;width:${TILE}px;height:${TILE}px">`,
  ),
).join('')

const stage = join(dir, 'stage.html')
writeFileSync(
  stage,
  `<!doctype html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;position:relative">${imgs}</body>`,
)

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.goto(pathToFileURL(stage).href)
await page.waitForTimeout(800)
await page.screenshot({ path: 'public/map/la.png' })
await browser.close()
console.log('stitched → public/map/la.png')
