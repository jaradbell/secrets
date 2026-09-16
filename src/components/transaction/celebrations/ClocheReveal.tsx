/**
 * Service — the restaurant celebration hero, staged as a LEAD-IN.
 *
 * The silver cloche and its porcelain plate render through Spline's own
 * runtime loading the scene file locally (/models/cloche.splinecode),
 * so the chrome is EXACTLY what the editor shows. The choreography is
 * app-owned: the cloche group is driven per-frame against MEAL_T.
 *
 * The act: the covered dish is SET — the cloche descends onto the
 * plate, seats with a soft rebound and a little metallic rock, then
 * rests, its reflections traveling with a slow sway. On the beat it is
 * SERVED: the dome lifts away, tipping slightly, and rises out of
 * frame — the evening's light spills out around the plate (the
 * porthole's mesh-gradient grammar, RingGlow, squashed to the plate's
 * ellipse) and 2E's check draws in over the dish. The plate stays.
 *
 * Layers, back to front: Spline canvas (plate + cloche, edge-masked;
 * the plate persists) → the spilled light → the check.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Application } from '@splinetool/runtime'
import {
  clocheLift,
  clocheRock,
  clocheY,
  clocheYaw,
  MEAL_EASE as EASE,
  MEAL_T as T,
  sceneNow,
} from './mealTimeline'
import { luminous, RingGlow } from './RingGlow'

/** The hero's px box — the act plays in an overflow layer within it. */
const W = 340
const H_END = 230

/** The act canvas and the plate's center within it (measured under the
    dollied play camera). */
const ACT_H = 340
const PLATE_CY = 220

/** The plate's permanent center in the hero box. */
const PLATE_REST_CY = 150

/** The Spline scene, served locally — no network, no stale snapshots. */
const CLOCHE_SCENE = '/models/cloche.splinecode'

const DEG = Math.PI / 180

/** The evening's palette — candle amber, wine rose, dusk plum. */
export const MEAL_GLOW = ['#e8a05c', '#d95f80', '#8b5fd6']

// ── The Spline-rendered dish, driven frame by frame from here ────────────
function useSplineCloche(t0: number, enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!enabled || !canvas) return
    const app = new Application(canvas)
    let raf = 0
    let disposed = false
    app
      .load(CLOCHE_SCENE)
      .then(() => {
        if (disposed) return
        const cloche = app.findObjectByName('Cloche')
        if (!cloche) throw new Error('Cloche object missing from scene')
        // Dolly the play camera in — the runtime fits this narrow canvas
        // looser than the editor; the dish should carry the hero.
        const cam = app.findObjectByName('PlayCam')
        if (cam) cam.position.z = 268
        const rest = { x: cloche.position.x, y: cloche.position.y }
        const tick = () => {
          const t = sceneNow(t0)
          // The act is over once the lift has cleared — stop driving.
          if (t > T.beat + T.liftDur + 0.3) return
          const [liftX, liftRotZ] = clocheLift(t)
          cloche.position.y = rest.y + clocheY(t)
          cloche.position.x = rest.x + liftX
          cloche.rotation.y = clocheYaw(t) * DEG
          cloche.rotation.z = (clocheRock(t) + liftRotZ) * DEG
          raf = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch((err) => {
        console.warn('ClocheReveal: Spline scene failed to load', err)
        if (!disposed) setFailed(true)
      })
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      app.dispose()
    }
  }, [t0, enabled])
  return { canvasRef, failed }
}

// ── The check: 2E's exact check, hovering over the served plate ──────────
function ServedCheck({ at }: { at: number }) {
  return (
    <motion.svg
      width="84"
      height="84"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        left: W / 2 - 42,
        top: PLATE_REST_CY - 44 - 42,
        filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.3))',
      }}
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: at, duration: 0.55, ease: EASE }}
    >
      <motion.path
        d="M5 12.5 10 17.5 19 7"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: at + 0.05, duration: 0.6, ease: EASE }}
      />
    </motion.svg>
  )
}

