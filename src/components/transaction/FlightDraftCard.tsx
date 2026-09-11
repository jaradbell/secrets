/**
 * 2E flight draft object — the summary card the assistant's turn carries
 * while the booking is still provisional, pointed at flights instead of
 * tables. Same grammar as 2C's DraftReservationCard: white surface, dashed
 * "Draft" badge, facts as stacked ledger rows, X-to-cancel transforms the
 * card into its own confirmation.
 *
 * Where the reservation card's go button books directly, a flight costs
 * money up front — so "Continue to payment" flips the same card to its
 * payment face: Apple Pay / Link one-tap buttons, or a card form (number,
 * expiry, CVC). Paying hands the booking to the reservation flow, whose
 * booking → receipt choreography blooms the confirmation takeover.
 */
import { Squircle } from '@squircle-js/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Airline, FlightOption } from './flightData'
import { flightBooking, type FlightPaymentMethod } from './flightBookingStore'
import { useReservationFlow } from './reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const

/** What's left behind after a cancel — the reservation card's tombstone
    grammar, worded for flights. Dashed like the Draft badge was. */
export function CancelledFlightArtifact({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      className="flex w-fit items-center gap-2 rounded-full border border-dashed px-3.5 py-2"
      style={{ borderColor: 'rgba(0,0,0,0.18)' }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9a9a9a"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M5.8 5.8 18.2 18.2" />
      </svg>
      <span className="text-[12px] text-ink-tertiary">
        Checkout cancelled &mdash; {label} draft discarded
      </span>
    </motion.div>
  )
}

/** Apple's glyph for the Pay button (FontAwesome outline). */
function AppleMark() {
  return (
    <svg width="13" height="16" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}

/** Group a raw card number into 4-digit runs as it's typed. */
const formatCardNumber = (raw: string) =>
  raw
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')

/** Auto-slash expiry input ("0827" → "08/27"). */
const formatExpiry = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

export function FlightDraftCard({
  flight,
  airline,
  onCancelled,
  onOpenDetails,
}: {
  flight: FlightOption
  airline: Airline
  /** The user confirmed the cancel — the host leaves the artifact in the
      thread while this card dissolves. */
  onCancelled: () => void
  /** Route-spread tap — the host morphs the flight's details view open
      from this element (the summary → details grammar). */
  onOpenDetails?: (el: Element) => void
}) {
  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'
  // Once payment fires the flow simulates the charge — everything locks.
  const processing = stage === 'booking' || stage === 'receipt'

  const [face, setFace] = useState<'summary' | 'payment'>('summary')
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [passengers, setPassengers] = useState(1)
  const [sheet, setSheet] = useState(false)

  // Card-form fields — the manual lane next to the one-tap wallets.
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const cardReady =
    cardNumber.replace(/\D/g, '').length >= 15 && /^\d{2}\/\d{2}$/.test(expiry) && /^\d{3,4}$/.test(cvc)

  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])

  const brand = airline.brandColor
  const total = flight.price * passengers

  /** Any lane lands here: snapshot the booking for the receipt surfaces,
      then hand the flow a complete intent — it books, then blooms. */
  const pay = (method: FlightPaymentMethod) => {
    if (!flow || processing) return
    setSheet(false)
    flightBooking.flight = flight
    flightBooking.airline = airline
    flightBooking.passengers = passengers
    flightBooking.method = method
    flightBooking.cardLast4 =
      method === 'card' ? cardNumber.replace(/\D/g, '').slice(-4) : undefined
    flightBooking.total = total
    flow.begin({ date: flight.date, time: flight.departs, party: passengers }, flight.id)
  }

  const ledger: { label: string; value: string; edit?: () => void }[] = [
    { label: 'Date', value: flight.date },
    { label: 'Flight', value: `${flight.departs} \u2013 ${flight.arrives} \u00B7 ${flight.duration}` },
    { label: 'Cabin', value: flight.cabin },
    {
      label: 'Passengers',
      value: passengers === 1 ? '1 passenger' : `${passengers} passengers`,
      edit: () => setSheet(true),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96, filter: 'blur(8px)' }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.45, ease: EASE },
      }}
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(6px)', transition: { duration: 0.2 } }}
    >
      {/* Squircle clipping swallows box-shadow — the shadow rides a wrapper. */}
      <div style={{ filter: 'drop-shadow(0 14px 30px rgba(20,16,28,0.14))' }}>
        <Squircle cornerRadius={26} cornerSmoothing={1} className="overflow-hidden bg-white">
          <AnimatePresence mode="wait" initial={false}>
            {confirmingCancel ? (
              /* The X transforms the card itself into the confirmation —
                 same object, graver question. */
              <motion.div
                key="cancel-confirm"
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: EASE }}
                className="flex flex-col gap-4 px-5 pt-4.5 pb-5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.14)]">
                    <img src={airline.icon} alt="" draggable={false} className="size-[18px] object-contain" />
                  </span>
                  <span className="text-[12.5px] font-semibold text-ink">{airline.name}</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-[15.5px] leading-tight font-semibold tracking-[-0.01em] text-ink">
                    Cancel this booking?
                  </p>
                  <p className="text-[12.5px] leading-relaxed text-ink-tertiary">
                    The draft for the {flight.departs} {airline.name} flight will be discarded
                    &mdash; nothing has been charged.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    className="flex h-11 flex-1 items-center justify-center rounded-full bg-black/[0.05] text-[13px] font-semibold text-ink outline-none transition-colors duration-150 active:bg-black/[0.09]"
                  >
                    Keep draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCancelled()
                      flow?.dismiss()
                    }}
                    className="flex h-11 flex-1 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white outline-none transition-colors duration-150 active:bg-ink/85"
                  >
                    Cancel booking
                  </button>
                </div>
              </motion.div>
            ) : face === 'summary' ? (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: EASE }}
                className="flex flex-col gap-4 px-5 pt-4.5 pb-4"
              >
                {/* Airline lockup + draft badge + cancel */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.14)]">
                      <img src={airline.icon} alt="" draggable={false} className="size-[18px] object-contain" />
                    </span>
                    <span className="text-[12.5px] font-semibold text-ink">{airline.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="flex h-6 items-center rounded-full border border-dashed px-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase"
                      style={{ borderColor: 'rgba(0,0,0,0.22)', color: 'rgba(0,0,0,0.45)' }}
                    >
                      Draft
                    </span>
                    <button
                      type="button"
                      aria-label="Cancel booking"
                      onClick={() => setConfirmingCancel(true)}
                      className="flex size-6 items-center justify-center rounded-full outline-none transition-colors duration-150 active:bg-black/[0.06]"
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="#9a9a9a" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                </div>

                {/* The route — the ticket's spread, compacted to a card row.
                    Tapping it drills into the flight's full details. */}
                <div
                  className="flex items-center justify-between"
                  role={onOpenDetails ? 'button' : undefined}
                  aria-label={onOpenDetails ? 'View flight details' : undefined}
                  onClick={
                    onOpenDetails && !processing
                      ? (e) => onOpenDetails(e.currentTarget)
                      : undefined
                  }
                >
                  <div className="flex flex-col gap-[2px]">
                    <p className="text-[19px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
                      {flight.fromCode}
                    </p>
                    <p className="text-[11.5px] text-ink-tertiary">{flight.departs}</p>
                  </div>
                  <div className="relative mx-3 h-[30px] flex-1 max-w-[120px]">
                    <img src="/flights/route-line.svg" alt="" draggable={false} className="absolute top-[10px] left-0 h-2 w-full" />
                    <img src="/flights/plane.svg" alt="" draggable={false} className="absolute top-0 left-1/2 size-[30px] -translate-x-1/2" />
                  </div>
                  <div className="flex flex-col items-end gap-[2px]">
                    <p className="text-[19px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
                      {flight.toCode}
                    </p>
                    <p className="text-[11.5px] text-ink-tertiary">{flight.arrives}</p>
                  </div>
                </div>

                {/* The facts — stacked ledger rows; passengers is the one
                    editable slot (it multiplies the fare). */}
                <div className="flex flex-col rounded-[16px] bg-black/[0.03]">
                  {ledger.map((f, i) => (
                    <button
                      key={f.label}
                      type="button"
                      disabled={!f.edit}
                      aria-label={f.edit ? `Edit ${f.label.toLowerCase()}` : undefined}
                      onClick={f.edit}
                      className={`flex h-[42px] items-center justify-between gap-3 px-4 text-left outline-none transition-colors duration-150 ${
                        f.edit ? 'active:bg-black/[0.04]' : ''
                      } ${i > 0 ? 'border-t border-black/[0.05]' : 'rounded-t-[16px]'}`}
                    >
                      <span className="text-[12px] text-ink-tertiary">{f.label}</span>
                      <span className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink">
                        {f.value}
                        {f.edit && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            <path d="m9 5 7 7-7 7" />
                          </svg>
                        )}
                      </span>
                    </button>
                  ))}
                  <div className="flex h-[42px] items-center justify-between gap-3 rounded-b-[16px] border-t border-black/[0.05] px-4">
                    <span className="text-[12px] text-ink-tertiary">Total</span>
                    <span className="text-[13.5px] font-bold text-ink">${total}</span>
                  </div>
                </div>

                {/* The go — payment is the next room, not the trigger. */}
                <button
                  type="button"
                  onClick={() => setFace('payment')}
                  className="flex h-12 w-full items-center justify-center rounded-full text-[13.5px] font-semibold text-white outline-none transition-all duration-200 active:brightness-95"
                  style={{ background: brand }}
                >
                  Continue to payment
                </button>

                <p className="-mt-1 text-center text-[10.5px] text-ink-tertiary">
                  Nothing is charged yet &middot; free cancellation for 24 hours
                </p>
              </motion.div>
            ) : (
              /* ── Payment face ─────────────────────────────────────── */
              <motion.div
                key="payment"
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: EASE }}
                className="flex flex-col gap-4 px-5 pt-4.5 pb-5"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Back to draft"
                    disabled={processing}
                    onClick={() => setFace('summary')}
                    className="-ml-1.5 flex size-7 items-center justify-center rounded-full outline-none transition-colors duration-150 active:bg-black/[0.06]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 5-7 7 7 7" />
                    </svg>
                  </button>
                  <span className="text-[12.5px] font-semibold text-ink">Payment</span>
                  <span className="text-[12.5px] font-bold text-ink">${total}</span>
                </div>

                <p className="-mt-1 text-[11.5px] leading-snug text-ink-tertiary">
                  {airline.name} {flight.fromCode} &rarr; {flight.toCode} &middot; {flight.date}{' '}
                  &middot; {passengers === 1 ? '1 passenger' : `${passengers} passengers`}, incl.
                  taxes &amp; fees
                </p>

                {/* One-tap wallets. */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => pay('applepay')}
                    className="flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-black text-white outline-none transition-transform duration-200 ease-out active:scale-[0.98] disabled:opacity-60"
                  >
                    <AppleMark />
                    <span className="text-[15px] font-medium tracking-[-0.01em]">Pay</span>
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => pay('link')}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-[#00d66f] outline-none transition-transform duration-200 ease-out active:scale-[0.98] disabled:opacity-60"
                  >
                    <span className="text-[15px] font-bold tracking-[-0.02em] text-[#011e0f] italic">
                      Link
                    </span>
                  </button>
                </div>

                {/* Or the manual lane. */}
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-black/[0.07]" />
                  <span className="text-[10.5px] font-medium tracking-[0.06em] text-ink-tertiary uppercase">
                    or pay with card
                  </span>
                  <span className="h-px flex-1 bg-black/[0.07]" />
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="Card number"
                    aria-label="Card number"
                    disabled={processing}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="h-12 w-full rounded-[14px] bg-black/[0.04] px-4 text-[14px] font-medium text-ink outline-none placeholder:text-ink-tertiary/70 focus:bg-black/[0.06]"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      aria-label="Expiry date"
                      disabled={processing}
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      className="h-12 min-w-0 flex-1 rounded-[14px] bg-black/[0.04] px-4 text-[14px] font-medium text-ink outline-none placeholder:text-ink-tertiary/70 focus:bg-black/[0.06]"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="CVC"
                      aria-label="Security code"
                      disabled={processing}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="h-12 min-w-0 flex-1 rounded-[14px] bg-black/[0.04] px-4 text-[14px] font-medium text-ink outline-none placeholder:text-ink-tertiary/70 focus:bg-black/[0.06]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={(!cardReady && !processing) || processing}
                  onClick={() => pay('card')}
                  className={`flex h-12 w-full items-center justify-center rounded-full text-[13.5px] font-semibold outline-none transition-all duration-200 ${
                    cardReady || processing ? 'text-white active:brightness-95' : 'text-ink-tertiary'
                  }`}
                  style={{
                    background: processing
                      ? `color-mix(in srgb, ${brand} 82%, black)`
                      : cardReady
                        ? brand
                        : 'rgba(0,0,0,0.05)',
                  }}
                >
                  {processing ? 'Processing payment\u2026' : `Pay $${total}`}
                </button>

                <p className="-mt-1 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-ink-tertiary">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="10" width="16" height="11" rx="2.5" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  Encrypted &middot; your card details are never stored
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Squircle>
      </div>

      {/* Passenger sheet — one field, one sheet (the draft card's picker
          grammar). Picking applies and dismisses in one move. */}
      {viewport &&
        createPortal(
          <AnimatePresence>
            {sheet && (
              <>
                <motion.div
                  key="pax-scrim"
                  className="absolute inset-0 z-[46] bg-[rgba(20,16,28,0.28)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setSheet(false)}
                />
                <motion.div
                  key="pax-sheet"
                  role="dialog"
                  aria-label="How many passengers?"
                  className="absolute inset-x-0 bottom-0 z-[47] rounded-t-[28px] bg-[#fcfcfc] px-5 pt-3 shadow-[0_-24px_70px_-24px_rgba(20,16,28,0.45)]"
                  style={{ paddingBottom: 'calc(var(--safe-bottom) + 22px)' }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.42, ease: EASE }}
                >
                  <div aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-black/12" />
                  <p className="mt-4 px-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                    How many passengers?
                  </p>
                  <p className="mt-1 px-1 text-[12px] text-ink-tertiary">
                    {flight.seats} seats left at this fare
                  </p>
                  <div className="mt-4 grid grid-cols-6 gap-2">
                    {Array.from({ length: flight.seats }, (_, i) => i + 1).map((n) => {
                      const selected = passengers === n
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setPassengers(n)
                            setSheet(false)
                          }}
                          className={`flex h-12 items-center justify-center rounded-[14px] text-[13.5px] font-medium outline-none transition-colors duration-150 ${
                            selected ? 'text-white' : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                          }`}
                          style={selected ? { background: brand } : undefined}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          viewport,
        )}
    </motion.div>
  )
}
