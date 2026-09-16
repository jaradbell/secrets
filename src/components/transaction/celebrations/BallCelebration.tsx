/**
 * The make — the sports celebration hero, staged as a LEAD-IN.
 *
 * The basketball renders through Spline's own runtime loading the scene
 * file locally (/models/ball.splinecode), so its material is EXACTLY
 * what the editor shows. The choreography is app-owned: the ball object
 * is driven per-frame against GAME_T.
 *
 * The act: the ball drops in and bounces to rest, winds into a spin
 * while a line draws itself around it — its head an organic gradient
 * bloom in the clubs' colors. The line closing is the release: the ball
 * scales out dramatically through a gaussian blur, and the circle STAYS,
 * becoming the badge — a filled disc inside the drawn line, the clubs'
 * mesh-gradient light leaking around its edge (the porthole's grammar,
 * RingGlow), and 2E's check drawing in at its center. The badge glides
 * to rest as the hero collapses and the copy develops beneath.
 *
 * Layers, back to front: Spline canvas (the ball, edge-masked; exits on
 * the beat) → the badge (glow, disc, orbit line, check — persists).
 */
import { Canvas, useFrame } from '@react-three/fiber'
import { Application } from '@splinetool/runtime'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  ballY,
  clamp01,
  GAME_EASE as EASE,
  GAME_T as T,
  sceneNow,
  spinAngle,
  squash,
} from './gameTimeline'
import { luminous, RingGlow } from './RingGlow'

/** The hero's px box — full for the act, collapsed once the ball exits. */
const W = 340
const H = 375
const H_END = 224

/** The ball's center in the box (measured under the dollied play camera). */
const BALL_CX = W / 2
const BALL_CY = 210

/** The badge: the drawn circle that outlives the ball. */
const LINE_R = 88
const LINE_C = 2 * Math.PI * LINE_R
const BADGE = 200
const BADGE_C = BADGE / 2
const TIP = 56

/** The Spline scene, served locally — no network, no stale snapshots. */
const BALL_SCENE = '/models/ball.splinecode'

/** The ball's world radius in the Spline scene's units. */
const SCENE_R = 18.5

type Clock0 = { t0: number }

