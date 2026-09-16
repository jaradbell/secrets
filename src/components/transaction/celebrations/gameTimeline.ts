/**
 * The game celebration's shared clock — every beat the receipt and the
 * ball scene play to, in seconds from the receipt's mount.
 *
 * The story: the dark surface fades in, the ball drops in and bounces to
 * rest, winds up into a spin while a line draws itself around it —
 * its tip an organic gradient bloom in the clubs' colors. The line
 * closing IS the confirmation: the ball scales out through a gaussian
 * blur as the check draws in where it was, the hero collapses, and the
 * copy develops beneath.
 */
export const GAME_T = {
  /** The dissolve hands off; the dark surface fades in. */
  surfaceDelay: 0.65,
  surface: 0.6,
  /** The ball drops in and bounces to rest. */
  drop: 0.7,
  dropDur: 1.1,
  /** The spin winds up, the orbit line drawing around the ball... */
  spin: 1.9,
  /** ...and closes: the ball flares, grows, and gaussian-blurs away. */
  beat: 3.3,
  fadeDur: 0.8,
  /** The check draws in once the flare has mostly cleared. */
  checkIn: 3.75,
  /** The copy develops beneath. The layout NEVER moves — the hero holds
      its resting height throughout and the ball act plays in an overflow
      layer aligned to the badge's permanent home — so the rows simply
      develop in place once the flare has passed. */
  textIn: 4.1,
} as const

export const GAME_EASE = [0.32, 0.72, 0, 1] as const

// ─── The choreography's closed-form motion math ──────────────────────────
// Pure functions of time — no accumulated state, deterministic at any t —
// shared by the ball driver (BallCelebration) and the glow shader clock
// (BallGlow).

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** The ball's on-screen radius (px) under the receipt's play camera — the
    conversion for anything riding the ball's motion in the DOM. */
export const BALL_PX_R = 72.5
export const prog = (t: number, at: number, dur: number) => clamp01((t - at) / dur)

/** Scene time shares the DOM clock (canvas clocks start late). */
export const sceneNow = (t0: number) => (performance.now() - t0) / 1000

/** Standard bounce easing — the drop's two rebounds live in here. */
export function bounceOut(p: number) {
  const n = 7.5625
  const d = 2.75
  if (p < 1 / d) return n * p * p
  if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75
  if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375
  return n * (p -= 2.625 / d) * p + 0.984375
}

// Spin: slow drift → wind-up → post-make decel → idle, one closed form.
const WIND = 190 // deg/s² (angle = WIND * dt²)
const OMEGA_PEAK = 2 * WIND * (GAME_T.beat - GAME_T.spin)
const DECEL_DUR = 0.9
const OMEGA_IDLE = 38
const DECEL = (OMEGA_PEAK - OMEGA_IDLE) / DECEL_DUR
const A1 = 14 * GAME_T.spin
const A2 = A1 + WIND * Math.pow(GAME_T.beat - GAME_T.spin, 2)
const A3 = A2 + OMEGA_PEAK * DECEL_DUR - (DECEL * DECEL_DUR * DECEL_DUR) / 2

/** The ball's spin angle (degrees) at time t. */
export function spinAngle(t: number) {
  if (t < GAME_T.spin) return 14 * t
  if (t < GAME_T.beat) return A1 + WIND * Math.pow(t - GAME_T.spin, 2)
  const dt = t - GAME_T.beat
  if (dt < DECEL_DUR) return A2 + OMEGA_PEAK * dt - (DECEL * dt * dt) / 2
  return A3 + OMEGA_IDLE * (dt - DECEL_DUR)
}

/** The ball's y in ball radii: the drop-in bounce, then dead still.
    The ball holds its ground while the line closes — the spin is the
    only wind-up, and the exit (the flare-out) is the release. */
export function ballY(t: number) {
  const T = GAME_T
  return 6.5 * (1 - bounceOut(prog(t, T.drop, T.dropDur)))
}

/** Squash on the drop's impacts (bounceOut's landing times). */
export function squash(t: number) {
  const T = GAME_T
  let s = 1
  for (const pi of [0.3636, 0.7273, 0.9091]) {
    const k = Math.abs(t - (T.drop + pi * T.dropDur))
    if (k < 0.09) s = Math.min(s, 1 - 0.08 * (1 - k / 0.09))
  }
  return s
}