// ── The stand-in badge (reduced motion, or the scene failing to load) ────
function StandInBadge({ t0, immediate }: { t0: number; immediate: boolean }) {
  const [a, b, c] = useMemo(() => {
    const lum = luminous(MEAL_GLOW)
    return [lum[0], lum[1 % lum.length], lum[2 % lum.length]]
  }, [])
  const discIn = immediate
    ? { opacity: 1 }
    : { opacity: 1, transition: { delay: T.setIn, duration: 0.6, ease: 'easeOut' as const } }
  return (
    <div className="absolute inset-0">
      <div
        className="pointer-events-none absolute"
        style={{ left: W / 2, top: PLATE_REST_CY - 20, width: 0, height: 0 }}
      >
        {!immediate && <RingGlow colors={MEAL_GLOW} t0={t0} at={T.beat + 0.2} />}
      </div>
      <motion.div
        className="absolute rounded-full"
        style={{
          left: W / 2 - 88,
          top: PLATE_REST_CY - 20 - 88,
          width: 176,
          height: 176,
          background: 'radial-gradient(circle at 50% 38%, #262230 0%, #17151d 78%)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: `0 0 60px ${a}30, 0 0 100px ${b}22, inset 0 0 40px ${c}14`,
        }}
        initial={{ opacity: immediate ? 1 : 0 }}
        animate={discIn}
      />
      <motion.svg
        width="84"
        height="84"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ left: W / 2 - 42, top: PLATE_REST_CY - 20 - 42 }}
        initial={{ opacity: immediate ? 1 : 0 }}
        animate={{
          opacity: 1,
          transition: immediate ? { duration: 0 } : { delay: T.checkIn, duration: 0.5 },
        }}
      >
        <motion.path
          d="M5 12.5 10 17.5 19 7"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: immediate ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={immediate ? { duration: 0 } : { delay: T.checkIn, duration: 0.6, ease: EASE }}
        />
      </motion.svg>
    </div>
  )
}

// ── The hero ─────────────────────────────────────────────────────────────
export function ClocheReveal() {
  const reduced = useReducedMotion() ?? false
  const t0 = useMemo(() => performance.now(), [])
  const { canvasRef, failed } = useSplineCloche(t0, !reduced)

  if (reduced || failed) {
    return (
      <div className="relative shrink-0" style={{ width: W, height: H_END }}>
        <StandInBadge t0={t0} immediate={reduced} />
      </div>
    )
  }

  // The hero's layout box holds its resting height from frame one — the
  // act plays in an overflow layer offset so the plate's canvas position
  // coincides exactly with its permanent home. Nothing ever shifts.
  const actTop = PLATE_REST_CY - PLATE_CY

  return (
    <div className="relative shrink-0" style={{ width: W, height: H_END }}>
      {/* The dish — Spline's renderer, the editor's exact chrome. The
          canvas persists: the plate IS the resting hero. */}
      <motion.div
        className="pointer-events-none absolute left-0"
        style={{
          width: W,
          height: ACT_H,
          top: actTop,
          maskImage: 'radial-gradient(120% 120% at 50% 60%, black 55%, transparent 92%)',
          WebkitMaskImage: 'radial-gradient(120% 120% at 50% 60%, black 55%, transparent 92%)',
        }}
        initial={{ opacity: 0, filter: 'blur(12px)' }}
        animate={{
          opacity: 1,
          filter: 'blur(0px)',
          transition: { delay: T.surfaceDelay + 0.15, duration: 0.6, ease: EASE },
        }}
      >
        <canvas ref={canvasRef} className="size-full" />
      </motion.div>

      {/* The light that spills out as the dome lifts — the porthole's
          mesh grammar, squashed to hug the plate's ellipse. */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: W / 2,
          top: PLATE_REST_CY + 6,
          width: 0,
          height: 0,
          transform: 'scale(1.3, 0.5)',
        }}
      >
        <RingGlow colors={MEAL_GLOW} t0={t0} at={T.beat + 0.2} />
      </div>

      <ServedCheck at={T.checkIn} />
    </div>
  )
}
