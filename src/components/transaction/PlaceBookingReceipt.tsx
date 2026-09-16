/**
 * 8B's transaction-completed state — the places answer to
 * FlightBookingReceipt. The dock pill blooms out, this dark surface
 * fades in during the dissolve's tail, and the PROVIDER carries the
 * moment (celebrations/BrandBallMorph): a single ball in the
 * provider's color drops in, flattens into the badge as the check
 * draws — booked — holds a breath, then morphs into the provider's
 * own mark (Yelp's burst, Google's pin, OpenTable's table). Only then
 * do the receipt rows develop beneath.
 *
 * Every beat is a delay off BRAND_T (celebrations/brandTimeline.ts).
 */
import { motion } from 'framer-motion'
import { BrandBallMorph } from './celebrations/BrandBallMorph'
import { BRAND_EASE as EASE, BRAND_T as T } from './celebrations/brandTimeline'
import { PROVIDERS, PROVIDER_RESULTS } from './data'
import { placeBooking, placeConfirmation } from './placeBookingStore'
import type { ReservationSlots } from './reservationFlow'

/** Rows develop once the provider's mark has landed. */
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

export function PlaceBookingReceipt({
  place,
  slots,
  onDone,
}: {
  /** The flow's place slot carries the place name (details view begins). */
  place: string
  slots: ReservationSlots
  onDone: () => void
}) {
  // The store carries the booking; the name in `place` is the fallback key.
  const provider = placeBooking.provider ?? PROVIDERS[0]
  const result =
    placeBooking.result ??
    Object.values(PROVIDER_RESULTS)
      .flat()
      .find((r) => r.place.name === place) ??
    PROVIDER_RESULTS.yelp[0]

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
        <BrandBallMorph providerId={provider.id} />

        <motion.p {...develop(0)} className="mt-6 text-[22px] font-medium leading-7 text-white">
          Reservation confirmed
        </motion.p>

        <motion.div {...develop(1)} className="mt-2.5">
          <p className="text-[15px] leading-snug text-white/85">{result.place.name}</p>
          <p className="mt-1 text-[14px] leading-snug text-white/55">
            {slots.date?.split(',')[0] ?? 'Saturday'} · {slots.time ?? '7:30 PM'} ·{' '}
            {slots.party ? `${slots.party} guests` : '2 guests'}
          </p>
        </motion.div>

        <motion.div
          {...develop(2)}
          className="mt-7 flex w-full max-w-[264px] items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3.5"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white">
              <img
                src={provider.icon}
                alt=""
                draggable={false}
                className="size-4 object-contain"
              />
            </span>
            <span className="text-[13px] font-medium text-white/85">{provider.name}</span>
          </span>
          <span className="text-[12px] tracking-[0.06em] text-white/45">
            {placeConfirmation(provider.id)}
          </span>
        </motion.div>

        <motion.button
          {...develop(3)}
          type="button"
          onClick={onDone}
          className="mt-9 flex h-12 w-full max-w-[264px] items-center justify-center rounded-full bg-white text-[14px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
        >
          Done
        </motion.button>
      </div>
    </motion.div>
  )
}