// ── The Spline-rendered ball, driven frame by frame from here ────────────
function useSplineBall(t0: number, enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!enabled || !canvas) return
    const app = new Application(canvas)
    let raf = 0
    let disposed = false
    app
      .load(BALL_SCENE)
      .then(() => {
        if (disposed) return
        const ball = app.findObjectByName('Basketball')
        if (!ball) throw new Error('Basketball object missing from scene')
        // Dolly the play camera in — the runtime fits this narrow canvas
        // looser than the editor; the ball should carry the hero.
        const cam = app.findObjectByName('PlayCam')
        if (cam) cam.position.z = ball.position.z + 112
        const rest = {
          y: ball.position.y,
          sx: ball.scale.x,
          sy: ball.scale.y,
          sz: ball.scale.z,
        }
        const tick = () => {
          const t = sceneNow(t0)
          // The act is over once the exit completes — stop driving.
          if (t > T.beat + T.fadeDur + 0.2) return
          const sq = squash(t)
          ball.position.y = rest.y + ballY(t) * SCENE_R
          ball.scale.x = rest.sx * (2 - sq)
          ball.scale.y = rest.sy * sq
          ball.scale.z = rest.sz * (2 - sq)
          ball.rotation.y = (spinAngle(t) * Math.PI) / 180
          raf = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch((err) => {
        console.warn('BallCelebration: Spline scene failed to load', err)
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

// ── The stand-in ball (only if the Spline scene fails to load) ───────────
function pebbleTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#808080'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 2600; i++) {
    const a = Math.random()
    g.fillStyle = `rgba(${a > 0.5 ? 255 : 0},${a > 0.5 ? 255 : 0},${a > 0.5 ? 255 : 0},0.16)`
    g.beginPath()
    g.arc(Math.random() * 256, Math.random() * 256, 0.7 + Math.random() * 1.1, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 2)
  return tex
}

function StandInBall({ t0 }: Clock0) {
  const bump = useMemo(pebbleTexture, [])
  const group = useRef<THREE.Group>(null!)
  const spin = useRef<THREE.Group>(null!)
  useFrame(() => {
    const t = sceneNow(t0)
    const sq = squash(t)
    group.current.position.set(0, ballY(t), 0)
    group.current.scale.set(2 - sq, sq, 2 - sq)
    spin.current.rotation.y = (spinAngle(t) * Math.PI) / 180
  })
  return (
    <group ref={group}>
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial color="#26292f" roughness={0.62} bumpMap={bump} bumpScale={0.6} />
        </mesh>
        {[
          [Math.PI / 2, 0, 0],
          [0, 0, 0],
        ].map((r, i) => (
          <mesh key={i} rotation={r as [number, number, number]}>
            <torusGeometry args={[1.006, 0.024, 8, 96]} />
            <meshStandardMaterial color="#0d0f12" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ── The check: 2E's exact check, drawn at the badge's center ─────────────
function BigCheck({ at }: { at: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.svg
        width="96"
        height="96"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.3))' }}
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
    </div>
  )
}

// ── The badge: the drawn circle, its disc, the glow — the act's survivor ──
function Badge({ colors, t0, reduced }: { colors: string[]; t0: number; reduced: boolean }) {
  const circle = useRef<SVGCircleElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const [a, b, c] = useMemo(() => {
    const lum = luminous(colors)
    return [lum[0], lum[1 % lum.length], lum[2 % lum.length]]
  }, [colors])

  // The line draws around the ball as it spins, closing on the beat; the
  // comet at its head swells and lets go — the circle itself remains.
  useEffect(() => {
    if (reduced) return
    let raf = 0
    const tick = () => {
      const ci = circle.current
      const ti = tip.current
      if (!ci || !ti) return
      const t = sceneNow(t0)
      if (t > T.beat + 0.5) {
        ci.style.strokeDashoffset = '0'
        ti.style.opacity = '0'
        return
      }
      // Draw progress accelerates with the windup, closing on the beat.
      const raw = clamp01((t - T.spin) / (T.beat - T.spin))
      const p = raw * raw
      ci.style.strokeDashoffset = String(LINE_C * (1 - p))
      // The comet at the head of the line (12 o'clock start, clockwise).
      const ang = (-90 + 360 * p) * (Math.PI / 180)
      const x = BADGE_C + LINE_R * Math.cos(ang)
      const y = BADGE_C + LINE_R * Math.sin(ang)
      const done = clamp01((t - T.beat) / 0.4)
      ti.style.opacity = String((raw > 0 ? 1 : 0) * (1 - done))
      ti.style.transform = `translate(${x - TIP / 2}px, ${y - TIP / 2}px) scale(${1 + done * 1.3})`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [t0, reduced])

  // The disc waits a breath past the beat, so the ball's flare-out
  // reads on a clean field before the badge fills in beneath it.
  const discIn = reduced
    ? { opacity: 1 }
    : { opacity: 1, transition: { delay: T.beat + 0.3, duration: 0.45, ease: 'easeOut' as const } }

  return (
    <div className="absolute inset-0">
      {/* The clubs' light, leaking around the disc — 2E's mesh motif. */}
      {!reduced && <RingGlow colors={colors} t0={t0} />}

      {/* The filled disc the check sits on, developing as the ball goes. */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: BADGE_C - LINE_R,
          top: BADGE_C - LINE_R,
          width: LINE_R * 2,
          height: LINE_R * 2,
          background: 'radial-gradient(circle at 50% 38%, #262230 0%, #17151d 78%)',
        }}
        initial={{ opacity: reduced ? 1 : 0 }}
        animate={discIn}
      />

      {/* The orbit line — drawn during the windup, kept as the frame. */}
      <svg
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${BADGE} ${BADGE}`}
        fill="none"
        aria-hidden
      >
        <circle
          ref={circle}
          cx={BADGE_C}
          cy={BADGE_C}
          r={LINE_R}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={LINE_C}
          strokeDashoffset={reduced ? 0 : LINE_C}
          transform={`rotate(-90 ${BADGE_C} ${BADGE_C})`}
        />
      </svg>

      {/* The head of the line: an organic gradient bloom, always light. */}
      {!reduced && (
        <div
          ref={tip}
          className="absolute left-0 top-0"
          style={{
            width: TIP,
            height: TIP,
            opacity: 0,
            background: [
              `radial-gradient(circle at 38% 40%, ${a}cc 0%, transparent 55%)`,
              `radial-gradient(circle at 64% 52%, ${b}b8 0%, transparent 58%)`,
              `radial-gradient(circle at 48% 68%, ${c}a8 0%, transparent 60%)`,
            ].join(', '),
            filter: 'blur(11px)',
            mixBlendMode: 'screen',
          }}
        />
      )}

      <BigCheck at={reduced ? 0 : T.checkIn} />
    </div>
  )
}

// ── The hero ─────────────────────────────────────────────────────────────
export function BallCelebration({ glowColors }: { glowColors: string[] }) {
  const reduced = useReducedMotion() ?? false
  const t0 = useMemo(() => performance.now(), [])
  const { canvasRef, failed } = useSplineBall(t0, !reduced)

  // Reduced motion: the resting badge, no act.
  if (reduced) {
    return (
      <div className="relative shrink-0" style={{ width: W, height: H_END }}>
        <div
          className="absolute"
          style={{
            left: BALL_CX - BADGE_C,
            top: H_END / 2 - BADGE_C,
            width: BADGE,
            height: BADGE,
          }}
        >
          <Badge colors={glowColors} t0={t0} reduced />
        </div>
      </div>
    )
  }

  // The hero's layout box holds its RESTING height from frame one — the
  // ball act plays in an overflow layer offset so the ball's rest center
  // coincides exactly with the badge's permanent center. Nothing in the
  // receipt's layout ever moves; the act happens, the layout was always
  // already true.
  const actTop = H_END / 2 - BALL_CY

  return (
    <div className="relative shrink-0" style={{ width: W, height: H_END }}>
      {/* The 3D act. The orbit line closing is the release: the ball
          FLARES and scales out through a gaussian blur — growth lands
          early (expo-out) while still opaque, brightness lifts it off
          the dark wall, and only then does it dissolve. */}
      <motion.div
        className="pointer-events-none absolute left-0"
        style={{ width: W, height: H, top: actTop, transformOrigin: `50% ${BALL_CY}px` }}
        initial={{ opacity: 1, filter: 'blur(0px) brightness(1)', scale: 1 }}
        animate={{
          opacity: [1, 1, 0],
          filter: [
            'blur(0px) brightness(1)',
            'blur(14px) brightness(2.2)',
            'blur(40px) brightness(3)',
          ],
          scale: 2.6,
          transition: {
            delay: T.beat,
            duration: T.fadeDur,
            scale: { delay: T.beat, duration: T.fadeDur, ease: [0.16, 1, 0.3, 1] },
            opacity: { delay: T.beat, duration: T.fadeDur, times: [0, 0.4, 1], ease: 'easeIn' },
            filter: { delay: T.beat, duration: T.fadeDur, times: [0, 0.5, 1], ease: 'easeOut' },
          },
        }}
      >
        {/* The ball — Spline's renderer, the editor's exact materials. */}
        <div
          className="absolute inset-0"
          style={{
            maskImage: 'radial-gradient(130% 130% at 50% 56%, black 58%, transparent 96%)',
            WebkitMaskImage: 'radial-gradient(130% 130% at 50% 56%, black 58%, transparent 96%)',
            display: failed ? 'none' : undefined,
          }}
        >
          <canvas ref={canvasRef} className="size-full" />
        </div>

        {/* The stand-in ball, only if the Spline scene failed to load. */}
        {failed && (
          <Canvas
            className="pointer-events-none absolute inset-0"
            camera={{ position: [0, 0.55, 7.2], fov: 40 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1.5, 2]}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[-3, 4.5, 5.5]} intensity={2.4} color="#cdd6ff" />
            <pointLight position={[1.8, 3.2, -3.5]} intensity={26} color="#6f8fff" />
            <StandInBall t0={t0} />
          </Canvas>
        )}
      </motion.div>

      {/* The badge: drawn around the ball IN its permanent home — the
          act's survivor never has to move. */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: BALL_CX - BADGE_C,
          top: H_END / 2 - BADGE_C,
          width: BADGE,
          height: BADGE,
        }}
      >
        <Badge colors={glowColors} t0={t0} reduced={false} />
      </div>
    </div>
  )
}
