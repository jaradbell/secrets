/**
 * GooLoader — LogoGoo's liquid grammar turned into a loading indicator.
 *
 * A center ink blob holds the middle while two satellites (one big, one
 * small) take turns budding out through the goo neck and being
 * reabsorbed. Each bud leaves at a new angle (golden-angle steps,
 * satellites half a beat apart) and travels on a slight arc rather than
 * a straight line.
 *
 * The loader has a full life: it is born on mount (the ink swells up from
 * nothing with a liquid overshoot, then the buds start beating) and dies
 * on `exiting` (buds snap home, the core swells a breath and collapses to
 * a point; `onExited` fires once it's gone). Built as the pause between
 * screens — the wait while a thread's messages load.
 *
 * No logos — bare ink, built for the beat between asking and getting an
 * answer.
 *
 * Animation runs in design-space via refs + direct style writes (no React
 * re-render per frame), same as LogoGoo. Honors prefers-reduced-motion by
 * holding a static cluster (and dying instantly).
 */
import { useEffect, useRef } from 'react'

const INK = '#141118'

/** Design-space canvas; rendered size scales it down. */
const CANVAS = 140
const CENTER = CANVAS / 2

/** Center blob and satellite geometry — the two buds are deliberately
    unequal so the rhythm reads hand-made rather than mechanical. */
const CORE_R = 26
const SAT_RS = [14, 11]
/** How far a bud travels — slight separation at apex, goo bridges it. */
const REACH = 44
/** Sideways arc on the bud's path, radians at mid-flight. */
const CURL = 0.45

/** One bud pulse per satellite, ms. Two satellites run half a beat
    apart, so the form moves roughly every half period. */
const PERIOD = 1100

/** Golden angle — successive buds land all around the core without
    repeating for a long while. */
const GOLDEN = 137.508

/** Birth: the core swells from nothing with a liquid overshoot; buds hold
    inside until the form has landed. Death: buds retract first, the core
    takes a last breath and collapses. */
const BIRTH_MS = 640
const DEATH_MS = 520

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Overshooting ease for the birth — the ink lands a touch too big and
    settles, which reads as liquid rather than a scale-in. */
function backOut(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Eased 0..1 progress of t through [a, b]; clamped outside. */
function seg(t: number, a: number, b: number) {
  if (t <= a) return 0
  if (t >= b) return 1
  return easeInOut((t - a) / (b - a))
}

type Circle = { x: number; y: number; r: number }

function setCircle(el: HTMLElement, c: Circle) {
  el.style.left = `${c.x - c.r}px`
  el.style.top = `${c.y - c.r}px`
  el.style.width = `${c.r * 2}px`
  el.style.height = `${c.r * 2}px`
}

/** A satellite's beat state at absolute time `now`, phase-shifted per
    index. */
function satellite(now: number, index: number): { out: number; angle: number } {
  const phase = now / PERIOD + index * 0.5
  const pulse = Math.floor(phase)
  const u = phase - pulse
  // Out-and-back within one pulse; 0 at both ends, so the bud angle can
  // jump while the satellite hides inside the core. The path arcs
  // sideways at mid-flight — a curl, not a piston stroke.
  const out = seg(u, 0.02, 0.42) - seg(u, 0.56, 0.98)
  const angle =
    ((pulse * GOLDEN + index * 180) * Math.PI) / 180 + CURL * Math.sin(u * Math.PI)
  return { out, angle }
}

export function GooLoader({
  size = 64,
  exiting = false,
  onExited,
}: {
  size?: number
  /** Flip true to play the death — buds retract, core collapses. */
  exiting?: boolean
  /** Fires once, after the death finishes (immediately under
      prefers-reduced-motion). */
  onExited?: () => void
}) {
  const core = useRef<HTMLSpanElement>(null)
  const satA = useRef<HTMLSpanElement>(null)
  const satB = useRef<HTMLSpanElement>(null)
  // Read per-frame inside the loop without re-running the effect.
  const exitingRef = useRef(exiting)
  exitingRef.current = exiting
  const onExitedRef = useRef(onExited)
  onExitedRef.current = onExited

  useEffect(() => {
    const ink = [core.current, satA.current, satB.current]
    if (ink.some((el) => !el)) return

    const place = (i: number, c: Circle) => {
      setCircle(ink[i]!, { ...c, r: Math.max(c.r, 0) })
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Static cluster: core with two resting buds.
      place(0, { x: CENTER, y: CENTER, r: CORE_R })
      place(1, { x: CENTER + REACH * 0.7, y: CENTER - 10, r: SAT_RS[0] })
      place(2, { x: CENTER - REACH * 0.55, y: CENTER + 18, r: SAT_RS[1] })
      // The death is handled by the reduced-motion effect below.
      return
    }

    let raf = 0
    let born = 0
    let died = 0
    const frame = (now: number) => {
      if (!born) born = now
      if (exitingRef.current && !died) died = now
      // Life envelope: overshooting swell from nothing, and — once exiting —
      // a last breath (slight swell) into a collapse.
      const birth = backOut(Math.min((now - born) / BIRTH_MS, 1))
      const death = died ? Math.min((now - died) / DEATH_MS, 1) : 0
      const env =
        birth * (1 + 0.14 * Math.sin(death * Math.PI)) * (1 - death * death * death)
      // Buds wait for the form to land, and are pulled home early in death
      // so the collapse reads as one mass, not three.
      const budGate =
        seg(Math.min((now - born) / BIRTH_MS, 1), 0.55, 1) * (1 - seg(death, 0, 0.45))

      const A = satellite(now, 0)
      const B = satellite(now, 1)
      const outA = A.out * budGate
      const outB = B.out * budGate
      // The core holds the center — it gives up a little radius while
      // buds are out and keeps a faint breath so it never reads frozen.
      place(0, {
        x: CENTER,
        y: CENTER,
        r: (CORE_R + 1.2 * Math.sin(now / 260) - 3 * ((outA + outB) / 2)) * env,
      })
      place(1, {
        x: CENTER + Math.cos(A.angle) * REACH * outA,
        y: CENTER + Math.sin(A.angle) * REACH * outA,
        r: (2 + (SAT_RS[0] - 2) * outA) * env * budGate,
      })
      place(2, {
        x: CENTER + Math.cos(B.angle) * REACH * outB,
        y: CENTER + Math.sin(B.angle) * REACH * outB,
        r: (2 + (SAT_RS[1] - 2) * outB) * env * budGate,
      })
      if (death >= 1) {
        onExitedRef.current?.()
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Under prefers-reduced-motion there is no loop to notice the flag, so
  // the death resolves instantly.
  useEffect(() => {
    if (!exiting) return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = [core.current, satA.current, satB.current]
    els.forEach((el) => el && (el.style.width = '0px'))
    onExitedRef.current?.()
  }, [exiting])

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
          <filter id="goo-loader">
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
        <div className="absolute inset-0" style={{ filter: 'url(#goo-loader)' }}>
          <span ref={core} className="absolute rounded-full" style={{ background: INK }} />
          <span ref={satA} className="absolute rounded-full" style={{ background: INK }} />
          <span ref={satB} className="absolute rounded-full" style={{ background: INK }} />
        </div>
      </div>
    </div>
  )
}
