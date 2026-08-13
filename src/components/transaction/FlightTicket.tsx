/**
 * Flight ticket card (Figma node 2331:82360) and its conversation stack.
 *
 * The ticket is the list-result object for flights: airline wordmark and
 * save-heart up top, the route spread (city / code / time on each side of a
 * dashed track with the plane riding it), a perforation-style dashed rule,
 * and the fare line — cabin + seat count on the left, the price in a pill
 * dyed the airline's brand color.
 *
 * FlightTicketStack reuses PlaceCardStack's deck grammar (rear cards settle
 * downward, soft-focused; flick to page, tap to select) so flights read as
 * the same suggested-object class as places — only the card body changes.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { AIRLINES, type Airline, type FlightOption } from './flightData'

/** Fixed card height — the deck positions rear cards absolutely, so the
    ticket's anatomy is set (not content-grown) the way PlaceCardStack's is. */
export const TICKET_H = 196

/** One side of the route spread — city over code over time. */
function RouteEnd({
  city,
  code,
  time,
  align,
}: {
  city: string
  code: string
  time: string
  align: 'start' | 'end'
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col gap-[5px] whitespace-nowrap ${
        align === 'end' ? 'items-end' : 'items-start'
      }`}
    >
      <p className="text-[12px] font-medium tracking-[-0.02em] text-[#6c7278]">{city}</p>
      <p className="text-[22px] leading-[1.2] font-extrabold tracking-[-0.02em] text-[#1a1c1e]">
        {code}
      </p>
      <p className="text-[12px] font-medium tracking-[-0.02em] text-[#6c7278]">{time}</p>
    </div>
  )
}

export function FlightTicket({
  flight,
  airline,
  muted = false,
  flat = false,
}: {
  flight: FlightOption
  airline: Airline
  /** Rear-of-deck treatment: the shell stays, the printing fades. */
  muted?: boolean
  /** List-row treatment (Figma 2331:83404): the card shell drops — same
      anatomy printed straight on the canvas, rows split by hairlines. */
  flat?: boolean
}) {
  return (
    <div
      className={
        flat
          ? 'flex w-full flex-col justify-between py-4'
          : 'flex w-full flex-col justify-between rounded-[32px] bg-white p-4'
      }
      style={{
        height: flat ? 200 : TICKET_H,
        // Rear cards get a faint hairline so their silhouette reads against
        // the light canvas (the deck peeks are white-on-white otherwise).
        boxShadow: flat
          ? undefined
          : muted
            ? '0px 6px 20px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)'
            : '0px 11px 20px rgba(0,0,0,0.1)',
      }}
    >
      <div
        className="flex h-full flex-col justify-between transition-opacity duration-300"
        style={{ opacity: muted ? 0 : 1 }}
      >
        {/* Airline + save. United has no wordmark on file, so its header
            composes the globe mark with the name in brand blue. */}
        <div className="flex w-full items-center justify-between">
          {airline.logo ? (
            <img
              src={airline.logo}
              alt={airline.name}
              draggable={false}
              className="h-[13px] w-auto object-contain"
            />
          ) : (
            <span className="flex items-center gap-1.5">
              <img src={airline.icon} alt="" draggable={false} className="size-[15px] object-contain" />
              <span
                className="text-[13px] leading-none font-bold tracking-[-0.01em]"
                style={{ color: airline.brandColor }}
              >
                {airline.name}
              </span>
            </span>
          )}
          <img src="/flights/heart.svg" alt="Save" draggable={false} className="w-[15px]" />
        </div>

        {/* Route spread — date and duration bracket the plane's track. */}
        <div className="flex w-full items-center">
          <RouteEnd city={flight.fromCity} code={flight.fromCode} time={flight.departs} align="start" />
          <div className="flex w-[159px] shrink-0 flex-col items-center gap-[5px]">
            <p className="text-[12px] font-extrabold tracking-[-0.02em] whitespace-nowrap text-[#1a1c1e]">
              {flight.date}
            </p>
            <div className="relative h-[30px] w-[113px]">
              <img
                src="/flights/route-line.svg"
                alt=""
                draggable={false}
                className="absolute top-[10px] left-0 h-2 w-full"
              />
              <img
                src="/flights/plane.svg"
                alt=""
                draggable={false}
                className="absolute top-0 left-[41px] size-[30px]"
              />
            </div>
            <p className="text-[12px] font-extrabold tracking-[-0.02em] whitespace-nowrap text-[#1a1c1e]">
              {flight.duration}
            </p>
          </div>
          <RouteEnd city={flight.toCity} code={flight.toCode} time={flight.arrives} align="end" />
        </div>

        {/* Perforation — the ticket's tear line. */}
        <img
          src="/flights/divider.svg"
          alt=""
          draggable={false}
          className="h-px w-full"
          style={{ objectFit: 'fill' }}
        />

        {/* Fare line. */}
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-[5px]">
            <img src="/flights/profile.svg" alt="" draggable={false} className="size-[14px]" />
            <span className="text-[12px] font-semibold tracking-[-0.02em] text-[#1a1c1e]">
              {flight.cabin}&ensp;·&ensp;{flight.seats} seats
            </span>
          </span>
          <span
            className="flex h-6 min-w-[53px] items-center justify-center rounded-full px-2 text-[12px] font-medium tracking-[0.01em] text-white"
            style={{ background: airline.brandColor }}
          >
            ${flight.price}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Downward recession per depth — same grammar as PlaceCardStack. */
const PEEK = [0, 20, 36]
const DEPTH = PEEK.length - 1

export function FlightTicketStack({
  flights,
  airline,
  onSelect,
}: {
  flights: FlightOption[]
  airline: Airline
  /** Tap on the front ticket (flick still pages). */
  onSelect?: (flight: FlightOption) => void
}) {
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const n = flights.length

  // Guards tap-to-advance: a flick released over the card also fires onTap.
  const draggingRef = useRef(false)

  const advance = () => setCurrent((c) => (c + 1) % n)
  const retreat = () => setCurrent((c) => (c - 1 + n) % n)

  return (
    <div
      className="relative w-full"
      style={{ height: TICKET_H + PEEK[Math.min(DEPTH, n - 1)] }}
      role="group"
      aria-roledescription="carousel"
      aria-label="Flight options"
    >
      {flights.map((f, i) => {
        const depth = (i - current + n) % n
        if (depth > DEPTH) return null
        const isFront = depth === 0
        return (
          <motion.div
            key={f.id}
            className="absolute inset-x-0 top-0"
            style={{ zIndex: n - depth }}
            initial={reduced ? { opacity: 0 } : { y: -40, opacity: 0 }}
            animate={{
              y: reduced ? 0 : PEEK[depth],
              x: 0,
              scale: reduced || isFront ? 1 : 1 - depth * 0.045,
              opacity: 1 - depth * 0.06,
            }}
            transition={
              reduced ? { duration: 0.25 } : { type: 'spring', stiffness: 300, damping: 28 }
            }
            drag={isFront && !reduced ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragStart={() => {
              draggingRef.current = true
            }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40 || info.velocity.x < -380) advance()
              else if (info.offset.x > 40 || info.velocity.x > 380) retreat()
              requestAnimationFrame(() => {
                draggingRef.current = false
              })
            }}
            onTap={() => {
              if (!isFront || draggingRef.current) return
              if (onSelect) onSelect(f)
              else advance()
            }}
          >
            <div
              data-flight-card={f.id}
              className={isFront ? 'cursor-grab active:cursor-grabbing' : undefined}
              style={{
                filter:
                  reduced || isFront ? 'none' : `blur(${Math.min(depth * 1.2, 3)}px)`,
                transition: 'filter 0.35s ease',
                touchAction: 'none',
              }}
            >
              <FlightTicket flight={f} airline={airline} muted={!isFront} />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/** Airline chips — the same attribution grammar as the thread's provider
    chips (ProviderChips), pointed at airlines: the active brand unrolls its
    name, and toggling re-sources every ticket below. */
export function AirlineChips({
  active,
  onSelect,
}: {
  active: Airline['id']
  onSelect: (id: Airline['id']) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {AIRLINES.map((a) => {
        const isActive = a.id === active
        return (
          <motion.button
            key={a.id}
            type="button"
            layout
            onClick={() => onSelect(a.id)}
            aria-pressed={isActive}
            aria-label={a.name}
            className="flex items-center rounded-full border border-white/20 p-1 outline-none"
            style={{ background: 'rgba(0,0,0,0.04)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-white">
              <img
                src={a.icon}
                alt=""
                draggable={false}
                className="h-[18px] w-[18px] object-contain"
              />
            </span>
            {isActive && (
              <motion.span
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-1 flex h-8 items-center rounded-full bg-white/80 px-3 text-[12px] font-medium tracking-[0.2px] whitespace-nowrap text-ink"
              >
                {a.name}
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
