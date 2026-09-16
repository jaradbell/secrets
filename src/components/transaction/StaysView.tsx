/**
 * Stays list-result prototype (8D): the suggested-object moment for a
 * hotel / rental search, now wired end to end through booking (2E's
 * grammar pointed at stays). The user's ask lands in a bubble, marketplace
 * chips (Airbnb, Vrbo, Expedia) attribute whose inventory the answer
 * carries, and the assistant's lead listing fronts a swipeable card deck
 * (the Figma stay card, node 2377:73083, as the object class). "View
 * More" clip-morphs the full list open.
 *
 * Tapping a card — in the deck or the full list — morphs the stay's
 * details view open from its geometry. Reserve pays right there (Apple
 * Pay), the booking blooms into the celebration takeover
 * (StayBookingReceipt), and Done lands back on this thread where the
 * resolved turn keeps the card.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConversationHeader } from './ConversationHeader'
import { useReservationFlow } from './reservationFlow'
import { stayBooking, STAY_TRIP } from './stayBookingStore'
import { StayCard, StayCardStack } from './StayCard'
import { StayDetailsView, type StayDetailsOrigin } from './StayDetailsView'
import {
  PROVIDER_STAYS,
  STAY_PROVIDERS,
  StayChips,
  type Stay,
  type StayProvider,
  type StayProviderId,
} from './staysData'
import { StaysListView, type StaysListOrigin } from './StaysListView'

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

/** A booked stay's snapshot — taken at pay time so the keepsake survives
    later bookings (and the flow's own state moving on). */
type StayExchange = {
  id: number
  stay: Stay
  provider: StayProvider
  guests: number
  total: number
}

/** The confirmed keepsake — the stay card tossed into the thread with the
    snapshot-pile tilt (2E's ConfirmedFlightKeepsake grammar). */
function ConfirmedStayKeepsake({ stay }: { stay: Stay }) {
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
        {/* The stay card scaled down uniformly — zoom keeps the typeset. */}
        <div style={{ zoom: 0.62, width: 351 }}>
          <StayCard stay={stay} />
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
          In 3 weeks
        </motion.span>
      </motion.div>
    </div>
  )
}

