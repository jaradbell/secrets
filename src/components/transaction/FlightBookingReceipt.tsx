/**
 * 2E's transaction-completed state — the flight answer to
 * ReservationReceipt, and the first domain-specific celebration moment.
 * The dock pill blooms out and this dark surface fades in during the
 * dissolve's tail (same handoff as dining); then, instead of a bare check
 * disc, the flight's own iconography carries the moment: an airplane
 * window develops in, its shade lifts on a daylight sky, your route is
 * drawn on the glass and a plane flies it from origin to destination, and
 * the check lands on arrival. Only then do the receipt rows develop
 * beneath — route, airline / booking ref, the payment line, Done.
 *
 * Every beat is a delay off FLIGHT_T (celebrations/flightTimeline.ts).
 */
import { motion } from 'framer-motion'
import { FlightPorthole } from './celebrations/FlightPorthole'
import { CELEBRATION_EASE as EASE, FLIGHT_T as T } from './celebrations/flightTimeline'
import { AIRLINES, AIRLINE_FLIGHTS } from './flightData'
import { flightBooking, paymentLabel } from './flightBookingStore'
import type { ReservationSlots } from './reservationFlow'

/** Rows develop once the check has landed on the window. */
const develop = (i: number) => ({
  initial: { opacity: 0, filter: 'blur(14px)', y: 12 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { delay: T.textIn + i * 0.09, duration: 0.55, ease: EASE },
  },
  exit: { opacity: 0, filter: 'blur(10px)', transition: { duration: 0.12 } },
})

export function FlightBookingReceipt({
  place,
  onDone,
}: {
  /** The flow's place slot carries the flight id (see FlightDraftCard). */
  place: string
  slots: ReservationSlots
  onDone: () => void
}) {
  // The store carries the booking; the id in `place` is the fallback key.
  const flight =
    flightBooking.flight ??
    Object.values(AIRLINE_FLIGHTS)
      .flat()
      .find((f) => f.id === place) ??
    AIRLINE_FLIGHTS.southwest[0]
  const airline = flightBooking.airline ?? AIRLINES.find((a) => a.id === 'southwest')!
  const passengers = flightBooking.passengers
  const total = flightBooking.total || flight.price * passengers

  return (
    <motion.div
      className="absolute inset-0 z-50 overflow-hidden"
      style={{
        background:
          'radial-gradient(130% 110% at 30% 8%, #262130 0%, #17141b 55%, #0e0c11 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: T.surfaceDelay, duration: T.surface, ease: 'easeOut' },
      }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
    >
      <div className="flex h-full flex-col items-center justify-center px-10 text-center">
        <FlightPorthole
          fromCode={flight.fromCode}
          toCode={flight.toCode}
          brandColors={airline.glowColors}
        />

        <motion.p {...develop(0)} className="mt-7 text-[22px] font-medium leading-7 text-white">
          Flight booked
        </motion.p>

        <motion.div {...develop(1)} className="mt-2.5">
          <p className="text-[15px] leading-snug text-white/85">
            {flight.fromCity} ({flight.fromCode}) &rarr; {flight.toCity} ({flight.toCode})
          </p>
          <p className="mt-1 text-[14px] leading-snug text-white/55">
            {flight.date} &middot; Departs {flight.departs} &middot;{' '}
            {passengers === 1 ? '1 passenger' : `${passengers} passengers`}
          </p>
        </motion.div>

        <motion.div
          {...develop(2)}
          className="mt-7 flex w-full max-w-[264px] flex-col rounded-[18px] border border-white/10 bg-white/[0.05]"
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white">
                <img
                  src={airline.icon}
                  alt=""
                  draggable={false}
                  className="size-4 object-contain"
                />
              </span>
              <span className="text-[13px] font-medium text-white/85">{airline.name}</span>
            </span>
            <span className="text-[12px] tracking-[0.06em] text-white/45">#FLT-2183</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3.5">
            <span className="flex flex-col items-start gap-px">
              <span className="text-[13px] text-white/60">
                Paid with{' '}
                {paymentLabel(
                  flightBooking.method,
                  flightBooking.cardLast4,
                  flightBooking.cardBrand,
                )}
              </span>
              {flightBooking.savedToWallet && (
                <span className="text-[11px] text-white/35">Saved to your wallet</span>
              )}
            </span>
            <span className="text-[13px] font-semibold text-white/85">${total}</span>
          </div>
        </motion.div>

        <motion.button
          {...develop(3)}
          type="button"
          onClick={onDone}
          className="mt-8 flex h-12 w-full max-w-[264px] items-center justify-center rounded-full bg-white text-[14px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
        >
          Done
        </motion.button>
      </div>
    </motion.div>
  )
}
