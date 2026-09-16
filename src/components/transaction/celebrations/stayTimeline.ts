/**
 * One clock for the stay celebration (8D's answer to flightTimeline).
 * Every beat — the front door developing in, the deadbolt turning, the
 * door swinging open on a warm-lit room, the light spilling onto the wall,
 * the doorway dimming for the check, the receipt copy resolving beneath —
 * is a delay off the receipt surface's mount.
 *
 * Seconds from mount:
 *
 *   0.65  surface fades in during the dock pill's dissolve
 *   0.95  door frame develops (blur → sharp), door shut, hallway dark
 *   1.55  the deadbolt turns — the smart lock's little brass quarter-turn
 *   1.95  the door swings inward on a warm-lit room, lamplight spilling
 *         past the jamb onto the wall around the frame
 *   3.05  arrival — the doorway dims, the room still faintly aglow beneath
 *   3.15  the check draws across the doorway
 *   3.50  "Stay booked" and the receipt rows develop beneath; the
 *         marketplace's colors bloom on the wall behind the frame
 */
export const STAY_T = {
  surfaceDelay: 0.65,
  surface: 0.6,
  doorIn: 0.95,
  doorInDur: 0.6,
  unlock: 1.55,
  swing: 1.95,
  swingDur: 0.95,
  dim: 3.05,
  checkIn: 3.15,
  textIn: 3.5,
} as const

export const STAY_EASE = [0.32, 0.72, 0, 1] as const
/** The door's swing — heavy off the latch, settling against the wall. */
export const SWING_EASE = [0.55, 0, 0.2, 1] as const
