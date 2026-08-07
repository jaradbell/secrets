/**
 * GooLoaderGooey — loader variant 5C, a faithful take on Alexis Doreau's
 * "Loader Gooey effect" (dribbble.com/shots/2150230), in our ink.
 *
 * Same two-anchor relay topology as 5B, but the peanut only turns a half
 * revolution — horizontal back to horizontal — before the lobe hands off,
 * and everything is jelly: lobes squash and stretch with their speed
 * (volume-preserving, tangential while spinning, along the lane while
 * crossing), so the form wobbles like liquid instead of rotating like a
 * rigid prop.
 *
 * Bare ink, goo filter, design-space rAF with direct style writes, static
 * cluster under prefers-reduced-motion.
 */
import { useEffect, useRef } from 'react'

const INK = '#141118'

/** Design-space canvas; rendered size scales it down. */
const CANVAS = 140
const CENTER = CANVAS / 2

/** The two anchors the relay plays between. */
const SPREAD = 32
/** Half the peanut's lobe separation (centroid to lobe center). Wide
    enough that the circles stay whole — they don't overlap; the goo neck
    bridges the small gap, keeping the peanut two readable circles with a
    concave waist instead of one swallowed lump. */
const H = 17.5

/** Radii: a docked host is fuller than a lone one. */
const HOST_DOCKED_R = 16
const HOST_ALONE_R = 13.5
const LOBE_R = 15

/** Full cycle: half-spin at A, hand off, half-spin at B, hand back. */
const PERIOD = 3000

/** Cycle fractions for each movement. */
const ROT_A_END = 0.32
const HANDOFF_END = 0.5
const ROT_B_END = 0.82

/** How hard the jelly stretches at peak speed. Spin stretch stays low so
    the docked circles keep their round shape through the turn; the free
    lobe can deform harder mid-flight. */
const SPIN_STRETCH = 0.09
const TRAVEL_STRETCH = 0.35
/** The departing lobe's hop over its old host, design-space px. */
const HOP = 14

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Eased 0..1 progress of t through [a, b]; clamped outside. */
function seg(t: number, a: number, b: number) {
  if (t <= a) return 0
  if (t >= b) return 1
  return easeInOut((t - a) / (b - a))
}

/** Raw 0..1 progress of t through [a, b]; clamped outside. */
function span(t: number, a: number, b: number) {
  return Math.min(Math.max((t - a) / (b - a), 0), 1)
}

type Circle = { x: number; y: number; r: number }

function setCircle(el: HTMLElement, c: Circle) {
  const r = Math.max(c.r, 0)
  el.style.left = `${c.x - r}px`
  el.style.top = `${c.y - r}px`
  el.style.width = `${r * 2}px`
  el.style.height = `${r * 2}px`
}

/** Volume-preserving squash: stretch by s along `angle`, thin by 1/s
    across it. s = 1 clears the transform. */
