/**
 * 8C's ticket handoff — the sports answer to flightBookingStore. The
 * fixture, the listing (seats + marketplace), and the total ride this
 * module store between the ticket details view (which writes it at pay
 * time), the celebration takeover, and the thread's resolved keepsake. One
 * purchase is in flight at a time, so a singleton carries it fine at
 * prototype grade.
 */
import { teamInfo, type ScheduleGame } from './sportsData'
import type { SeatListing, TicketProvider } from './ticketData'

/** The fixture's home floor — the first club is the home team. */
export const venueFor = (game: ScheduleGame) => {
  const t = teamInfo(game.teams[0].name)
  return { arena: t.arena, city: t.arenaCity }
}

export type GameBookingDetails = {
  game: ScheduleGame | null
  listing: SeatListing | null
  provider: TicketProvider | null
  quantity: number
  total: number
}

export const gameBooking: GameBookingDetails = {
  game: null,
  listing: null,
  provider: null,
  quantity: 2,
  total: 0,
}
