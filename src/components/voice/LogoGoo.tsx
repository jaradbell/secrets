/**
 * LogoGoo — the animated liquid logo cluster for the empty state.
 *
 * Geometry is traced from the metaball reference (big circle d80 at (65,40),
 * companion d58 near (101,102), isolated d58 at (29,105) on a 132x134 canvas),
 * then CSS-scaled to a compact footprint. The whole form periodically
 * "liquid transforms": the companion blob is absorbed into the big one, the
 * form breathes, and the companion re-buds carrying the next app logo from
 * the pool. The isolated disc and the big blob swap their logos with gentle
 * shrink/crossfade pulses at other points in the cycle.
 *
 * Animation runs in design-space via refs + direct style writes (no React
 * re-render per frame). Honors prefers-reduced-motion by holding the home
 * layout with static logos.
 */
import { useEffect, useRef } from 'react'

const INK = '#141118'

/** Design-space canvas (traced from the reference). */
const CANVAS_W = 132
const CANVAS_H = 134

/** Rendered footprint scale — "a little bigger than 48": ~66px. */
const SCALE = 0.5

/** Rotating pool of connectable-app logos (white SVGs in /public/logos). */
const LOGO_POOL = ['uber', 'yelp', 'expedia', 'airbnb', 'doordash', 'lyft']

/** Home layout, traced from the reference. */
const HOME = {
  A: { x: 65, y: 40, r: 40 }, // big
  B: { x: 101, y: 102, r: 29 }, // companion (goo-connected to A)
  C: { x: 29, y: 102, r: 29 }, // isolated disc — bottom-aligned with B
}

