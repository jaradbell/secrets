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
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AIRLINE_FLIGHTS, type Airline, type FlightOption } from './flightData'
import {
  cardBrandOf,
  flightBooking,
  flightNumber,
  type FlightPaymentMethod,
} from './flightBookingStore'
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
      {/* Short enough to hold one line — a wrapped orphan reads worse
          than the terser sentence (the icon carries "cancelled"). */}
      <span className="text-[12px] whitespace-nowrap text-ink-tertiary">
        Cancelled &mdash; {label} draft discarded
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

/** Face ID glyph — corner brackets around the face. */
function FaceIdMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8V6a3 3 0 0 1 3-3h2M16 3h2a3 3 0 0 1 3 3v2M21 16v2a3 3 0 0 1-3 3h-2M8 21H6a3 3 0 0 1-3-3v-2" />
      <path d="M8.5 9.5v1.2M15.5 9.5v1.2M12 9.5v4h-1M8.6 15.5a4.8 4.8 0 0 0 6.8 0" />
    </svg>
  )
}

/** The tiny card-on-file chip the wallet surfaces show — dyed and marked
    for the card's network (Visa the default saved card). */
function WalletCardChip({ brand = 'Visa' }: { brand?: string }) {
  const bg =
    brand === 'Mastercard'
      ? 'linear-gradient(135deg, #3d4451 0%, #14181f 100%)'
      : brand === 'Amex'
        ? 'linear-gradient(135deg, #2f9de4 0%, #016fd0 100%)'
        : 'linear-gradient(135deg, #4c6ef5 0%, #2b3fa8 100%)'
  return (
    <span
      className="flex h-7 w-11 shrink-0 items-end rounded-[5px] px-1.5 pb-1"
      style={{ background: bg }}
    >
      {brand === 'Mastercard' ? (
        <span className="flex items-center pb-px" aria-hidden="true">
          <span className="size-2 rounded-full bg-[#eb001b]" />
          <span className="-ml-1 size-2 rounded-full bg-[#f79e1b] opacity-90" />
        </span>
      ) : (
        <span className="text-[6.5px] font-bold tracking-[0.08em] text-white italic uppercase">
          {brand === 'Amex' ? 'AMEX' : 'VISA'}
        </span>
      )}
    </span>
  )
}

/**
 * The Apple Pay moment — sheet with the card on file, contact, and total,
 * confirmed with a simulated Face ID pass (scan → done → the payment
 * hands off). X backs out with nothing charged.
 */
