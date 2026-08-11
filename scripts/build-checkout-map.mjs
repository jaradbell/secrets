/**
 * One-off: composes a real static map for the checkout screen from Carto
 * "voyager" basemap tiles (OpenStreetMap data), centered on Valette —
 * 344 Center St, Healdsburg. Output: public/places/valette-map.png.
 * Tiles are fetched in node, drawn onto a canvas in headless Chrome
 * (data URLs, so the canvas stays untainted), and saved as one PNG.
 */
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const LAT = 38.61055
const LON = -122.86925
const ZOOM = 17
const TILE = 512 // voyager @2x tiles
const OUT_W = 800
const OUT_H = 310

const world = TILE * 2 ** ZOOM
const cx = ((LON + 180) / 360) * world
const latRad = (LAT * Math.PI) / 180
const cy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * world

const x0 = Math.floor((cx - OUT_W / 2) / TILE)
const x1 = Math.floor((cx + OUT_W / 2) / TILE)
const y0 = Math.floor((cy - OUT_H / 2) / TILE)
const y1 = Math.floor((cy + OUT_H / 2) / TILE)

const tiles = []
for (let ty = y0; ty <= y1; ty++) {
  for (let tx = x0; tx <= x1; tx++) {
    const sub = 'abcd'[(tx + ty) % 4]
    const url = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${ZOOM}/${tx}/${ty}@2x.png`
    const res = await fetch(url, { headers: { 'User-Agent': 'secrets-prototype/1.0' } })
    if (!res.ok) throw new Error(`tile ${tx},${ty}: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    tiles.push({
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
      dx: tx * TILE - (cx - OUT_W / 2),
      dy: ty * TILE - (cy - OUT_H / 2),
    })
    console.log(`fetched ${tx},${ty}`)
  }
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
const png = await page.evaluate(
  async ({ tiles, w, h, tile }) => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    for (const t of tiles) {
      const img = new Image()
      img.src = t.dataUrl
      await img.decode()
      ctx.drawImage(img, t.dx, t.dy, tile, tile)
    }
    return canvas.toDataURL('image/png')
  },
  { tiles, w: OUT_W, h: OUT_H, tile: TILE },
)
await browser.close()

writeFileSync(
  'public/places/valette-map.png',
  Buffer.from(png.slice('data:image/png;base64,'.length), 'base64'),
)
console.log('wrote public/places/valette-map.png')
