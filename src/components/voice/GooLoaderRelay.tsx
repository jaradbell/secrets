/**
 * GooLoaderRelay — loader variant 5B, from the two-form storyboards.
 *
 * Two anchor points hold the composition. A middle lobe is always merged
 * with one of them as a peanut; the pair spins exactly one revolution
 * about its own centroid — clockwise on the left, counterclockwise on
 * the right — landing back on the axis, where the lobe hands off across
 * the gap, goo neck stretching and snapping. A wound pendulum: spin,
 * pass, counter-spin, pass back. One continuous figure, no jump cuts.
 *
 * Same organic grammar as GooLoader — bare ink, goo filter, design-space
 * rAF with direct style writes, static cluster under reduced motion.
 */
import { useEffect, useRef } from 'react'

const INK = '#141118'

/** Design-space canvas; rendered size scales it down. */
const CANVAS = 140
const CENTER = CANVAS / 2

/** The two anchors the relay plays between. */
const SPREAD = 32
/** Half the peanut's lobe separation (centroid to lobe center). */
const H = 13

/** Radii: a docked host is fuller than a lone one — the peanut carries
    the mass, the waiting circle sits lighter (as in the boards). */
const HOST_DOCKED_R = 16
const HOST_ALONE_R = 13.5
const LOBE_R = 15

/** Full cycle: spin at A, hand off, counter-spin at B, hand back. */
const PERIOD = 3400

/** Each docked pair spins exactly one revolution, so it lands back on
    the axis, aimed at its partner. */
const SPIN = Math.PI * 2

/** Cycle fractions for each movement. */
const ROT_A_END = 0.35
const HANDOFF_END = 0.5
const ROT_B_END = 0.85

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Eased 0..1 progress of t through [a, b]; clamped outside. */
function seg(t: number, a: number, b: number) {
  if (t <= a) return 0
  if (t >= b) return 1
  return easeInOut((t - a) / (b - a))
}

type Circle = { x: number; y: number; r: number }

function setCircle(el: HTMLElement, c: Circle) {
  const r = Math.max(c.r, 0)
  el.style.left = `${c.x - r}px`
  el.style.top = `${c.y - r}px`
  el.style.width = `${r * 2}px`
  el.style.height = `${r * 2}px`
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function GooLoaderRelay({ size = 64 }: { size?: number }) {
  const hostA = useRef<HTMLSpanElement>(null)
  const hostB = useRef<HTMLSpanElement>(null)
  const lobe = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const [a, b, m] = [hostA.current, hostB.current, lobe.current]
    if (!a || !b || !m) return

    const A = { x: CENTER - SPREAD, y: CENTER }
    const B = { x: CENTER + SPREAD, y: CENTER }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Static board: diagonal peanut at A, lone circle at B.
      const th = -Math.PI / 4
      setCircle(a, { x: A.x - H * Math.cos(th), y: A.y - H * Math.sin(th), r: HOST_DOCKED_R })
      setCircle(m, { x: A.x + H * Math.cos(th), y: A.y + H * Math.sin(th), r: LOBE_R })
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

      if (u < ROT_A_END) {
        // Peanut at A spins one full clockwise revolution about its
        // centroid, landing back on the axis, aimed at B.
        const th = SPIN * seg(u, 0, ROT_A_END)
        const dx = Math.cos(th) * H
        const dy = Math.sin(th) * H
        M = { x: A.x + dx, y: A.y + dy, r: 0 }
        cA = { x: A.x - dx, y: A.y - dy, r: 0 }
        cB = { x: B.x, y: B.y, r: 0 }
      } else if (u < HANDOFF_END) {
        // The lobe crosses the gap; A recenters, B leans away to receive
        // it as the new peanut's far lobe.
        M = { x: lerp(A.x + H, B.x - H, send), y: A.y, r: 0 }
        cA = { x: lerp(A.x - H, A.x, Math.min(1, send * 1.5)), y: A.y, r: 0 }
        cB = { x: lerp(B.x, B.x + H, send), y: B.y, r: 0 }
      } else if (u < ROT_B_END) {
        // Peanut at B unwinds — one full counterclockwise revolution,
        // landing back on the axis, aimed home at A.
        const th = Math.PI - SPIN * seg(u, HANDOFF_END, ROT_B_END)
        const dx = Math.cos(th) * H
        const dy = Math.sin(th) * H
        M = { x: B.x + dx, y: B.y + dy, r: 0 }
        cB = { x: B.x - dx, y: B.y - dy, r: 0 }
        cA = { x: A.x, y: A.y, r: 0 }
      } else {
        // Hand back along the same lane; B recenters, A leans away to
        // take the lobe, landing exactly on the next cycle's start pose.
        M = { x: lerp(B.x - H, A.x + H, ret), y: A.y, r: 0 }
        cB = { x: lerp(B.x + H, B.x, Math.min(1, ret * 1.5)), y: B.y, r: 0 }
        cA = { x: lerp(A.x, A.x - H, ret), y: A.y, r: 0 }
      }

      // Mass follows the peanut: hosts fill out while docked, sit lighter
      // alone; the traveling lobe slims mid-flight like a thrown droplet.
      const dockedA = 1 - send + ret
      const dockedB = send - ret
      cA.r = HOST_ALONE_R + (HOST_DOCKED_R - HOST_ALONE_R) * dockedA + 0.7 * Math.sin(now / 310)
      cB.r =
        HOST_ALONE_R + (HOST_DOCKED_R - HOST_ALONE_R) * dockedB + 0.7 * Math.sin(now / 270 + 2)
      M.r =
        LOBE_R -
        3 * Math.sin(Math.PI * send) -
        3 * Math.sin(Math.PI * ret) +
        0.7 * Math.sin(now / 290 + 4)

      setCircle(a, cA)
      setCircle(b, cB)
      setCircle(m, M)
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
          <filter id="goo-relay">
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
        <div className="absolute inset-0" style={{ filter: 'url(#goo-relay)' }}>
          <span ref={hostA} className="absolute rounded-full" style={{ background: INK }} />
          <span ref={hostB} className="absolute rounded-full" style={{ background: INK }} />
          <span ref={lobe} className="absolute rounded-full" style={{ background: INK }} />
        </div>
      </div>
    </div>
  )
}