/** Cycle length in ms. Slightly under 11s — a touch snappier without rushing. */
const CYCLE = 9000

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Eased 0..1 progress of t through [a, b]; clamped outside. */
function seg(t: number, a: number, b: number) {
  if (t <= a) return 0
  if (t >= b) return 1
  return easeInOut((t - a) / (b - a))
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

type Circle = { x: number; y: number; r: number }

/** Position a circle span in design space. */
function setCircle(el: HTMLElement, c: Circle) {
  el.style.left = `${c.x - c.r}px`
  el.style.top = `${c.y - c.r}px`
  el.style.width = `${c.r * 2}px`
  el.style.height = `${c.r * 2}px`
}

/** Position a logo img centered on (x, y) at the given width. */
function setLogo(el: HTMLElement, x: number, y: number, w: number, opacity: number) {
  el.style.left = `${x - w / 2}px`
  el.style.top = `${y - w / 2}px`
  el.style.width = `${w}px`
  el.style.height = `${w}px`
  el.style.opacity = `${opacity}`
}

export function LogoGoo() {
  const bA = useRef<HTMLSpanElement>(null)
  const bB = useRef<HTMLSpanElement>(null)
  const bC = useRef<HTMLSpanElement>(null)
  const lA = useRef<HTMLImageElement>(null)
  const lB = useRef<HTMLImageElement>(null)
  const lC = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const els = [bA, bB, bC, lA, lB, lC].map((r) => r.current)
    if (els.some((e) => !e)) return
    const [cA, cB, cC, imA, imB, imC] = els as HTMLElement[]

    // Current logo assignment per slot, rotated as the cycle swaps them.
    const slots = { A: 0, B: 1, C: 2 }
    let nextLogo = 3
    const src = (i: number) => `/logos/${LOGO_POOL[i % LOGO_POOL.length]}.svg`
    ;(imA as HTMLImageElement).src = src(slots.A)
    ;(imB as HTMLImageElement).src = src(slots.B)
    ;(imC as HTMLImageElement).src = src(slots.C)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const drawStatic = () => {
      setCircle(cA, HOME.A)
      setCircle(cB, HOME.B)
      setCircle(cC, HOME.C)
      setLogo(imA, HOME.A.x, HOME.A.y, HOME.A.r * 0.92, 1)
      setLogo(imB, HOME.B.x, HOME.B.y, HOME.B.r * 0.92, 1)
      setLogo(imC, HOME.C.x, HOME.C.y, HOME.C.r * 0.92, 1)
    }

    if (reduced) {
      drawStatic()
      return
    }

    // Tracks whether this cycle's swaps already happened.
    let swapped = { B: false, C: false, A: false }
    let lastT = 0
    let raf = 0
    const t0 = performance.now()

    const frame = (now: number) => {
      const t = ((now - t0) % CYCLE) / CYCLE
      if (t < lastT) swapped = { B: false, C: false, A: false } // new cycle
      lastT = t

      // ---- Blob A (big): breathes while absorbing / re-budding. ----
      const aGrow = seg(t, 0.18, 0.32) - seg(t, 0.46, 0.62)
      const A: Circle = {
        x: HOME.A.x,
        y: HOME.A.y,
        r: HOME.A.r + 5 * aGrow + 1.2 * Math.sin(t * Math.PI * 4),
      }

      // ---- Blob B (companion): absorbed into A, re-buds with next logo. ----
      const sink = seg(t, 0.18, 0.34) // travel into A
      const bud = seg(t, 0.46, 0.64) // travel back out
      let B: Circle
      if (t < 0.34) {
        B = {
          x: lerp(HOME.B.x, A.x + 6, sink),
          y: lerp(HOME.B.y, A.y + 10, sink),
          r: lerp(HOME.B.r, 2, sink),
        }
      } else if (t < 0.46) {
        B = { x: A.x + 6, y: A.y + 10, r: 2 } // dormant inside A
      } else {
        B = {
          x: lerp(A.x + 6, HOME.B.x, bud),
          y: lerp(A.y + 10, HOME.B.y, bud),
          r: lerp(2, HOME.B.r, bud),
        }
      }
      // Swap B's logo while it is hidden inside A.
      if (t > 0.36 && !swapped.B) {
        slots.B = nextLogo++
        ;(imB as HTMLImageElement).src = src(slots.B)
        swapped.B = true
      }
      const bLogoOp = 1 - seg(t, 0.18, 0.27) + seg(t, 0.55, 0.66)

      // ---- Blob C (isolated): pulse-shrinks to swap its logo. ----
      const cPulse = seg(t, 0.34, 0.4) - seg(t, 0.42, 0.5)
      const C: Circle = { x: HOME.C.x, y: HOME.C.y, r: HOME.C.r - 8 * cPulse }
      if (t > 0.4 && !swapped.C) {
        slots.C = nextLogo++
        ;(imC as HTMLImageElement).src = src(slots.C)
        swapped.C = true
      }
      const cLogoOp = 1 - seg(t, 0.34, 0.39) + seg(t, 0.43, 0.5)

      // ---- Blob A logo: gentle crossfade swap late in the cycle. ----
      if (t > 0.86 && !swapped.A) {
        slots.A = nextLogo++
        ;(imA as HTMLImageElement).src = src(slots.A)
        swapped.A = true
      }
      const aLogoOp = 1 - seg(t, 0.8, 0.86) + seg(t, 0.87, 0.94)

      setCircle(cA, A)
      setCircle(cB, B)
      setCircle(cC, C)
      setLogo(imA, A.x, A.y, HOME.A.r * 0.92, aLogoOp)
      setLogo(imB, B.x, B.y, Math.min(B.r * 2, HOME.B.r * 0.92), bLogoOp)
      setLogo(imC, C.x, C.y, HOME.C.r * 0.92, cLogoOp)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const logoCls = 'absolute select-none'
  const blobCls = 'absolute rounded-full'

  return (
    <div
      className="relative"
      style={{ width: CANVAS_W * SCALE, height: CANVAS_H * SCALE }}
      aria-label="Connectable apps"
      role="img"
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="logo-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7.5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${SCALE})` }}
      >
        {/* Goo layer: big + companion merge through the liquid neck. */}
        <div className="absolute inset-0" style={{ filter: 'url(#logo-goo)' }}>
          <span ref={bA} className={blobCls} style={{ background: INK }} />
          <span ref={bB} className={blobCls} style={{ background: INK }} />
        </div>
        {/* Isolated disc — outside the goo layer so no neck forms. */}
        <span ref={bC} className={blobCls} style={{ background: INK }} />

        {/* Logos ride on top, centered on their blobs. */}
        <img ref={lA} alt="" draggable={false} className={logoCls} />
        <img ref={lB} alt="" draggable={false} className={logoCls} />
        <img ref={lC} alt="" draggable={false} className={logoCls} />
      </div>
    </div>
  )
}
