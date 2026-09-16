/**
 * One clock for 8B's place-booking celebration — the brand ball morph.
 * Every provider plays the same skeleton to the same beats; only the
 * final form (and its accent) is theirs:
 *
 *   0.65  surface fades in during the dock pill's dissolve
 *   0.90  a single ball in the provider's color drops in and bounces
 *         to rest, squashing on each impact
 *   2.15  the ball settles into a flat badge and the check draws
 *         across it — booked
 *   ~2.9  the pause: the confirmation breathes
 *   3.30  the morph: the check retracts and the ball becomes the
 *         provider's own mark (Yelp's burst pops, Google's pin
 *         stretches and drops, OpenTable's table sets itself)
 *   3.55  the provider's light blooms behind the mark
 *   4.35  the copy develops beneath
 *
 * The hero's layout box never changes size — the act plays in place
 * (8C's lesson, baked in).
 */
import { bounceOut, prog } from './gameTimeline'

export const BRAND_T = {
  surfaceDelay: 0.65,
  surface: 0.6,
  /** The launch: the ball SHOOTS UP from below the screen's bottom... */
  drop: 0.7,
  riseDur: 0.55,
  /** ...hangs at the apex, then falls and bounces. */
  fallStart: 1.25,
  fallDur: 1.0,
  /** The last impact — the ball IS a dot of ink on the check's path
      (a zero-length stroke with round caps), and from here it unrolls
      both ways into the check, riding the final micro-hop. */
  unroll: 2.159,
  unrollDur: 0.42,
  /** The redraw: the check drains toward its tip... */
  redraw: 3.35,
  redrawDur: 0.28,
  /** ...and the lobe DEPARTS while the tail is still draining — the
      overlap is what lets the goo bridge them into a stretchy neck
      that snaps, 6C's handoff grammar. */
  travel: 3.52,
  travelDur: 0.24,
  /** ...and the provider's mark draws itself out of it. */
  logo: 3.83,
  logoDur: 0.6,
  textIn: 4.55,
} as const

export const BRAND_EASE = [0.32, 0.72, 0, 1] as const

export { clamp01, prog, sceneNow } from './gameTimeline'

/** Where the launch starts (below the SCREEN's bottom edge — the
    celebration canvas extends past its layout box so the ball can
    cover the whole surface) and where the rise tops out, as offsets
    from the ball's resting point. */
export const BALL_Y0 = 560
export const BALL_APEX = -120

/** The ball's y offset (px) at time t: a ballistic rise from below the
    frame, a natural hang at the apex, then the fall and bounces. */
export function brandBallY(t: number) {
  if (t < BRAND_T.drop) return BALL_Y0
  if (t < BRAND_T.fallStart) {
    // Decelerating rise — velocity reaches zero exactly at the apex,
    // which is what makes the hang read.
    const p = prog(t, BRAND_T.drop, BRAND_T.riseDur)
    return BALL_APEX + (BALL_Y0 - BALL_APEX) * (1 - p) * (1 - p)
  }
  return BALL_APEX * (1 - bounceOut(prog(t, BRAND_T.fallStart, BRAND_T.fallDur)))
}

/** Squash on the drop's first two impacts — deep, cartoon-grade,
    scaled to each bounce's energy. The third impact is where the ball
    stops being a ball (the unroll takes over). */
export function brandSquash(t: number) {
  let s = 1
  const hits: Array<[number, number]> = [
    [0.3636, 0.3],
    [0.7273, 0.2],
  ]
  for (const [pi, depth] of hits) {
    const k = Math.abs(t - (BRAND_T.fallStart + pi * BRAND_T.fallDur))
    if (k < 0.08) s = Math.min(s, 1 - depth * (1 - k / 0.08))
  }
  return s
}

export function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3)
}
