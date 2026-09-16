/**
 * Ticket drill-in — the seat-and-pay sheet behind 8C's seat listings (and
 * the game preview's "Get tickets" punch-out). Clip-morphs open from the
 * tapped card's geometry onto a full surface: the arena bowl drawn up top
 * with your section stitched to the court, then a sheet in the flight-
 * tracker grammar — series + date overline, the matchup as a headline,
 * action chips, a status banner, and the tipoff / seats blocks with big
 * type and gate chips.
 *
 * This is a marketplace's surface, not the league's: the overline names
 * the seller, the fare module and the go wear its color, and Apple Pay
 * charges it. Where a flight detours through the draft card, tickets pay
 * right here — Buy tickets raises the Apple Pay sheet (the draft card's
 * own lane, borrowed verbatim), and the Face ID confirm hands the
 * reservation flow a complete intent: the purchase blooms into the
 * celebration takeover.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArenaHero } from './arenaMap'
import { ApplePaySheet } from './FlightDraftCard'
import { gameBooking, venueFor } from './gameBookingStore'
import { useReservationFlow } from './reservationFlow'
import { gameDate, gameNumberOf, type ScheduleGame } from './sportsData'
import {
  ActionChip,
  ActionChips,
  Banner,
  BlockTitle,
  DetailSurface,
  EASE,
  SheetHeader,
  type DetailsOrigin,
} from './sportsDetailsKit'
import { TIER_LABELS, TicketMark, type SeatListing, type TicketProvider } from './ticketData'

/** "Sat., June 14th" → "SAT, JUNE 14" (the overline's registry style). */
const overlineDate = (date: string) =>
  date.replace(/(st|nd|rd|th)$/, '').replace(/\./g, '').toUpperCase()

