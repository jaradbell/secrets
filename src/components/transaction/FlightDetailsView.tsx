/**
 * Flight drill-in — the details view behind 2E's tickets (the flights
 * answer to PlaceDetailsView). Clip-morphs open from the tapped ticket's
 * geometry onto a full surface: the California basemap up top with the
 * route stitched across it, then a sheet in the flight-tracker grammar —
 * flight number + date overline, the route as a sentence, action chips,
 * a status banner, and the departure / arrival blocks with big scheduled
 * times, gate chips, and terminals.
 *
 * Booking is the sheet's last move: the fare module and the brand-colored
 * go. Opened from the draft card (the booking already in flight), the go
 * stands down — the card below carries it.
 */
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import type { Airline, FlightOption } from './flightData'
import { useReservationFlow } from './reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const

/** Where the morph starts: the tapped ticket's insets from the frame. */
export type DetailsOrigin = { top: number; right: number; bottom: number; left: number }

/** Prototype-grade airport facts the seed data doesn't carry. */
const AIRPORT_NAMES: Record<string, string> = {
  SDG: 'San Diego Intl.',
  SFO: 'San Francisco Intl.',
}
const ROUTE_MILES = 447

/** Deterministic gate/terminal per flight — stable across opens. */
const GATE_LETTERS = ['B7', 'C5', 'A12', 'D3', 'B12', 'C9', 'A4', 'D8']
const gateFor = (id: string, salt: number) => {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), salt * 7)
  return { gate: GATE_LETTERS[n % GATE_LETTERS.length], terminal: (n % 3) + 1 }
}

/** "wn-2" → "WN 1434" — the seed ids carry the carrier code. */
const flightNumber = (id: string) => {
  const [code, n] = id.split('-')
  return `${code.toUpperCase()} ${1408 + parseInt(n, 10) * 13}`
}

/** "Fri May 24th" → "FRI, MAY 24" (the overline's registry style). */
const overlineDate = (date: string) =>
  date.replace(/(st|nd|rd|th)$/, '').replace(/^(\w+) /, '$1, ').toUpperCase()

/** SD and SF as painted on public/map/california.png (393×290 pt). */
const MAP_SD = { x: 291, y: 258 }
const MAP_SF = { x: 100, y: 31 }

function ActionChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 text-[12px] font-medium whitespace-nowrap text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.96]"
    >
      {icon}
      {label}
    </button>
  )
}

