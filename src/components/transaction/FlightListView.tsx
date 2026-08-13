/**
 * Flight list — the full results surface behind the thread's "View More"
 * affordance (the flights answer to CompareView). No map here: flights don't
 * have a neighborhood, so the list owns the screen. The surface clip-morphs
 * open from the pill (the same details grammar), with the thread's airline
 * chips re-sourcing every ticket in place, a flight-shaped filter row, and
 * the tickets stacked as a scrollable rail.
 */
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { AIRLINES, AIRLINE_FLIGHTS, type AirlineId } from './flightData'
import { FlightTicket } from './FlightTicket'
import { AirlineChips } from './FlightTicket'
import { useReservationFlow } from './reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const

/** Where the morph starts: the View More pill's insets from the frame edges. */
export type ListOrigin = { top: number; right: number; bottom: number; left: number }

/** The two live sorts — the assistant's ordering vs. cheapest fare first.
    Either chip toggles off, landing back on the airline's own order. */
type SortId = 'best' | 'cheapest'
type Sort = SortId | null
const SORTS: { id: SortId; label: string }[] = [
  { id: 'best', label: 'Best match' },
  { id: 'cheapest', label: 'Cheapest' },
]
const FILTERS = ['Nonstop', 'Time', 'Bags']

function FilterRow({ sort, onSort }: { sort: Sort; onSort: (s: SortId) => void }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
      <div className="flex w-max items-center gap-2">
        <button
          type="button"
          aria-label="Filters"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-200 ease-out active:scale-95"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2.4" />
            <circle cx="8" cy="17" r="2.4" />
          </svg>
        </button>
        {SORTS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={sort === id}
            onClick={() => onSort(id)}
            className={`flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-medium whitespace-nowrap outline-none transition-[transform,background-color,color] duration-200 ease-out active:scale-[0.97] ${
              sort === id ? 'bg-ink text-white' : 'bg-black/[0.05] text-ink'
            }`}
          >
            {label}
          </button>
        ))}
        {FILTERS.map((label) => (
          <button
            key={label}
            type="button"
            className="flex h-10 shrink-0 items-center rounded-full bg-black/[0.05] px-4 text-[13px] font-medium whitespace-nowrap text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function FlightListView({
  origin,
  airline,
  onSelectAirline,
  onClose,
}: {
  origin: ListOrigin
  airline: AirlineId
  onSelectAirline: (id: AirlineId) => void
  onClose: () => void
}) {
  const brand = AIRLINES.find((a) => a.id === airline)!

  // While the list is up the orb stays live, but its resting hint stands
  // down — the results are the moment.
  const setHintSuppressed = useReservationFlow()?.setHintSuppressed
  useEffect(() => {
    setHintSuppressed?.(true)
    return () => setHintSuppressed?.(false)
  }, [setHintSuppressed])

  const [sort, setSort] = useState<Sort>('best')
  const toggleSort = (id: SortId) => setSort((s) => (s === id ? null : id))
  const flights =
    sort === 'cheapest'
      ? [...AIRLINE_FLIGHTS[airline]].sort((a, b) => a.price - b.price)
      : AIRLINE_FLIGHTS[airline]

  const originClip = `inset(${origin.top}px ${origin.right}px ${origin.bottom}px ${origin.left}px round 22px)`

  return (
    <motion.div
      className="absolute inset-0 z-[28] flex flex-col overflow-hidden bg-[#fcfcfc]"
      initial={{ clipPath: originClip, opacity: 1 }}
      animate={{ clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }}
      exit={{
        clipPath: originClip,
        opacity: 0,
        transition: {
          clipPath: { duration: 0.4, ease: CLOSE_EASE },
          opacity: { duration: 0.14, delay: 0.26 },
        },
      }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {/* Chrome — back beside the route island, mirroring the thread's
          header grammar. */}
      <div
        className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4"
        style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}
      >
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to thread"
            className="flex size-11 items-center justify-center outline-none transition-transform duration-200 ease-out active:scale-90"
          >
            <img src="/details/chevron-left.svg" alt="" draggable={false} className="size-5" />
          </button>
        </div>
        <div className="flex items-center rounded-[24px] border border-white bg-[rgba(250,250,250,0.7)] px-4 py-[10px] shadow-[0px_2px_40px_0px_rgba(0,0,0,0.1)] backdrop-blur-[12px]">
          <span className="text-[12px] font-medium tracking-[0.12px] text-[#171717]">
            Flights to SFO
          </span>
        </div>
        <span aria-hidden="true" />
      </div>

      {/* Sourcing + filters. */}
      <div className="shrink-0 px-5 pt-4">
        <AirlineChips active={airline} onSelect={onSelectAirline} />
        <div className="mt-3">
          <FilterRow sort={sort} onSort={toggleSort} />
        </div>
      </div>

      {/* Tickets — flat rows (Figma 2331:83404): the card shell drops in the
          list, each ticket printed straight on the canvas and split by a
          hairline running edge to edge. */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2"
        style={{
          scrollbarWidth: 'none',
          paddingBottom: 'calc(var(--safe-bottom) + 160px)',
        }}
      >
        {flights.map((f, i) => (
          <motion.div
            layout="position"
            key={f.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              layout: { type: 'spring', stiffness: 340, damping: 36 },
              duration: 0.35,
              delay: 0.08 + i * 0.05,
              ease: EASE,
            }}
          >
            <div className="px-5">
              <FlightTicket flight={f} airline={brand} flat />
            </div>
            {i < flights.length - 1 && <div className="h-px w-full bg-[#f5f5f5]" />}
          </motion.div>
        ))}
      </div>

      {/* Scrim behind the voice dock — tickets dissolve before the orb. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[164px]"
        style={{
          background:
            'linear-gradient(to top, #fcfcfc 0%, #fcfcfc 40%, rgba(252,252,252,0.62) 66%, rgba(252,252,252,0) 100%)',
        }}
      />
    </motion.div>
  )
}