function ApplePaySheet({
  total,
  merchant,
  onConfirm,
  onClose,
}: {
  total: number
  merchant: string
  onConfirm: () => void
  onClose: () => void
}) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle')
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const confirm = () => {
    if (phase !== 'idle') return
    setPhase('scanning')
    timers.current.push(
      window.setTimeout(() => setPhase('done'), 1100),
      window.setTimeout(onConfirm, 1800),
    )
  }

  return (
    <>
      <div aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-black/12" />

      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1 text-ink">
          <AppleMark />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">Pay</span>
        </span>
        <button
          type="button"
          aria-label="Cancel Apple Pay"
          disabled={phase !== 'idle'}
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-150 active:scale-90 disabled:opacity-40"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3 13 13M13 3 3 13" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex flex-col rounded-[16px] bg-black/[0.03]">
        <div className="flex h-[52px] items-center justify-between gap-3 px-4">
          <span className="flex items-center gap-3">
            <WalletCardChip />
            <span className="flex flex-col">
              <span className="text-[13px] font-semibold text-ink">Visa &middot;&middot; 4242</span>
              <span className="text-[11px] text-ink-tertiary">Apple Wallet</span>
            </span>
          </span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </div>
        <div className="flex h-[44px] items-center justify-between gap-3 border-t border-black/[0.05] px-4">
          <span className="text-[12px] text-ink-tertiary">Contact</span>
          <span className="text-[13px] font-medium text-ink">jb@icloud.com</span>
        </div>
        <div className="flex h-[44px] items-center justify-between gap-3 border-t border-black/[0.05] px-4">
          <span className="text-[12px] text-ink-tertiary">Pay {merchant}</span>
          <span className="text-[14px] font-bold text-ink">${total}</span>
        </div>
      </div>

      {/* The confirm — Face ID carries the go. */}
      <div className="mt-5 flex h-[92px] flex-col items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'idle' ? (
            <motion.button
              key="idle"
              type="button"
              onClick={confirm}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="flex flex-col items-center gap-2 outline-none"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-ink text-white transition-transform duration-150 active:scale-95">
                <FaceIdMark size={24} />
              </span>
              <span className="text-[12.5px] font-medium text-ink">Confirm with Face ID</span>
            </motion.button>
          ) : phase === 'scanning' ? (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="flex flex-col items-center gap-2"
            >
              <motion.span
                className="flex size-12 items-center justify-center rounded-full bg-ink text-white"
                animate={{ scale: [1, 1.08, 1], opacity: [1, 0.75, 1] }}
                transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
              >
                <FaceIdMark size={24} />
              </motion.span>
              <span className="text-[12.5px] font-medium text-ink-tertiary">Face ID&hellip;</span>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-[#34c759] text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5 10 17.5 19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[12.5px] font-medium text-ink">Done</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/**
 * The Link moment — the saved-info lane: your email is recognized, a
 * texted code fills in, and the saved Visa pays. The code autofills
 * (hardcoded flow) so the demo never waits on real input.
 */
const LINK_CODE = ['8', '2', '4', '9', '0', '3']

function LinkSheet({
  total,
  onConfirm,
  onClose,
}: {
  total: number
  onConfirm: () => void
  onClose: () => void
}) {
  const [filled, setFilled] = useState(0)
  const ready = filled >= LINK_CODE.length

  // The texted code arrives and types itself in.
  useEffect(() => {
    const timers = LINK_CODE.map((_, i) =>
      window.setTimeout(() => setFilled(i + 1), 950 + i * 150),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <>
      <div aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-black/12" />

      <div className="mt-3 flex items-center justify-between">
        <span className="flex h-7 items-center rounded-full bg-[#00d66f] px-3 text-[13px] font-bold tracking-[-0.02em] text-[#011e0f] italic">
          Link
        </span>
        <button
          type="button"
          aria-label="Cancel Link"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-150 active:scale-90"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3 13 13M13 3 3 13" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink">Welcome back</p>
      <p className="mt-0.5 text-[12.5px] text-ink-tertiary">
        jb@fullcountcreative.com &middot; enter the code we texted to (415) &bull;&bull;&bull; 4821
      </p>

      {/* The code, typing itself in. */}
      <div className="mt-4 flex gap-2">
        {LINK_CODE.map((digit, i) => (
          <span
            key={i}
            className={`flex h-12 flex-1 items-center justify-center rounded-[12px] text-[17px] font-bold text-ink transition-colors duration-150 ${
              i < filled ? 'bg-[#00d66f]/15' : 'bg-black/[0.04]'
            }`}
            style={i < filled ? { boxShadow: 'inset 0 0 0 1.5px #00d66f' } : undefined}
          >
            {i < filled ? digit : ''}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[16px] bg-black/[0.03] px-4 py-3">
        <span className="flex items-center gap-3">
          <WalletCardChip />
          <span className="text-[13px] font-semibold text-ink">Visa &middot;&middot; 4242</span>
        </span>
        <span className="text-[11.5px] text-ink-tertiary">Saved with Link</span>
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={onConfirm}
        className={`mt-4 flex h-12 w-full items-center justify-center rounded-full text-[14px] font-bold outline-none transition-all duration-200 ${
          ready
            ? 'bg-[#00d66f] text-[#011e0f] active:brightness-95'
            : 'bg-black/[0.05] text-ink-tertiary'
        }`}
      >
        {ready ? `Pay $${total}` : 'Verifying\u2026'}
      </button>
    </>
  )
}

/** Cabin tiers per airline — deltas price a tier against the base fare,
    and one premium tier per carrier is sold out (the quiet error state:
    an option that exists but can't be had on this flight). */
const CABIN_TIERS: Record<string, { label: string; delta: number; soldOut?: boolean }[]> = {
  southwest: [
    { label: 'Economic Class', delta: 0 },
    { label: 'Business Class', delta: 152 },
    { label: 'Business Select', delta: 238, soldOut: true },
  ],
  delta: [
    { label: 'Main Cabin', delta: 0 },
    { label: 'Comfort+', delta: 86 },
    { label: 'First Class', delta: 214, soldOut: true },
  ],
  united: [
    { label: 'Economy', delta: 0 },
    { label: 'Economy Plus', delta: 68 },
    { label: 'United First', delta: 210, soldOut: true },
  ],
}

const tierDelta = (airlineId: string, cabin: string) =>
  CABIN_TIERS[airlineId]?.find((t) => t.label === cabin)?.delta ?? 0

/** The dates around the ask. Some days carry the booked departure at a
    drifted fare; on others that departure doesn't fly — the loud error
    state — and the nearest departures are offered instead. */
type DateOption =
  | { date: string; kind: 'available'; delta: number }
  | {
      date: string
      kind: 'unavailable'
      alts: { departs: string; arrives: string; delta: number }[]
    }

const DATE_OPTIONS: DateOption[] = [
  { date: 'Thu May 23rd', kind: 'available', delta: -12 },
  { date: 'Fri May 24th', kind: 'available', delta: 0 },
  {
    date: 'Sat May 25th',
    kind: 'unavailable',
    alts: [
      { departs: '9:40 AM', arrives: '11:55 AM', delta: 24 },
      { departs: '6:05 PM', arrives: '8:20 PM', delta: -18 },
    ],
  },
  {
    date: 'Sun May 26th',
    kind: 'unavailable',
    alts: [
      { departs: '7:20 AM', arrives: '9:35 AM', delta: 36 },
      { departs: '4:45 PM', arrives: '7:00 PM', delta: 12 },
    ],
  },
  { date: 'Mon May 27th', kind: 'available', delta: 18 },
]

/** Which draft fact a picker sheet is editing. */
type FieldSheet = 'date' | 'flight' | 'cabin' | 'passengers'

const SHEET_TITLES: Record<FieldSheet, string> = {
  date: 'Choose a date',
  flight: 'Choose a departure',
  cabin: 'Choose a cabin',
  passengers: 'How many passengers?',
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
  // The draft's own copy of the flight — date / departure / cabin edits
  // fold into it, so what you pay for is exactly what the card says.
  const [draftFlight, setDraftFlight] = useState<FlightOption>(flight)
  const [cabin, setCabin] = useState(flight.cabin)
  const [sheet, setSheet] = useState<FieldSheet | null>(null)
  // A picked date the booked departure doesn't fly — the sheet turns into
  // the unavailability face (alternatives or keep the current date).
  const [dateHiccup, setDateHiccup] = useState<Extract<
    DateOption,
    { kind: 'unavailable' }
  > | null>(null)
  const closeSheet = () => {
    setSheet(null)
    setDateHiccup(null)
  }
  // Wallet lanes ride their own sheets (Apple Pay's Face ID confirm, Link's
  // texted code); the card lane detours through the save-to-wallet ask.
  const [walletSheet, setWalletSheet] = useState<null | 'applepay' | 'link'>(null)
  const [savePrompt, setSavePrompt] = useState(false)

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
  // Per-seat fare: the flight's price re-based onto the chosen cabin tier.
  const unit = draftFlight.price - tierDelta(airline.id, draftFlight.cabin) + tierDelta(airline.id, cabin)
  const total = unit * passengers
  /** The flight as edited — what actually gets booked and kept. */
  const bookedFlight = (): FlightOption => ({ ...draftFlight, cabin, price: unit })

  /** Any lane lands here: snapshot the booking for the receipt surfaces,
      then hand the flow a complete intent — it books, then blooms. */
  const pay = (method: FlightPaymentMethod, opts?: { saveToWallet?: boolean }) => {
    if (!flow || processing) return
    closeSheet()
    setWalletSheet(null)
    setSavePrompt(false)
    flightBooking.flight = bookedFlight()
    flightBooking.airline = airline
    flightBooking.passengers = passengers
    flightBooking.method = method
    flightBooking.cardBrand = method === 'card' ? cardBrandOf(cardNumber) : undefined
    flightBooking.cardLast4 =
      method === 'card' ? cardNumber.replace(/\D/g, '').slice(-4) : undefined
    flightBooking.savedToWallet = method === 'card' ? !!opts?.saveToWallet : undefined
    flightBooking.total = total
    flow.begin(
      { date: draftFlight.date, time: draftFlight.departs, party: passengers },
      draftFlight.id,
    )
  }

  // Every fact is editable — each row opens its own picker sheet.
  const ledger: { id: FieldSheet; label: string; value: string }[] = [
    { id: 'date', label: 'Date', value: draftFlight.date },
    {
      id: 'flight',
      label: 'Flight',
      value: `${draftFlight.departs} \u2013 ${draftFlight.arrives} \u00B7 ${draftFlight.duration}`,
    },
    { id: 'cabin', label: 'Cabin', value: cabin },
    {
      id: 'passengers',
      label: 'Passengers',
      value: passengers === 1 ? '1 passenger' : `${passengers} passengers`,
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
                    The draft for the {draftFlight.departs} {airline.name} flight will be discarded
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
            ) : savePrompt ? (
              /* Card entered — one useful ask before the charge: keep it
                 in the wallet for future purchases? Either answer pays. */
              <motion.div
                key="save-prompt"
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: EASE }}
                className="flex flex-col gap-4 px-5 pt-4.5 pb-5"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Back to payment"
                    onClick={() => setSavePrompt(false)}
                    className="-ml-1.5 flex size-7 items-center justify-center rounded-full outline-none transition-colors duration-150 active:bg-black/[0.06]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 5-7 7 7 7" />
                    </svg>
                  </button>
                  <span className="text-[12.5px] font-semibold text-ink">Save your card?</span>
                  <span className="w-7" aria-hidden="true" />
                </div>

                <div className="flex items-center gap-3 rounded-[16px] bg-black/[0.03] px-4 py-3">
                  <WalletCardChip brand={cardBrandOf(cardNumber)} />
                  <div className="flex flex-col gap-px">
                    <p className="text-[13px] font-semibold text-ink">
                      {cardBrandOf(cardNumber)} &middot;&middot;{' '}
                      {cardNumber.replace(/\D/g, '').slice(-4)}
                    </p>
                    <p className="text-[11.5px] leading-snug text-ink-tertiary">
                      Add it to your wallet for faster checkout on future purchases.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => pay('card', { saveToWallet: true })}
                    className="flex h-12 w-full items-center justify-center rounded-full text-[13.5px] font-semibold text-white outline-none transition-all duration-200 active:brightness-95"
                    style={{ background: brand }}
                  >
                    Add to wallet &amp; pay ${total}
                  </button>
                  <button
                    type="button"
                    onClick={() => pay('card')}
                    className="flex h-11 w-full items-center justify-center rounded-full bg-black/[0.05] text-[13px] font-semibold text-ink outline-none transition-colors duration-150 active:bg-black/[0.09]"
                  >
                    Just pay this once
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
                      {draftFlight.fromCode}
                    </p>
                    <p className="text-[11.5px] text-ink-tertiary">{draftFlight.departs}</p>
                  </div>
                  <div className="relative mx-3 h-[30px] flex-1 max-w-[120px]">
                    <img src="/flights/route-line.svg" alt="" draggable={false} className="absolute top-[10px] left-0 h-2 w-full" />
                    <img src="/flights/plane.svg" alt="" draggable={false} className="absolute top-0 left-1/2 size-[30px] -translate-x-1/2" />
                  </div>
                  <div className="flex flex-col items-end gap-[2px]">
                    <p className="text-[19px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
                      {draftFlight.toCode}
                    </p>
                    <p className="text-[11.5px] text-ink-tertiary">{draftFlight.arrives}</p>
                  </div>
                </div>

                {/* The facts — stacked ledger rows, every one editable:
                    each opens its own picker sheet, and the total re-adds
                    itself as the facts move. */}
                <div className="flex flex-col rounded-[16px] bg-black/[0.03]">
                  {ledger.map((f, i) => (
                    <button
                      key={f.id}
                      type="button"
                      disabled={processing}
                      aria-label={`Edit ${f.label.toLowerCase()}`}
                      onClick={() => setSheet(f.id)}
                      className={`flex h-[42px] items-center justify-between gap-3 px-4 text-left outline-none transition-colors duration-150 active:bg-black/[0.04] ${
                        i > 0 ? 'border-t border-black/[0.05]' : 'rounded-t-[16px]'
                      }`}
                    >
                      <span className="text-[12px] text-ink-tertiary">{f.label}</span>
                      <span className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink">
                        {f.value}
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                          <path d="m9 5 7 7-7 7" />
                        </svg>
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

                {/* What the money buys — the flight named like a ticket
                    (carrier + number + route), facts on the quiet line. */}
                <div className="-mt-1.5 flex flex-col gap-[3px]">
                  <p className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
                    {airline.name} {flightNumber(draftFlight.id)} &middot; {draftFlight.fromCode}{' '}
                    &rarr; {draftFlight.toCode}
                  </p>
                  <p className="text-[11.5px] leading-snug text-ink-tertiary">
                    {draftFlight.date} &middot; {draftFlight.departs} &middot;{' '}
                    {passengers === 1 ? '1 passenger' : `${passengers} passengers`} &middot; taxes
                    &amp; fees included
                  </p>
                </div>

                {/* One-tap wallets. */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => setWalletSheet('applepay')}
                    className="flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-black text-white outline-none transition-transform duration-200 ease-out active:scale-[0.98] disabled:opacity-60"
                  >
                    <AppleMark />
                    <span className="text-[15px] font-medium tracking-[-0.01em]">Pay</span>
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => setWalletSheet('link')}
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
                  onClick={() => setSavePrompt(true)}
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

      {/* Field sheets — one fact, one sheet (the draft card's picker
          grammar). Picking applies and dismisses in one move; picks the
          inventory can't honor turn the sheet into an error state instead
          of failing silently. */}
      {viewport &&
        createPortal(
          <AnimatePresence>
            {sheet && (
              <>
                <motion.div
                  key="field-scrim"
                  className="absolute inset-0 z-[46] bg-[rgba(20,16,28,0.28)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={closeSheet}
                />
                <motion.div
                  key={`field-sheet-${sheet}`}
                  role="dialog"
                  aria-label={SHEET_TITLES[sheet]}
                  className="absolute inset-x-0 bottom-0 z-[47] rounded-t-[28px] bg-[#fcfcfc] px-5 pt-3 shadow-[0_-24px_70px_-24px_rgba(20,16,28,0.45)]"
                  style={{ paddingBottom: 'calc(var(--safe-bottom) + 22px)' }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.42, ease: EASE }}
                >
                  <div aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-black/12" />

                  {/* ── Date — availability is the real question ─────── */}
                  {sheet === 'date' &&
                    (dateHiccup ? (
                      /* The picked day doesn't fly the booked departure —
                         say so plainly, then offer the nearest ways out. */
                      <motion.div
                        key="date-hiccup"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: EASE }}
                      >
                        <div className="mt-4 flex items-start gap-3 px-1">
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f6a821]/15">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c77d00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 4 2.5 20h19L12 4ZM12 10.5V14M12 16.8v.2" />
                            </svg>
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                              That departure doesn&rsquo;t fly on {dateHiccup.date.split(' ')[0]}
                            </p>
                            <p className="text-[12.5px] leading-snug text-ink-tertiary">
                              {airline.name} has no {draftFlight.departs} to {draftFlight.toCode}{' '}
                              on {dateHiccup.date}. The closest departures:
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                          {dateHiccup.alts.map((alt) => (
                            <button
                              key={alt.departs}
                              type="button"
                              onClick={() => {
                                setDraftFlight((f) => ({
                                  ...f,
                                  date: dateHiccup.date,
                                  departs: alt.departs,
                                  arrives: alt.arrives,
                                  price: f.price + alt.delta,
                                }))
                                closeSheet()
                              }}
                              className="flex items-center justify-between rounded-[16px] bg-black/[0.04] px-4 py-3.5 text-left outline-none transition-colors duration-150 active:bg-black/[0.08]"
                            >
                              <span className="flex flex-col gap-px">
                                <span className="text-[13.5px] font-semibold text-ink">
                                  {alt.departs} &ndash; {alt.arrives}
                                </span>
                                <span className="text-[11.5px] text-ink-tertiary">
                                  {dateHiccup.date} &middot; {cabin}
                                </span>
                              </span>
                              <span className="flex flex-col items-end gap-px">
                                <span className="text-[13.5px] font-bold text-ink">
                                  ${draftFlight.price + alt.delta - tierDelta(airline.id, draftFlight.cabin) + tierDelta(airline.id, cabin)}
                                </span>
                                <span
                                  className={`text-[11px] font-medium ${alt.delta > 0 ? 'text-[#c77d00]' : 'text-[#1e9e56]'}`}
                                >
                                  {alt.delta > 0 ? `+$${alt.delta}` : `\u2212$${Math.abs(alt.delta)}`}{' '}
                                  vs current
                                </span>
                              </span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setDateHiccup(null)}
                            className="flex h-11 w-full items-center justify-center rounded-full bg-black/[0.05] text-[13px] font-semibold text-ink outline-none transition-colors duration-150 active:bg-black/[0.09]"
                          >
                            Keep {draftFlight.date}
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div>
                        <p className="mt-4 px-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                          {SHEET_TITLES.date}
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                          {DATE_OPTIONS.map((opt) => {
                            const selected = opt.date === draftFlight.date
                            return (
                              <button
                                key={opt.date}
                                type="button"
                                onClick={() => {
                                  if (selected) return closeSheet()
                                  if (opt.kind === 'unavailable') return setDateHiccup(opt)
                                  setDraftFlight((f) => ({
                                    ...f,
                                    date: opt.date,
                                    price: f.price + opt.delta,
                                  }))
                                  closeSheet()
                                }}
                                className={`flex items-center justify-between rounded-[14px] px-4 py-3 text-left outline-none transition-colors duration-150 ${
                                  selected
                                    ? 'text-white'
                                    : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                                }`}
                                style={selected ? { background: brand } : undefined}
                              >
                                <span className="text-[13.5px] font-medium">{opt.date}</span>
                                <span
                                  className={`text-[11.5px] ${selected ? 'text-white/70' : 'text-ink-tertiary'}`}
                                >
                                  {selected
                                    ? 'Current'
                                    : opt.kind === 'unavailable'
                                      ? `No ${draftFlight.departs}`
                                      : opt.delta === 0
                                        ? 'Same fare'
                                        : opt.delta > 0
                                          ? `+$${opt.delta}`
                                          : `\u2212$${Math.abs(opt.delta)}`}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                  {/* ── Departure — swap onto a sibling flight ────────── */}
                  {sheet === 'flight' && (
                    <div>
                      <p className="mt-4 px-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                        {SHEET_TITLES.flight}
                      </p>
                      <div className="mt-4 flex flex-col gap-2">
                        {AIRLINE_FLIGHTS[airline.id].map((f) => {
                          const selected = f.departs === draftFlight.departs
                          const short = f.seats < passengers
                          return (
                            <button
                              key={f.id}
                              type="button"
                              disabled={short}
                              onClick={() => {
                                if (!selected) {
                                  setDraftFlight({ ...f, date: draftFlight.date })
                                  setCabin(f.cabin)
                                }
                                closeSheet()
                              }}
                              className={`flex items-center justify-between rounded-[16px] px-4 py-3 text-left outline-none transition-colors duration-150 ${
                                selected
                                  ? 'text-white'
                                  : short
                                    ? 'bg-black/[0.02]'
                                    : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                              }`}
                              style={selected ? { background: brand } : undefined}
                            >
                              <span className="flex flex-col gap-px">
                                <span
                                  className={`text-[13.5px] font-semibold ${short ? 'text-ink-tertiary line-through' : ''}`}
                                >
                                  {f.departs} &ndash; {f.arrives}
                                </span>
                                <span
                                  className={`text-[11.5px] ${selected ? 'text-white/70' : 'text-ink-tertiary'}`}
                                >
                                  {short
                                    ? `Only ${f.seats} ${f.seats === 1 ? 'seat' : 'seats'} left \u2014 you have ${passengers} passengers`
                                    : `${f.cabin} \u00B7 ${f.seats} seats`}
                                </span>
                              </span>
                              <span
                                className={`text-[13.5px] font-bold ${short ? 'text-ink-tertiary' : ''}`}
                              >
                                ${f.price}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Cabin — tiers priced against the base fare ────── */}
                  {sheet === 'cabin' && (
                    <div>
                      <p className="mt-4 px-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                        {SHEET_TITLES.cabin}
                      </p>
                      <div className="mt-4 flex flex-col gap-2">
                        {(CABIN_TIERS[airline.id] ?? []).map((t) => {
                          const selected = t.label === cabin
                          const price =
                            draftFlight.price - tierDelta(airline.id, draftFlight.cabin) + t.delta
                          return (
                            <button
                              key={t.label}
                              type="button"
                              disabled={!!t.soldOut}
                              onClick={() => {
                                setCabin(t.label)
                                closeSheet()
                              }}
                              className={`flex items-center justify-between rounded-[16px] px-4 py-3 text-left outline-none transition-colors duration-150 ${
                                selected
                                  ? 'text-white'
                                  : t.soldOut
                                    ? 'bg-black/[0.02]'
                                    : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                              }`}
                              style={selected ? { background: brand } : undefined}
                            >
                              <span className="flex flex-col gap-px">
                                <span
                                  className={`text-[13.5px] font-semibold ${t.soldOut ? 'text-ink-tertiary line-through' : ''}`}
                                >
                                  {t.label}
                                </span>
                                <span
                                  className={`text-[11.5px] ${selected ? 'text-white/70' : 'text-ink-tertiary'}`}
                                >
                                  {t.soldOut
                                    ? 'Sold out on this flight'
                                    : `$${price} per passenger`}
                                </span>
                              </span>
                              {selected && (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M5 12.5 10 17.5 19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Passengers — capped by the fare's seats ───────── */}
                  {sheet === 'passengers' && (
                    <div>
                      <p className="mt-4 px-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                        {SHEET_TITLES.passengers}
                      </p>
                      <p className="mt-1 px-1 text-[12px] text-ink-tertiary">
                        {draftFlight.seats} {draftFlight.seats === 1 ? 'seat' : 'seats'} left at
                        this fare
                      </p>
                      <div className="mt-4 grid grid-cols-6 gap-2">
                        {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => {
                          const selected = passengers === n
                          const over = n > draftFlight.seats
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={over}
                              aria-label={over ? `${n} \u2014 not enough seats` : `${n}`}
                              onClick={() => {
                                setPassengers(n)
                                closeSheet()
                              }}
                              className={`flex h-12 items-center justify-center rounded-[14px] text-[13.5px] font-medium outline-none transition-colors duration-150 ${
                                selected
                                  ? 'text-white'
                                  : over
                                    ? 'bg-black/[0.02] text-ink-tertiary/50 line-through'
                                    : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                              }`}
                              style={selected ? { background: brand } : undefined}
                            >
                              {n}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          viewport,
        )}

      {/* Wallet sheets — the payment lanes' own moments (Apple Pay's Face
          ID confirm, Link's texted code), on the field sheets' material. */}
      {viewport &&
        createPortal(
          <AnimatePresence>
            {walletSheet && (
              <>
                <motion.div
                  key="wallet-scrim"
                  className="absolute inset-0 z-[46] bg-[rgba(20,16,28,0.28)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setWalletSheet(null)}
                />
                <motion.div
                  key={`wallet-sheet-${walletSheet}`}
                  role="dialog"
                  aria-label={walletSheet === 'applepay' ? 'Apple Pay' : 'Pay with Link'}
                  className="absolute inset-x-0 bottom-0 z-[47] rounded-t-[28px] bg-[#fcfcfc] px-5 pt-3 shadow-[0_-24px_70px_-24px_rgba(20,16,28,0.45)]"
                  style={{ paddingBottom: 'calc(var(--safe-bottom) + 22px)' }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.42, ease: EASE }}
                >
                  {walletSheet === 'applepay' ? (
                    <ApplePaySheet
                      total={total}
                      merchant={airline.name}
                      onConfirm={() => pay('applepay')}
                      onClose={() => setWalletSheet(null)}
                    />
                  ) : (
                    <LinkSheet
                      total={total}
                      onConfirm={() => pay('link')}
                      onClose={() => setWalletSheet(null)}
                    />
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          viewport,
        )}
    </motion.div>
  )
}
