/**
 * One clock for the flight celebration. Every beat — the porthole
 * developing in, the shade lifting, the route drawing itself from origin
 * to destination, the window dimming on arrival, the check drawing, the
 * receipt copy resolving beneath — is a delay off the receipt surface's
 * mount.
 *
 * Seconds from mount:
 *
 *   0.65  surface fades in during the dock pill's dissolve (see ReservationReceipt)
 *   0.95  porthole frame develops (blur → sharp), shade still drawn
 *   1.30  shade lifts, bottom first — sky, clouds, daylight on the cabin wall
 *   1.60  the route appears on the glass, following the frame: dots, track, codes
 *   2.00  departure — the plane flies the arc, brightening the line behind it
 *   3.26  arrival — the plane settles into the destination dot; the window dims
 *   3.50  the check draws across the glass
 *   3.80  "Flight booked" and the receipt rows develop beneath
 */
export const FLIGHT_T = {
  surfaceDelay: 0.65,
  surface: 0.6,
  windowIn: 0.95,
  windowInDur: 0.6,
  shadeUp: 1.3,
  shadeDur: 0.7,
  routeIn: 1.6,
  depart: 2.0,
  flightDur: 1.4,
  checkIn: 3.5,
  textIn: 3.8,
} as const

/** Fraction of the flight at which the plane has settled onto the destination. */
export const LAND_FRAC = 0.9
/** The arrival beat: the destination dot lands, the window dims. */
export const FLIGHT_LAND = FLIGHT_T.depart + FLIGHT_T.flightDur * LAND_FRAC

export const CELEBRATION_EASE = [0.32, 0.72, 0, 1] as const
