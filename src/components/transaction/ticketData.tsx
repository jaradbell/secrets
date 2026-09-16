/**
 * 8C's ticket inventory — the marketplace half of the sports thread. A
 * schedule question is answered from the league's feed (NBA / ESPN); a
 * ticket ask is answered from a marketplace (Ticketmaster / SeatGeek),
 * whose listings deal as a deck and drill into the seat-and-pay sheet
 * (TicketDetailsView). The game preview's "Get tickets" punch-out lands on
 * the same sheet with the active marketplace's lead listing.
 */
import { motion } from 'framer-motion'
import type { SeatSpot } from './arenaMap'

export type TicketProviderId = 'ticketmaster' | 'seatgeek'

export type TicketProvider = {
  id: TicketProviderId
  name: string
  brandColor: string
  /** Order-number prefix on the receipt ("TM-8214"). */
  orderPrefix: string
}

export const TICKET_PROVIDERS: TicketProvider[] = [
  { id: 'ticketmaster', name: 'Ticketmaster', brandColor: '#026CDF', orderPrefix: 'TM' },
  { id: 'seatgeek', name: 'SeatGeek', brandColor: '#FF5B49', orderPrefix: 'SG' },
]

export const ticketProvider = (id: TicketProviderId) =>
  TICKET_PROVIDERS.find((p) => p.id === id) ?? TICKET_PROVIDERS[0]

export type SeatTier = 'floor' | 'lower' | 'mid' | 'upper'

export const TIER_LABELS: Record<SeatTier, string> = {
  floor: 'Courtside',
  lower: 'Lower bowl',
  mid: 'Mid level',
  upper: 'Upper bowl',
}

export type SeatListing = {
  id: string
  tier: SeatTier
  section: string
  row: string
  /** "9–10" — the pair, together. */
  seats: string
  /** Per ticket, fees included. */
  price: number
  gate: string
  /** What the marketplace says about the pair — the row's caption. */
  tags: string[]
  /** Where the section sits in the bowl (arenaMap's geometry). */
  spot: SeatSpot
}

/** The lit run per spot — a straight segment on one of the bowl's rings
    (or along the court's edge for floor seats), the marker at its middle,
    and a clear place for the section pill. */
const spot = (
  d: string,
  cx: number,
  cy: number,
  label: [number, number],
  width?: number,
): SeatSpot => ({ d, cx, cy, label: { x: label[0], y: label[1] }, width })

/** Each marketplace's listings for the fixture — the lead (index 0) is
    what the assistant recommends and what the preview's punch-out opens. */
export const SEAT_LISTINGS: Record<TicketProviderId, SeatListing[]> = {
  ticketmaster: [
    {
      id: 'tm-108',
      tier: 'lower',
      section: '108',
      row: '15',
      seats: '9\u201310',
      price: 132,
      gate: 'C',
      tags: ['2 together', 'Aisle'],
      spot: spot('M150 141h48', 174, 141, [174, 168]),
    },
    {
      id: 'tm-214',
      tier: 'mid',
      section: '214',
      row: '6',
      seats: '11\u201312',
      price: 84,
      gate: 'B',
      tags: ['Center court', 'Aisle'],
      spot: spot('M144 175h44', 166, 175, [220, 175]),
    },
    {
      id: 'tm-121',
      tier: 'lower',
      section: '121',
      row: '22',
      seats: '3\u20134',
      price: 118,
      gate: 'D',
      tags: ['Behind the basket', '2 together'],
      spot: spot('M282 62v36', 282, 80, [334, 80]),
    },
    {
      id: 'tm-224',
      tier: 'upper',
      section: '224',
      row: '12',
      seats: '5\u20136',
      price: 58,
      gate: 'D',
      tags: ['Lowest price', 'Clear view'],
      spot: spot('M356 58v52', 356, 84, [356, 128]),
    },
    {
      id: 'tm-1',
      tier: 'floor',
      section: '1',
      row: 'AA',
      seats: '5\u20136',
      price: 890,
      gate: 'A',
      tags: ['Courtside', 'In-seat service'],
      spot: spot('M172 123h48', 196, 123, [196, 162], 9),
    },
  ],
  seatgeek: [
    {
      id: 'sg-112',
      tier: 'lower',
      section: '112',
      row: '9',
      seats: '7\u20138',
      price: 141,
      gate: 'C',
      tags: ['2 together', 'Deal score 8.4'],
      spot: spot('M194 141h48', 218, 141, [218, 168]),
    },
    {
      id: 'sg-209',
      tier: 'mid',
      section: '209',
      row: '3',
      seats: '14\u201315',
      price: 92,
      gate: 'B',
      tags: ['Center court', 'Front row of the level'],
      spot: spot('M204 175h44', 226, 175, [172, 175]),
    },
    {
      id: 'sg-104',
      tier: 'lower',
      section: '104',
      row: '18',
      seats: '1\u20132',
      price: 109,
      gate: 'A',
      tags: ['Behind the basket', 'Aisle'],
      spot: spot('M110 62v36', 110, 80, [58, 80]),
    },
    {
      id: 'sg-226',
      tier: 'upper',
      section: '226',
      row: '12',
      seats: '5\u20136',
      price: 62,
      gate: 'D',
      tags: ['Lowest price', 'Deal score 9.1'],
      spot: spot('M36 58v52', 36, 84, [36, 128]),
    },
    {
      id: 'sg-2',
      tier: 'floor',
      section: '2',
      row: 'A',
      seats: '3\u20134',
      price: 1240,
      gate: 'A',
      tags: ['Courtside', 'Resale'],
      spot: spot('M172 37h48', 196, 37, [250, 37], 9),
    },
  ],
}

/** The cheapest pair a marketplace lists — the preview's "from $" line. */
export const cheapestListing = (id: TicketProviderId) =>
  SEAT_LISTINGS[id].reduce((a, b) => (b.price < a.price ? b : a))

/** The marketplace's mark — Ticketmaster's blue tile, SeatGeek's coral disc
    with its monogram (prototype-grade; no wordmark asset in the kit). */
export function TicketMark({ provider, size = 32 }: { provider: TicketProvider; size?: number }) {
  if (provider.id === 'ticketmaster') {
    return (
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white"
        style={{ width: size, height: size, background: provider.brandColor }}
      >
        <img
          src="/providers/ticketmaster.png"
          alt=""
          draggable={false}
          className="size-full object-cover"
        />
      </span>
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-white font-extrabold tracking-[-0.04em] text-white"
      style={{ width: size, height: size, background: provider.brandColor, fontSize: size * 0.4 }}
    >
      SG
    </span>
  )
}

/** Marketplace attribution chips — SportsChips' grammar pointed at ticket
    sellers: the active seller unrolls its name, and toggling re-deals the
    listings below. */
export function TicketChips({
  active,
  onSelect,
}: {
  active: TicketProviderId
  onSelect: (id: TicketProviderId) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {TICKET_PROVIDERS.map((p) => {
        const isActive = p.id === active
        return (
          <motion.button
            key={p.id}
            type="button"
            layout
            onClick={() => onSelect(p.id)}
            aria-pressed={isActive}
            aria-label={p.name}
            className="flex items-center rounded-full border border-white/20 p-1 outline-none"
            style={{ background: 'rgba(0,0,0,0.04)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <TicketMark provider={p} />
            {isActive && (
              <motion.span
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-1 flex h-8 items-center rounded-full bg-white/80 px-3 text-[12px] font-medium tracking-[0.2px] whitespace-nowrap text-ink"
              >
                {p.name}
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
