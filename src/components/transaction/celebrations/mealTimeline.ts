/**
 * One clock for the restaurant celebration (2C's answer to
 * flightTimeline / stayTimeline / gameTimeline). The hero is a silver
 * cloche on a porcelain plate — Spline-rendered, app-choreographed,
 * the same pipeline as 8C's basketball.
 *
 * Seconds from mount:
 *
 *   0.65  surface fades in during the dock pill's dissolve
 *   0.95  the covered dish is SET: the cloche descends onto the plate,
 *         seats with a soft rebound and a little metallic rock
 *   ~2.0  at rest: a slow yaw sway keeps the chrome reflections alive
 *   3.30  the beat — service: the cloche lifts away, tipping slightly,
 *         and rises out of frame; the evening's light spills out from
 *         under it around the plate
 *   3.75  the check draws in over the plate
 *   4.10  "Reservation confirmed" and the rows develop beneath
 *
 * The hero's layout box never changes size — the whole act plays in
 * an absolutely-positioned overflow layer (8C's lesson, baked in).
 */
import { clamp01, prog } from './gameTimeline'

export const MEAL_T = {
  surfaceDelay: 0.65,
  surface: 0.6,
  /** The cloche descends and seats on the plate. */
  setIn: 0.95,
  setDur: 0.9,
  /** Service: the lift. Shares 8C's beat so RingGlow's clock lines up. */
  beat: 3.3,
  liftDur: 0.9,
  /** The check draws once the dome has cleared the plate. */
  checkIn: 3.75,
  textIn: 4.1,
} as const

export const MEAL_EASE = [0.32, 0.72, 0, 1] as const

export { clamp01, prog, sceneNow } from './gameTimeline'

// ─── The choreography's closed-form motion math ──────────────────────────
// World units are the Spline scene's; the driver adds these to the
// cloche's authored rest transform. Pure functions of t — deterministic.

/** How far above the plate the cloche starts, and how far the lift goes. */
const DROP_H = 150
const LIFT_H = 300

const easeOutQuint = (p: number) => 1 - Math.pow(1 - p, 5)

/** The cloche's y offset (world units) at time t. */
export function clocheY(t: number) {
  const T = MEAL_T
  // The set: descend decelerating, then one soft rebound as it seats.
  const p = prog(t, T.setIn, T.setDur)
  let y = DROP_H * (1 - easeOutQuint(p))
  y += 3.5 * Math.sin(Math.PI * clamp01((p - 0.78) / 0.22))
  // Service: the lift accelerates up and out of frame.
  const lp = prog(t, T.beat, T.liftDur)
  y += LIFT_H * Math.pow(lp, 1.6)
  return y
}

/** The seat's metallic settle — a decaying rock (degrees, about z). */
export function clocheRock(t: number) {
  const T = MEAL_T
  const land = T.setIn + T.setDur * 0.78
  const dt = t - land
  if (dt <= 0) return 0
  return 2.1 * Math.sin(10.5 * dt) * Math.exp(-3.6 * dt)
}

/** Idle yaw sway (degrees) — keeps the chrome's reflections traveling. */
export function clocheYaw(t: number) {
  return 5 * Math.sin(0.55 * t + 1.2)
}

/** The lift's tip and drift: [xOffset (units), zRotation (degrees)]. */
export function clocheLift(t: number): [number, number] {
  const lp = prog(t, MEAL_T.beat, MEAL_T.liftDur)
  const e = lp * lp * (3 - 2 * lp)
  return [18 * e, -9 * e]
}
