/**
 * Seed data for the flight list-result variants (prototype 8A): three
 * switchable airlines, each ranking its own San Diego → San Francisco
 * departures for the same Friday. Mirrors data.ts's provider grammar —
 * the chips swap whose inventory (and branding) the tickets carry.
 */

export type AirlineId = 'delta' | 'southwest' | 'united'

export type Airline = {
  id: AirlineId
  name: string
  /** Circular chip mark (the brand's bare glyph). */
  icon: string
  /** Wordmark for the ticket header, when the brand has one on file. */
  logo?: string
  /** Brand color — carries the ticket's price pill. */
  brandColor: string
}

export const AIRLINES: Airline[] = [
  {
    id: 'delta',
    name: 'Delta',
    icon: '/providers/delta.svg',
    logo: '/flights/delta-logo.svg',
    brandColor: '#C01933',
  },
  {
    id: 'southwest',
    name: 'Southwest',
    icon: '/providers/southwest.svg',
    logo: '/flights/southwest-logo.png',
    brandColor: '#304CB2',
  },
  {
    id: 'united',
    name: 'United',
    icon: '/providers/united.png',
    brandColor: '#0033A0',
  },
]

export type FlightOption = {
  id: string
  fromCity: string
  fromCode: string
  departs: string
  toCity: string
  toCode: string
  arrives: string
  date: string
  duration: string
  cabin: string
  seats: number
  price: number
}

const SDG_SFO = {
  fromCity: 'San Diego',
  fromCode: 'SDG',
  toCity: 'San Francisco',
  toCode: 'SFO',
  date: 'Fri May 24th',
} as const

/** Each airline's Friday departures, in its own preferred order — the first
    ticket is the airline's lead fare (the one the thread's stack fronts). */
export const AIRLINE_FLIGHTS: Record<AirlineId, FlightOption[]> = {
  southwest: [
    { id: 'wn-1', ...SDG_SFO, departs: '8:15 AM', arrives: '10:30 AM', duration: '2h 15m', cabin: 'Economic Class', seats: 2, price: 360 },
    { id: 'wn-2', ...SDG_SFO, departs: '11:40 AM', arrives: '1:50 PM', duration: '2h 10m', cabin: 'Economic Class', seats: 4, price: 298 },
    { id: 'wn-3', ...SDG_SFO, departs: '2:05 PM', arrives: '4:25 PM', duration: '2h 20m', cabin: 'Economic Class', seats: 2, price: 274 },
    { id: 'wn-4', ...SDG_SFO, departs: '6:30 PM', arrives: '8:45 PM', duration: '2h 15m', cabin: 'Business Class', seats: 3, price: 512 },
  ],
  delta: [
    { id: 'dl-1', ...SDG_SFO, departs: '7:05 AM', arrives: '9:15 AM', duration: '2h 10m', cabin: 'Main Cabin', seats: 3, price: 342 },
    { id: 'dl-2', ...SDG_SFO, departs: '10:20 AM', arrives: '12:35 PM', duration: '2h 15m', cabin: 'Main Cabin', seats: 2, price: 318 },
    { id: 'dl-3', ...SDG_SFO, departs: '1:45 PM', arrives: '4:05 PM', duration: '2h 20m', cabin: 'Comfort+', seats: 4, price: 428 },
    { id: 'dl-4', ...SDG_SFO, departs: '5:50 PM', arrives: '8:00 PM', duration: '2h 10m', cabin: 'First Class', seats: 2, price: 589 },
  ],
  united: [
    { id: 'ua-1', ...SDG_SFO, departs: '9:00 AM', arrives: '11:20 AM', duration: '2h 20m', cabin: 'Economy', seats: 2, price: 335 },
    { id: 'ua-2', ...SDG_SFO, departs: '12:15 PM', arrives: '2:30 PM', duration: '2h 15m', cabin: 'Economy', seats: 5, price: 289 },
    { id: 'ua-3', ...SDG_SFO, departs: '3:35 PM', arrives: '5:55 PM', duration: '2h 20m', cabin: 'Economy Plus', seats: 3, price: 402 },
    { id: 'ua-4', ...SDG_SFO, departs: '7:10 PM', arrives: '9:20 PM', duration: '2h 10m', cabin: 'United First', seats: 2, price: 545 },
  ],
}
