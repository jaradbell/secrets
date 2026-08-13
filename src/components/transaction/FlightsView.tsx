/**
 * Flights list-result prototype (8A): the suggested-object moment for a
 * flight search. The user's ask lands in a bubble, airline chips attribute
 * whose inventory the answer carries, and the assistant's lead fare fronts
 * a swipeable ticket deck (the Figma flight ticket as the object class).
 * "View More" clip-morphs the full list open — the flights answer to the
 * places prototype's Compare surface.
 */
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConversationHeader } from './ConversationHeader'
import { AIRLINES, AIRLINE_FLIGHTS, type AirlineId } from './flightData'
import { FlightListView, type ListOrigin } from './FlightListView'
import { AirlineChips, FlightTicketStack } from './FlightTicket'

export function FlightsView({ title = 'Sisters Birthday Weekend' }: { title?: string }) {
  const [airline, setAirline] = useState<AirlineId>('southwest')
  // The full list surface, morphed open from the View More pill. Airline
  // state is shared with the thread, so toggles carry both ways.
  const [listOrigin, setListOrigin] = useState<ListOrigin | null>(null)

  const brand = AIRLINES.find((a) => a.id === airline)!
  const flights = AIRLINE_FLIGHTS[airline]
  const lead = flights[0]

  // Portal target for the header and list overlay — #app-screen keeps the
  // dock's orb above them (see TransactionView's note on stacking).
  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setScreenEl(document.getElementById('app-screen'))
  }, [])

  return (
    <div
      className="-mx-4 flex min-h-0 flex-col self-stretch justify-start overflow-x-hidden overflow-y-auto px-4 pt-[84px] pb-8"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* User turn */}
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
          Find flights to San Francisco for Friday
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>

      {/* Assistant turn — prose, sourcing chips, then the ticket deck. */}
      <div className="mt-2.5 flex flex-col gap-3.5">
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">
            {brand.name}&rsquo;s {lead.departs} nonstop
          </span>{' '}
          is the best fit — lands at {lead.toCode} by {lead.arrives}, ${lead.price} for{' '}
          {lead.seats} seats. Book it, or see more departures?
        </p>

        <AirlineChips active={airline} onSelect={setAirline} />

        <div className="mt-1">
          <FlightTicketStack key={airline} flights={flights} airline={brand} />
        </div>

        <button
          type="button"
          onClick={(e) => {
            if (!screenEl) return
            // The list surface clip-morphs open from this pill's exact
            // bounds, measured against the device frame.
            const v = screenEl.getBoundingClientRect()
            const b = e.currentTarget.getBoundingClientRect()
            setListOrigin({
              top: b.top - v.top,
              left: b.left - v.left,
              right: v.right - b.right,
              bottom: v.bottom - b.bottom,
            })
          }}
          className="mx-auto flex items-center gap-1.5 rounded-full bg-black/[0.05] px-4 py-2.5 text-[12px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
        >
          View More
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9a9a9a"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      </div>

      {screenEl && createPortal(<ConversationHeader title={title} />, screenEl)}

      {/* Full list — under the dock's orb, so voice stays live over it. */}
      {screenEl &&
        createPortal(
          <AnimatePresence>
            {listOrigin && (
              <FlightListView
                key="flight-list"
                origin={listOrigin}
                airline={airline}
                onSelectAirline={setAirline}
                onClose={() => setListOrigin(null)}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}
    </div>
  )
}