export function StaysView({ title = 'LA Long Weekend' }: { title?: string }) {
  const [provider, setProvider] = useState<StayProviderId>('airbnb')
  // The full list surface, morphed open from the View More pill. Provider
  // state is shared with the thread, so toggles carry both ways.
  const [listOrigin, setListOrigin] = useState<StaysListOrigin | null>(null)
  // The drill-in — a tapped card morphs open into the stay's details.
  const [details, setDetails] = useState<{
    stay: Stay
    provider: StayProvider
    origin: StayDetailsOrigin
  } | null>(null)

  const brand = STAY_PROVIDERS.find((p) => p.id === provider)!
  const stays = PROVIDER_STAYS[provider]
  const lead = stays[0]

  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'

  // Portal target for the header and overlays — #app-screen keeps the
  // dock's orb above them (see TransactionView's note on stacking).
  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setScreenEl(document.getElementById('app-screen'))
  }, [])

  // ── The booking thread (2E's mechanics, sans draft) ────────────────────
  const [exchanges, setExchanges] = useState<StayExchange[]>([])
  const [revealed, setRevealed] = useState(0)
  const exchangeIdRef = useRef(0)
  const revealTimerRef = useRef(0)
  useEffect(() => () => window.clearTimeout(revealTimerRef.current), [])

  /** A tapped card drills into the stay's details, morphed open from the
      card's own geometry (measured against the device frame). */
  const openDetails = (stay: Stay, from: StayProvider, el: Element) => {
    if (!screenEl) return
    const v = screenEl.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    setDetails({
      stay,
      provider: from,
      origin: {
        top: b.top - v.top,
        left: b.left - v.left,
        right: v.right - b.right,
        bottom: v.bottom - b.bottom,
      },
    })
  }

  /** The details sheet paid — the store carries the booking. Append the
      exchange and hand the flow a complete intent: it books, then blooms. */
  const startBooking = () => {
    if (!flow || stage === 'booking' || stage === 'receipt') return
    const stay = stayBooking.stay
    const from = stayBooking.provider
    if (!stay || !from) return
    setDetails(null)
    setListOrigin(null)
    setExchanges((xs) => [
      ...xs,
      {
        id: ++exchangeIdRef.current,
        stay,
        provider: from,
        guests: stayBooking.guests,
        total: stayBooking.total,
      },
    ])
    window.clearTimeout(revealTimerRef.current)
    revealTimerRef.current = window.setTimeout(
      () => setRevealed(exchangeIdRef.current),
      1100,
    )
    flow.begin(
      { date: STAY_TRIP.dates, time: STAY_TRIP.checkInTime, party: stayBooking.guests },
      stay.id,
    )
  }

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
      {/* User turn */}
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
          Find a place to stay in Los Angeles for the long weekend
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>

      {/* Assistant turn — prose, sourcing chips, then the card deck.
          Tapping the front card is the doorway into booking it. */}
      <div className="mt-2.5 flex flex-col gap-3.5">
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">{lead.title}</span> is the best fit —{' '}
          {lead.specs.toLowerCase()}, rated {lead.rating} by {lead.reviews} guests, $
          {lead.price.toLocaleString()} for {lead.nights} nights. Tap a card for the details,
          or see more places?
        </p>

        <StayChips active={provider} onSelect={setProvider} />

        <div className="mt-1">
          <StayCardStack
            key={provider}
            stays={stays}
            onSelect={(s) => {
              const el = document.querySelector(`[data-stay-card="${s.id}"]`)
              if (el) openDetails(s, brand, el)
            }}
          />
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

      {/* The booking thread — each paid stay appends an exchange; the
          resolved turn keeps the card as history. The keepsake waits out
          the full-screen takeover: Done (dismiss) is what reveals it, so
          it animates in on the return. */}
      {exchanges.map((ex) => {
        const showAssistant = ex.id <= revealed
        const latest = ex.id === exchangeIdRef.current
        // The resolved turn waits out the booking beat and the full-screen
        // takeover — Done (dismiss) is what reveals it, so it animates in
        // on the return.
        const resolved =
          showAssistant && !(latest && (stage === 'booking' || stage === 'receipt'))
        return (
          <div key={ex.id} className="mt-6 flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col items-end"
            >
              <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
                Book the {ex.stay.title.toLowerCase()} on {ex.provider.name}
              </div>
              <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
            </motion.div>

            <div className="mt-2.5 flex flex-col gap-3">
              <AnimatePresence mode="wait" initial={false}>
                {!resolved ? (
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
                    key="receipt"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.16 } }}
                    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    className="flex flex-col gap-3"
                  >
                    <p className="text-[14px] leading-relaxed text-ink">
                      You&rsquo;re all set &mdash;{' '}
                      <span className="font-semibold">{ex.stay.title}</span> is booked for{' '}
                      {STAY_TRIP.dates}, {ex.stay.nights} nights for{' '}
                      {ex.guests === 1 ? '1 guest' : `${ex.guests} guests`}. Paid $
                      {ex.total.toLocaleString()} with Apple Pay &mdash; check-in details are
                      in your email.
                    </p>
                    <ConfirmedStayKeepsake stay={ex.stay} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )
      })}

      {screenEl && createPortal(<ConversationHeader title={title} />, screenEl)}

      {/* Full list — under the dock's orb; a tapped row drills into that
          stay's details (z-30 opens above the list's z-28). */}
      {screenEl &&
        createPortal(
          <AnimatePresence>
            {listOrigin && (
              <StaysListView
                key="stays-list"
                origin={listOrigin}
                provider={provider}
                onSelectProvider={setProvider}
                onClose={() => setListOrigin(null)}
                onSelectStay={(s, el) => openDetails(s, STAY_PROVIDERS.find((p) => p.id === provider)!, el)}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}

      {/* The drill-in — the stay's full details, Reserve as its go. */}
      {screenEl &&
        createPortal(
          <AnimatePresence>
            {details && (
              <StayDetailsView
                key={details.stay.id}
                stay={details.stay}
                provider={details.provider}
                origin={details.origin}
                onClose={() => setDetails(null)}
                onBooked={startBooking}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}
    </div>
  )
}
