/**
 * 8D's transaction-completed state — the stays answer to
 * FlightBookingReceipt. The dock pill blooms out and this dark surface
 * fades in during the dissolve's tail; then the stay's own iconography
 * carries the moment: a front door develops in, its deadbolt turns, the
 * door swings open on a warm-lit room, and the check lands on the doorway.
 * Only then do the receipt rows develop beneath — the listing, marketplace
 * / confirmation code, the payment line, Done.
 *
 * Every beat is a delay off STAY_T (celebrations/stayTimeline.ts).
 */
import { motion } from 'framer-motion'
import { StayDoor } from './celebrations/StayDoor'
import { STAY_EASE as EASE, STAY_T as T } from './celebrations/stayTimeline'
import type { ReservationSlots } from './reservationFlow'
import { stayBooking, STAY_TRIP } from './stayBookingStore'
import { PROVIDER_STAYS, STAY_PROVIDERS } from './staysData'

/** Rows develop once the check has landed on the doorway. */
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

export function StayBookingReceipt({
  place,
  onDone,
}: {
  /** The flow's place slot carries the stay id (see StayDetailsView). */
  place: string
  slots: ReservationSlots
  onDone: () => void
}) {
  // The store carries the booking; the id in `place` is the fallback key.
  const stay =
    stayBooking.stay ??
    Object.values(PROVIDER_STAYS)
      .flat()
      .find((s) => s.id === place) ??
    PROVIDER_STAYS.airbnb[0]
  const provider = stayBooking.provider ?? STAY_PROVIDERS[0]
  const guests = stayBooking.guests
  const total = stayBooking.total || stay.price

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
        <StayDoor glowColors={provider.glowColors} />

        <motion.p {...develop(0)} className="mt-7 text-[22px] font-medium leading-7 text-white">
          Stay booked
        </motion.p>

        <motion.div {...develop(1)} className="mt-2.5">
          <p className="text-[15px] leading-snug text-white/85">{stay.title}</p>
          <p className="mt-1 text-[14px] leading-snug text-white/55">
            {STAY_TRIP.dates} &middot; {stay.nights} nights &middot;{' '}
            {guests === 1 ? '1 guest' : `${guests} guests`}
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
                  src={provider.icon}
                  alt=""
                  draggable={false}
                  className={`${provider.iconClass} scale-90 object-contain`}
                />
              </span>
              <span className="text-[13px] font-medium text-white/85">{provider.name}</span>
            </span>
            <span className="text-[12px] tracking-[0.06em] text-white/45">#STY-4821</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3.5">
            <span className="text-[13px] text-white/60">Paid with Apple Pay</span>
            <span className="text-[13px] font-semibold text-white/85">
              ${total.toLocaleString()}
            </span>
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
