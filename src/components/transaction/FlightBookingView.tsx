/**
 * 2E — 2C's return-to-conversation booking pointed at flights. The opening
 * turn is 8A's list-result moment (airline chips, the ticket deck, View
 * More); tapping a ticket appends a booking exchange whose latest turn
 * carries the live flight draft (FlightDraftCard). The draft's payment face
 * collects the money — Apple Pay / Link one-tap, or a card form — and
 * paying hands the reservation flow a complete intent: booking blooms into
 * the full-screen confirmation (FlightBookingReceipt), and Done lands back
 * on this thread where the resolved turn keeps the ticket.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConversationHeader } from './ConversationHeader'
import { AIRLINES, AIRLINE_FLIGHTS, type Airline, type AirlineId, type FlightOption } from './flightData'
import { flightBooking, paymentLabel, type FlightPaymentMethod } from './flightBookingStore'
import { CancelledFlightArtifact, FlightDraftCard } from './FlightDraftCard'
import { FlightDetailsView, type DetailsOrigin } from './FlightDetailsView'
import { FlightListView, type ListOrigin } from './FlightListView'
import { AirlineChips, FlightTicket, FlightTicketStack } from './FlightTicket'
import { useReservationFlow } from './reservationFlow'

/** Assistant typing — three quiet dots while the new turn "thinks". */
function TypingDots() {
  return (
    <div className="flex h-8 w-fit items-center gap-1 rounded-full bg-black/[0.06] px-3.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink/40"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/** How an exchange resolved once the flow moved past it — snapshotted so
    the thread keeps honest history while new bookings append below. */
type FlightResolution =
  | { kind: 'cancelled'; label: string }
  | {
      kind: 'receipt'
      flight: FlightOption
      airline: Airline
      passengers: number
      method: FlightPaymentMethod
      cardLast4?: string
      total: number
    }

type BookingExchange = {
  id: number
  user: string
  assistant: string
  resolution?: FlightResolution
}

/** The confirmed keepsake — the 8A ticket tossed into the thread with the
    snapshot-pile tilt (2C's ConfirmedReceipt grammar, flight object). */
function ConfirmedFlightKeepsake({ flight, airline }: { flight: FlightOption; airline: Airline }) {
  return (
    <div className="relative mt-1 pb-2 pl-10">
      {/* Dotted stitch from the prose toward its keepsake. */}
      <svg
        aria-hidden="true"
        className="absolute top-[-4px] left-[9px]"
        width="40"
        height="52"
        viewBox="0 0 40 52"
        fill="none"
      >
        <motion.path
          d="M2 1 C 3 18, 7 34, 22 44"
          stroke="rgba(23,23,23,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="0.1 6.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
        />
      </svg>

      <motion.div
        className="relative mt-6 w-fit"
        initial={{ opacity: 0, y: 16, rotate: 0, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, rotate: -3.5, scale: 1 }}
        transition={{ type: 'spring', stiffness: 190, damping: 20, delay: 0.2 }}
      >
        {/* The 8A ticket scaled down uniformly — zoom keeps the typeset. */}
        <div style={{ zoom: 0.62, width: 351 }}>
          <FlightTicket flight={flight} airline={airline} />
        </div>

        {/* Corner sticker — relative time, the receipt object's voice. */}
        <motion.span
          className="absolute -top-2.5 -right-3 flex items-center gap-1.5 rounded-full bg-ink py-[7px] pr-3.5 pl-3 text-[11.5px] font-medium tracking-[0.01em] text-white shadow-[0_4px_16px_rgba(0,0,0,0.28)]"
          initial={{ opacity: 0, scale: 0.6, rotate: 12 }}
          animate={{ opacity: 1, scale: 1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.55 }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          In 2 weeks
        </motion.span>
      </motion.div>
    </div>
  )
}

export function FlightBookingView({ title = 'Sisters Birthday Weekend' }: { title?: string }) {
  const [airline, setAirline] = useState<AirlineId>('southwest')
  const [listOrigin, setListOrigin] = useState<ListOrigin | null>(null)
  // The drill-in — a tapped ticket morphs open into the flight's details.
  // `bookable` stands the sheet's go down when the draft already exists.
  const [details, setDetails] = useState<{
    flight: FlightOption
    airline: Airline
    origin: DetailsOrigin
    bookable: boolean
  } | null>(null)

  const brand = AIRLINES.find((a) => a.id === airline)!
  const flights = AIRLINE_FLIGHTS[airline]
  const lead = flights[0]

  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'

  // Portal target — #app-screen keeps the dock's orb above the overlays.
  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setScreenEl(document.getElementById('app-screen'))
  }, [])

  // ── The booking thread (2C's mechanics) ────────────────────────────────
  const [exchanges, setExchanges] = useState<BookingExchange[]>([])
  const [revealed, setRevealed] = useState(0)
  // The live draft — rides only the newest unresolved exchange.
  const [draft, setDraft] = useState<{ flight: FlightOption; airline: Airline } | null>(null)
  const exchangeIdRef = useRef(0)
  const revealTimerRef = useRef(0)
  useEffect(() => () => window.clearTimeout(revealTimerRef.current), [])

  const appendExchange = (user: string, assistant: string) => {
    setExchanges((xs) => {
      const next = [...xs, { id: ++exchangeIdRef.current, user, assistant }]
      window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = window.setTimeout(() => setRevealed(next.length), 1100)
      return next
    })
  }

  const resolveExchange = (id: number, resolution: FlightResolution) =>
    setExchanges((xs) => xs.map((x) => (x.id === id ? { ...x, resolution } : x)))

  /** A tapped ticket drills into the flight's details, morphed open from
      the ticket's own geometry (measured against the device frame). */
  const openDetails = (flight: FlightOption, from: Airline, el: Element) => {
    if (!screenEl) return
    const v = screenEl.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    setDetails({
      flight,
      airline: from,
      origin: {
        top: b.top - v.top,
        left: b.left - v.left,
        right: v.right - b.right,
        bottom: v.bottom - b.bottom,
      },
      bookable: !(draft && draft.flight.id === flight.id),
    })
  }

  /** The details sheet's go opens a booking exchange. */
  const startBooking = (flight: FlightOption, from: Airline) => {
    if (stage === 'booking' || stage === 'receipt') return
    setDetails(null)
    setListOrigin(null)
    setDraft({ flight, airline: from })
    appendExchange(
      `Book the ${flight.departs} ${from.name} flight`,
      `Here's your draft \u2014 ${from.name} ${flight.fromCode} \u2192 ${flight.toCode} on ${flight.date}, departing ${flight.departs}. Check the details, set passengers, and continue to payment when you're ready.`,
    )
  }

  // A landed booking resolves the newest exchange into its receipt — the
  // details snapshotted from the payment handoff, so the keepsake survives
  // later bookings (and the flow's own state moving on).
  useEffect(() => {
    if (!flow || stage !== 'receipt') return
    setExchanges((xs) => {
      const last = xs[xs.length - 1]
      if (!last || last.resolution || !flightBooking.flight || !flightBooking.airline) return xs
      return [
        ...xs.slice(0, -1),
        {
          ...last,
          resolution: {
            kind: 'receipt',
            flight: flightBooking.flight,
            airline: flightBooking.airline,
            passengers: flightBooking.passengers,
            method: flightBooking.method,
            cardLast4: flightBooking.cardLast4,
            total: flightBooking.total,
          },
        },
      ]
    })
    setDraft(null)
  }, [flow, stage])

  // Keep the newest turn on screen as the thread builds (see 2C's note on
  // pinning to the scroller's own bottom over a few frames).
  const threadScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!exchanges.length) return
    const timers = [120, 420, 800].map((ms) =>
      window.setTimeout(() => {
        const el = threadScrollRef.current
        el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [exchanges.length, revealed, stage])

  return (
    <div
      ref={threadScrollRef}
      className="-mx-4 -mb-[190px] flex min-h-0 flex-col self-stretch justify-start overflow-x-hidden overflow-y-auto px-4 pt-[84px] pb-[220px]"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* User turn — 8A's ask. */}
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
          Find flights to San Francisco for Friday
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>

      {/* Assistant turn — prose, sourcing chips, the ticket deck. Tapping
          the front ticket is the doorway into booking it. */}
      <div className="mt-2.5 flex flex-col gap-3.5">
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">
            {brand.name}&rsquo;s {lead.departs} nonstop
          </span>{' '}
          is the best fit &mdash; lands at {lead.toCode} by {lead.arrives}, ${lead.price} for{' '}
          {lead.seats} seats. Tap a ticket for the details, or see more departures.
        </p>

        <AirlineChips active={airline} onSelect={setAirline} />

        <div className="mt-1">
          <FlightTicketStack
            key={airline}
            flights={flights}
            airline={brand}
            onSelect={(f) => {
              const el = document.querySelector(`[data-flight-card="${f.id}"]`)
              if (el) openDetails(f, brand, el)
            }}
          />
        </div>

        <button
          type="button"
          onClick={(e) => {
            if (!screenEl) return
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

      {/* The booking thread — each tapped ticket appends an exchange; only
          the latest unresolved turn carries the live draft, and resolved
          turns keep their objects (tombstone or ticket) as history. */}
      {exchanges.map((ex, i) => {
        const latest = i === exchanges.length - 1
        const showAssistant = i < revealed
        const receiptRes = ex.resolution?.kind === 'receipt' ? ex.resolution : null
        const cancelledRes = ex.resolution?.kind === 'cancelled' ? ex.resolution : null
        // The resolved ticket waits out the full-screen takeover — Done
        // (dismiss) is what reveals it, so it animates in on the return.
        const receiptShown = receiptRes && !(latest && stage === 'receipt') ? receiptRes : null
        return (
          <div key={ex.id} className="mt-6 flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col items-end"
            >
              <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
                {ex.user}
              </div>
              <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
            </motion.div>

            <div className="mt-2.5 flex flex-col gap-3">
              <AnimatePresence mode="wait" initial={false}>
                {!showAssistant ? (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25 }}
                  >
                    <TypingDots />
                  </motion.div>
                ) : (
                  <motion.div
                    key={cancelledRes ? 'cancelled' : receiptShown ? 'receipt' : 'reply'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.16 } }}
                    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    className="flex flex-col gap-3"
                  >
                    <p className="text-[14px] leading-relaxed text-ink">
                      {receiptShown ? (
                        <>
                          You&rsquo;re all set &mdash;{' '}
                          <span className="font-semibold">
                            {receiptShown.airline.name} {receiptShown.flight.fromCode} &rarr;{' '}
                            {receiptShown.flight.toCode}
                          </span>{' '}
                          is booked for {receiptShown.flight.date}, departing{' '}
                          {receiptShown.flight.departs}. Paid ${receiptShown.total} with{' '}
                          {paymentLabel(receiptShown.method, receiptShown.cardLast4)} &mdash;
                          boarding passes are in your email.
                        </>
                      ) : (
                        ex.assistant
                      )}
                    </p>

                    {/* The live draft rides only the newest unresolved turn. */}
                    <AnimatePresence>
                      {latest && draft && !ex.resolution && (
                        <FlightDraftCard
                          key="draft"
                          flight={draft.flight}
                          airline={draft.airline}
                          onOpenDetails={(el) => openDetails(draft.flight, draft.airline, el)}
                          onCancelled={() => {
                            resolveExchange(ex.id, {
                              kind: 'cancelled',
                              label: `${draft.airline.name} ${draft.flight.departs}`,
                            })
                            setDraft(null)
                          }}
                        />
                      )}
                    </AnimatePresence>
                    {cancelledRes && <CancelledFlightArtifact label={cancelledRes.label} />}
                    {receiptShown && (
                      <ConfirmedFlightKeepsake
                        flight={receiptShown.flight}
                        airline={receiptShown.airline}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )
      })}

      {screenEl && createPortal(<ConversationHeader title={title} />, screenEl)}

      {/* Full list — under the dock's orb; a tapped row drills into that
          flight's details (z-30 opens above the list's z-28). */}
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
                onSelectFlight={(f, el) =>
                  openDetails(f, AIRLINES.find((a) => a.id === airline)!, el)
                }
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}

      {/* The drill-in — the flight's full details, booking as its go. */}
      {screenEl &&
        createPortal(
          <AnimatePresence>
            {details && (
              <FlightDetailsView
                key={details.flight.id}
                flight={details.flight}
                airline={details.airline}
                origin={details.origin}
                onClose={() => setDetails(null)}
                onBook={
                  details.bookable
                    ? () => startBooking(details.flight, details.airline)
                    : undefined
                }
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}
    </div>
  )
}
