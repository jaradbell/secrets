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
  /** Card payments keep their brand + last four for the receipt line. */
  cardBrand?: string
  cardLast4?: string
  /** The user said yes to keeping the card for future purchases. */
  savedToWallet?: boolean
  total: number
}

export const flightBooking: FlightBookingDetails = {
  flight: null,
  airline: null,
  passengers: 1,
  method: 'applepay',
  total: 0,
}

/** How the payment reads on receipts ("Apple Pay", "Link", "Visa ·· 4242"). */
export function paymentLabel(
  method: FlightPaymentMethod,
  cardLast4?: string,
  cardBrand?: string,
) {
  if (method === 'applepay') return 'Apple Pay'
  if (method === 'link') return 'Link'
  return `${cardBrand ?? 'Card'} \u00B7\u00B7 ${cardLast4 ?? '4242'}`
}

/** Card network from the leading digit — prototype-grade BIN sniffing. */
export function cardBrandOf(number: string) {
  const d = number.replace(/\D/g, '')[0]
  return d === '4' ? 'Visa' : d === '5' ? 'Mastercard' : d === '3' ? 'Amex' : 'Card'
}

/** "wn-2" → "WN 1434" — the seed ids carry the carrier code. */
export function flightNumber(id: string) {
  const [code, n] = id.split('-')
  return `${code.toUpperCase()} ${1408 + parseInt(n, 10) * 13}`
}