export function TicketDetailsView({
  game,
  listing,
  provider,
  origin,
  z,
  onClose,
  onBooked,
}: {
  game: ScheduleGame
  listing: SeatListing
  provider: TicketProvider
  origin: DetailsOrigin
  z?: number
  onClose: () => void
  /** Paid — the Apple Pay confirm landed and the store carries the seats.
      The host hands the flow its complete intent and resolves the thread. */
  onBooked: () => void
}) {
  const flow = useReservationFlow()
  const processing = flow?.stage === 'booking' || flow?.stage === 'receipt'

  const [home, away] = game.teams
  const venue = venueFor(game)
  const quantity = gameBooking.quantity
  const total = listing.price * quantity

  // The Apple Pay sheet rides the frame's viewport, above everything.
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])
  const [paySheet, setPaySheet] = useState(false)

  /** Face ID passed: snapshot the purchase for the celebration surfaces,
      then hand the moment back to the host (which opens the flow). */
  const confirmPay = () => {
    setPaySheet(false)
    gameBooking.game = game
    gameBooking.listing = listing
    gameBooking.provider = provider
    gameBooking.total = total
    onBooked()
  }

  return (
    <DetailSurface
      origin={origin}
      z={z}
      hero={<ArenaHero spot={listing.spot} section={listing.section} />}
    >
      <SheetHeader
        overline={
          <>
            {provider.name} &middot; {overlineDate(gameDate(game))}
          </>
        }
        title={
          <>
            {home.name} vs {away.name}
          </>
        }
        avatar={<img src={home.logo} alt="" draggable={false} className="size-6 object-contain" />}
        onClose={onClose}
        closeLabel="Close ticket details"
      />

      <ActionChips>
        <ActionChip
          label="Seat view"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
          }
        />
        <ActionChip
          label="Change seats"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h13M14 3.5 17.5 7 14 10.5M20 17H7M10 13.5 6.5 17l3.5 3.5" />
            </svg>
          }
        />
        <ActionChip
          label="Directions"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2ZM9 4v14M15 6v14" />
            </svg>
          }
        />
      </ActionChips>

      <Banner
        title={<>Seats are going fast in section {listing.section}</>}
        sub={
          <>
            Game {gameNumberOf(game.id)} &middot; {venue.arena} &middot; {venue.city}
          </>
        }
      />

      {/* Tipoff → the matchup → your seats. */}
      <div className="mt-4 flex flex-col">
        <div className="flex flex-col gap-1">
          <BlockTitle
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5V12l3 2" />
              </svg>
            }
          >
            {game.day} &middot; Tipoff
          </BlockTitle>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
                {game.time}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-tertiary">Scheduled</p>
            </div>
            <div className="flex flex-col items-end gap-1 pb-0.5">
              <span className="flex items-center gap-0.5 rounded-[9px] bg-[#f6c944] px-2 py-[3px] text-[14px] font-extrabold tracking-[-0.01em] text-ink">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
                GATE {listing.gate}
              </span>
              <p className="text-[12px] text-ink-tertiary">Doors 6:00 PM</p>
            </div>
          </div>
        </div>

        <div className="my-3 flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-[11.5px] text-ink-tertiary">
            <img src={home.logo} alt="" draggable={false} className="size-4 object-contain" />
            {home.name} {home.record}
            <span className="px-0.5 font-semibold">vs</span>
            <img src={away.logo} alt="" draggable={false} className="size-4 object-contain" />
            {away.name} {away.record}
          </span>
          <span className="h-px flex-1 bg-black/[0.07]" />
        </div>

        <div className="flex flex-col gap-1">
          <BlockTitle
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 4h12v7H6zM6 11v9M18 11v9M6 16h12" />
              </svg>
            }
          >
            Your seats &middot; {TIER_LABELS[listing.tier]}
          </BlockTitle>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
                SEC {listing.section}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-tertiary">
                Row {listing.row} &middot; Seats {listing.seats} &middot; {listing.tags.join(' \u00B7 ')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 pb-0.5">
              <span className="flex items-center rounded-[9px] bg-[#f6c944] px-2 py-[3px] text-[14px] font-extrabold tracking-[-0.01em] text-ink">
                ${listing.price.toLocaleString()}
              </span>
              <p className="text-[12px] text-ink-tertiary">per ticket</p>
            </div>
          </div>
        </div>
      </div>

      {/* The fare and the go — the marketplace's color, Buy raises Apple Pay. */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-[16px] bg-black/[0.03] px-3.5 py-3">
          <span className="flex items-center gap-2.5">
            <TicketMark provider={provider} size={26} />
            <span className="flex flex-col">
              <span className="text-[13px] leading-tight font-semibold tracking-[-0.01em] text-ink">
                {quantity} tickets &middot; together
              </span>
              <span className="text-[11px] leading-tight text-ink-tertiary">
                {provider.name} &middot; fees included
              </span>
            </span>
          </span>
          <span
            className="flex h-7 min-w-[56px] items-center justify-center rounded-full px-2.5 text-[13px] font-medium text-white"
            style={{ background: provider.brandColor }}
          >
            ${total.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          disabled={processing}
          onClick={() => setPaySheet(true)}
          className="flex h-12 w-full items-center justify-center rounded-full text-[13.5px] font-semibold text-white outline-none transition-all duration-200 active:brightness-95 disabled:opacity-60"
          style={{ background: provider.brandColor }}
        >
          {processing ? 'Securing seats\u2026' : 'Buy tickets'}
        </button>
        <p className="-mt-1 text-center text-[10.5px] text-ink-tertiary">
          Prices include fees &middot; transfer or resell anytime
        </p>
      </div>

      {/* The Apple Pay sheet — the draft card's lane, hosted here. */}
      {viewport &&
        createPortal(
          <AnimatePresence>
            {paySheet && (
              <>
                <motion.div
                  key="ticket-pay-scrim"
                  className="absolute inset-0 z-[46] bg-[rgba(20,16,28,0.28)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setPaySheet(false)}
                />
                <motion.div
                  key="ticket-pay-sheet"
                  role="dialog"
                  aria-label="Apple Pay"
                  className="absolute inset-x-0 bottom-0 z-[47] rounded-t-[28px] bg-[#fcfcfc] px-5 pt-3 shadow-[0_-24px_70px_-24px_rgba(20,16,28,0.45)]"
                  style={{ paddingBottom: 'calc(var(--safe-bottom) + 22px)' }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.42, ease: EASE }}
                >
                  <ApplePaySheet
                    total={total}
                    merchant={provider.name}
                    onConfirm={confirmPay}
                    onClose={() => setPaySheet(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          viewport,
        )}
    </DetailSurface>
  )
}
