/**
 * 8D's booking handoff — the stays answer to flightBookingStore. The
 * reservation flow's slots speak restaurant (time / party), so the listing,
 * marketplace, and trip facts ride this module store between the details
 * view (which writes it at pay time), the celebration takeover, and the
 * thread's resolved keepsake. One booking is in flight at a time, so a
 * singleton carries it fine at prototype grade.
 */
import type { Stay, StayProvider } from './staysData'

/** The LA long weekend every 8D surface prices against. */
export const STAY_TRIP = {
  checkInDay: 'Thu, May 22',
  checkOutDay: 'Mon, May 26',
  checkInTime: '3:00 PM',
  checkOutTime: '11:00 AM',
  /** How the trip reads on one line ("May 22 – 26"). */
  dates: 'May 22 \u2013 26',
} as const

export type StayBookingDetails = {
  stay: Stay | null
  provider: StayProvider | null
  guests: number
  total: number
}

export const stayBooking: StayBookingDetails = {
  stay: null,
  provider: null,
  guests: 2,
  total: 0,
}

/** Deterministic host per listing — stable across opens. */
const HOSTS = ['Marisol', 'Devon', 'Priya', 'Jonah', 'Camille', 'Theo', 'Alma', 'Ren']
export const hostFor = (id: string) => {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return { name: HOSTS[n % HOSTS.length], years: (n % 7) + 2 }
}
