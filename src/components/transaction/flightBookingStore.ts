/**
 * 2E's booking handoff — the reservation flow's slots speak restaurant
 * (time / party), so the flight, airline, and payment details ride this
 * module store between the draft card (which writes it at pay time), the
 * receipt takeover, and the thread's resolved keepsake. One booking is in
 * flight at a time, so a singleton carries it fine at prototype grade.
 */
import type { Airline, FlightOption } from './flightData'

export type FlightPaymentMethod = 'applepay' | 'link' | 'card'

export type FlightBookingDetails = {
  flight: FlightOption | null
  airline: Airline | null
  passengers: number
  method: FlightPaymentMethod
  /** Card payments keep their last four for the receipt line. */
  cardLast4?: string
  total: number
}

export const flightBooking: FlightBookingDetails = {
  flight: null,
  airline: null,
  passengers: 1,
  method: 'applepay',
  total: 0,
}

/** How the payment reads on receipts ("Apple Pay", "Link", "Card ·· 4242"). */
export function paymentLabel(method: FlightPaymentMethod, cardLast4?: string) {
  if (method === 'applepay') return 'Apple Pay'
  if (method === 'link') return 'Link'
  return `Card \u00B7\u00B7 ${cardLast4 ?? '4242'}`
}