function LegBlock({
  dir,
  code,
  name,
  time,
  gate,
  terminal,
}: {
  dir: 'dep' | 'arr'
  code: string
  name: string
  time: string
  gate: string
  terminal: number
}) {
  const arrow =
    dir === 'dep' ? (
      <path d="M7 17 17 7M9 7h8v8" />
    ) : (
      <path d="M7 7l10 10M17 9v8H9" />
    )
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {arrow}
        </svg>
        {code} &middot; {name}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            {time}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-tertiary">Scheduled</p>
        </div>
        <div className="flex flex-col items-end gap-1 pb-0.5">
          <span className="flex items-center gap-0.5 rounded-[9px] bg-[#f6c944] px-2 py-[3px] text-[14px] font-extrabold tracking-[-0.01em] text-ink">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {arrow}
            </svg>
            {gate}
          </span>
          <p className="text-[12px] text-ink-tertiary">
            Terminal <span className="font-semibold text-ink">{terminal}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function FlightDetailsView({
  flight,
  airline,
  origin,
  onClose,
  onBook,
}: {
  flight: FlightOption
  airline: Airline
  origin: DetailsOrigin
  onClose: () => void
  /** The sheet's go — omitted when the booking is already drafted (opened
      from the draft card), where the card below carries the transaction. */
  onBook?: () => void
}) {
  // The details surface owns the moment — the orb stays live, hint down.
  const setHintSuppressed = useReservationFlow()?.setHintSuppressed
  useEffect(() => {
    setHintSuppressed?.(true)
    return () => setHintSuppressed?.(false)
  }, [setHintSuppressed])

  const dep = gateFor(flight.id, 1)
  const arr = gateFor(flight.id, 2)

  const originClip = `inset(${origin.top}px ${origin.right}px ${origin.bottom}px ${origin.left}px round 32px)`

  return (
    <motion.div
      className="absolute inset-0 z-[30] flex flex-col overflow-hidden bg-[#fcfcfc]"
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
      {/* The basemap — full-bleed behind the sheet, the route stitched
          between its endpoints (SD up to SF). */}
      <div className="absolute inset-x-0 top-0 h-[290px]">
        <img
          src="/map/california.png"
          alt=""
          draggable={false}
          className="h-full w-full object-cover object-top"
        />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 393 290"
          fill="none"
          aria-hidden="true"
        >
          {/* Dashed, faded in — animating pathLength would clobber the
              dash pattern (framer drives strokeDasharray itself). */}
          <motion.path
            d={`M${MAP_SD.x} ${MAP_SD.y} Q 128 190 ${MAP_SF.x} ${MAP_SF.y}`}
            stroke="#171717"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="0.1 7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
          />
          <circle cx={MAP_SD.x} cy={MAP_SD.y} r="4.5" fill="#171717" stroke="#fff" strokeWidth="2" />
          <motion.circle
            cx={MAP_SF.x}
            cy={MAP_SF.y}
            r="4.5"
            fill="#171717"
            stroke="#fff"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.25 }}
          />
        </svg>
      </div>

      {/* The sheet — rounded over the map, scrolling its own content. */}
      <div className="relative z-[1] mt-[196px] flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white shadow-[0_-18px_50px_-20px_rgba(20,16,28,0.35)]">
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 pt-5"
          style={{ scrollbarWidth: 'none', paddingBottom: 'calc(var(--safe-bottom) + 170px)' }}
        >
          {/* Header — flight number overline, the route as a sentence. */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.14)]">
                <img src={airline.icon} alt="" draggable={false} className="size-6 object-contain" />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-tertiary">
                  {flightNumber(flight.id)} &middot; {overlineDate(flight.date)}
                </p>
                <p className="text-[20px] leading-[1.2] font-bold tracking-[-0.02em] text-ink">
                  {flight.fromCity} to {flight.toCity}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close flight details"
              onClick={onClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-200 ease-out active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3 13 13M13 3 3 13" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Action chips. */}
          <div className="-mx-5 mt-4 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
            <div className="flex w-max items-center gap-2">
              <ActionChip
                label="Alternatives"
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h13M14 3.5 17.5 7 14 10.5M20 17H7M10 13.5 6.5 17l3.5 3.5" />
                  </svg>
                }
              />
              <ActionChip
                label="Live Activity"
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 2 5 13.5h6L11 22l8-11.5h-6L13 2Z" />
                  </svg>
                }
              />
              <ActionChip
                label="Open in Maps"
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2ZM9 4v14M15 6v14" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Status banner — the tracker's voice, tuned for pre-booking. */}
          <div className="-mx-5 mt-3.5 bg-black/[0.04] px-5 py-2.5">
            <p className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">
              On time departure expected
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-tertiary">
              {flight.seats} seats left at this fare
            </p>
          </div>

          {/* Departure → duration → arrival. */}
          <div className="mt-4 flex flex-col">
            <LegBlock
              dir="dep"
              code={flight.fromCode}
              name={AIRPORT_NAMES[flight.fromCode] ?? flight.fromCity}
              time={flight.departs}
              gate={dep.gate}
              terminal={dep.terminal}
            />

            <div className="my-3 flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink-tertiary">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
                {flight.duration} &middot; {ROUTE_MILES} mi
              </span>
              <span className="h-px flex-1 bg-black/[0.07]" />
            </div>

            <LegBlock
              dir="arr"
              code={flight.toCode}
              name={AIRPORT_NAMES[flight.toCode] ?? flight.toCity}
              time={flight.arrives}
              gate={arr.gate}
              terminal={arr.terminal}
            />
          </div>

          {/* The fare and the go — or, mid-draft, a quiet handoff back. */}
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-[16px] bg-black/[0.03] px-4 py-3.5">
              <span className="flex items-center gap-[6px]">
                <img src="/flights/profile.svg" alt="" draggable={false} className="size-[14px]" />
                <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
                  {flight.cabin}
                </span>
              </span>
              <span
                className="flex h-7 min-w-[56px] items-center justify-center rounded-full px-2.5 text-[13px] font-medium text-white"
                style={{ background: airline.brandColor }}
              >
                ${flight.price}
              </span>
            </div>

            {onBook ? (
              <>
                <button
                  type="button"
                  onClick={onBook}
                  className="flex h-12 w-full items-center justify-center rounded-full text-[13.5px] font-semibold text-white outline-none transition-all duration-200 active:brightness-95"
                  style={{ background: airline.brandColor }}
                >
                  Book this flight
                </button>
                <p className="-mt-1 text-center text-[10.5px] text-ink-tertiary">
                  Nothing is charged yet &middot; free cancellation for 24 hours
                </p>
              </>
            ) : (
              <p className="text-center text-[11.5px] text-ink-tertiary">
                This flight is in your draft &mdash; finish booking from the thread.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