function setStretch(el: HTMLElement, angle: number, s: number) {
  el.style.transform =
    s === 1 ? '' : `rotate(${angle}rad) scale(${s}, ${1 / s}) rotate(${-angle}rad)`
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function GooLoaderGooey({ size = 64 }: { size?: number }) {
  const hostA = useRef<HTMLSpanElement>(null)
  const hostB = useRef<HTMLSpanElement>(null)
  const lobe = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const [a, b, m] = [hostA.current, hostB.current, lobe.current]
    if (!a || !b || !m) return

    const A = { x: CENTER - SPREAD, y: CENTER }
    const B = { x: CENTER + SPREAD, y: CENTER }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Static board: horizontal peanut at A, lone circle at B.
      setCircle(a, { x: A.x - H, y: A.y, r: HOST_DOCKED_R })
      setCircle(m, { x: A.x + H, y: A.y, r: LOBE_R })
      setCircle(b, { x: B.x, y: B.y, r: HOST_ALONE_R })
      return
    }

    let raf = 0
    const frame = (now: number) => {
      const u = (now % PERIOD) / PERIOD
      const send = seg(u, ROT_A_END, HANDOFF_END)
      const ret = seg(u, ROT_B_END, 1)

      let M: Circle
      let cA: Circle
      let cB: Circle
      // Jelly state: stretch axis + amount for the pair and the lobe.
      let mAngle = 0
      let mStretch = 1
      let hostAngle = 0
      let hostStretchA = 1
      let hostStretchB = 1

      if (u < ROT_A_END) {
        // Half revolution at A, sweeping up over the top: horizontal →
        // horizontal, lobes swapping sides. Jelly stretches tangentially,
        // hardest at mid-spin.
        const p = span(u, 0, ROT_A_END)
        const th = -Math.PI * easeInOut(p)
        const dx = Math.cos(th) * H
        const dy = Math.sin(th) * H
        M = { x: A.x + dx, y: A.y + dy, r: 0 }
        cA = { x: A.x - dx, y: A.y - dy, r: 0 }
        cB = { x: B.x, y: B.y, r: 0 }
        const v = Math.sin(Math.PI * p) // eased angular speed, 0→1→0
        mAngle = th + Math.PI / 2
        mStretch = 1 + SPIN_STRETCH * v
        hostAngle = th + Math.PI / 2
        hostStretchA = 1 + SPIN_STRETCH * v
      } else if (u < HANDOFF_END) {
        // The lobe leaves from A's far flank, hops over its host — liquid
        // rolling over liquid — then stretches down the lane; A recenters,
        // B leans away to receive it.
        M = {
          x: lerp(A.x - H, B.x - H, send),
          y: A.y - HOP * Math.sin(Math.PI * Math.min(send * 2, 1)),
          r: 0,
        }
        cA = { x: lerp(A.x + H, A.x, Math.min(1, send * 1.5)), y: A.y, r: 0 }
        cB = { x: lerp(B.x, B.x + H, send), y: B.y, r: 0 }
        mStretch = 1 + TRAVEL_STRETCH * Math.sin(Math.PI * send)
      } else if (u < ROT_B_END) {
        // Half revolution at B, same jelly.
        const p = span(u, HANDOFF_END, ROT_B_END)
        const th = Math.PI + Math.PI * easeInOut(p)
        const dx = Math.cos(th) * H
        const dy = Math.sin(th) * H
        M = { x: B.x + dx, y: B.y + dy, r: 0 }
        cB = { x: B.x - dx, y: B.y - dy, r: 0 }
        cA = { x: A.x, y: A.y, r: 0 }
        const v = Math.sin(Math.PI * p)
        mAngle = th + Math.PI / 2
        mStretch = 1 + SPIN_STRETCH * v
        hostAngle = th + Math.PI / 2
        hostStretchB = 1 + SPIN_STRETCH * v
      } else {
        // Hand back the same way — hop over B's host, then down the lane;
        // B recenters, A leans away to take it, landing on the next
        // cycle's start pose.
        M = {
          x: lerp(B.x + H, A.x + H, ret),
          y: B.y - HOP * Math.sin(Math.PI * Math.min(ret * 2, 1)),
          r: 0,
        }
        cB = { x: lerp(B.x - H, B.x, Math.min(1, ret * 1.5)), y: B.y, r: 0 }
        cA = { x: lerp(A.x, A.x - H, ret), y: A.y, r: 0 }
        mStretch = 1 + TRAVEL_STRETCH * Math.sin(Math.PI * ret)
      }

      // Mass follows the peanut; the traveling lobe slims mid-flight.
      const dockedA = 1 - send + ret
      const dockedB = send - ret
      cA.r = HOST_ALONE_R + (HOST_DOCKED_R - HOST_ALONE_R) * dockedA + 0.7 * Math.sin(now / 310)
      cB.r =
        HOST_ALONE_R + (HOST_DOCKED_R - HOST_ALONE_R) * dockedB + 0.7 * Math.sin(now / 270 + 2)
      M.r =
        LOBE_R -
        2.5 * Math.sin(Math.PI * send) -
        2.5 * Math.sin(Math.PI * ret) +
        0.7 * Math.sin(now / 290 + 4)

      setCircle(a, cA)
      setCircle(b, cB)
      setCircle(m, M)
      setStretch(m, mAngle, mStretch)
      setStretch(a, hostAngle, hostStretchA)
      setStretch(b, hostAngle, hostStretchB)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const scale = size / CANVAS

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Working"
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="goo-gooey">
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
        style={{ width: CANVAS, height: CANVAS, transform: `scale(${scale})` }}
      >
        <div className="absolute inset-0" style={{ filter: 'url(#goo-gooey)' }}>
          <span ref={hostA} className="absolute rounded-full" style={{ background: INK }} />
          <span ref={hostB} className="absolute rounded-full" style={{ background: INK }} />
          <span ref={lobe} className="absolute rounded-full" style={{ background: INK }} />
        </div>
      </div>
    </div>
  )
}
