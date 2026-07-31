/**
 * The transaction-completed state. The dark dock pill blooms out — swells
 * and dissolves into blur (VoiceControl's side of the handoff) — then this
 * dark surface fades in during the tail of that dissolve, and the receipt
 * develops onto it: each row fades in from a gaussian blur, staggered, like
 * a photo resolving. "Done" fades the surface away and the dock resolves
 * back in.
 */
import { motion } from 'framer-motion'
import type { ReservationSlots } from './reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const

/** The black waits for the pill's dissolve, arriving in its last stretch —
    sequential enough to read as "pill out, black in", overlapped enough
    that the sheet underneath never sits exposed. */
const SURFACE_DELAY_S = 0.65
const SURFACE_S = 0.6

/** Rows develop once the surface has settled. */
const develop = (i: number) => ({
  initial: { opacity: 0, filter: 'blur(14px)', y: 12 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { delay: SURFACE_DELAY_S + 0.45 + i * 0.09, duration: 0.55, ease: EASE },
  },
  exit: { opacity: 0, filter: 'blur(10px)', transition: { duration: 0.12 } },
})

export function ReservationReceipt({
  place,
  slots,
  onDone,
}: {
  place: string
  slots: ReservationSlots
  onDone: () => void
}) {
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
        transition: { delay: SURFACE_DELAY_S, duration: SURFACE_S, ease: 'easeOut' },
      }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
    >
      <div className="flex h-full flex-col items-center justify-center px-10 text-center">
        <motion.div
          {...develop(0)}
          className="flex size-16 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12.5 10 17.5 19 7"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        <motion.p {...develop(1)} className="mt-6 text-[22px] font-medium leading-7 text-white">
          Reservation confirmed
        </motion.p>

        <motion.div {...develop(2)} className="mt-2.5">
          <p className="text-[15px] leading-snug text-white/85">{place}</p>
          <p className="mt-1 text-[14px] leading-snug text-white/55">
            {slots.date?.split(',')[0] ?? 'Saturday'} · {slots.time ?? '7:30 PM'} ·{' '}
            {slots.party ? `${slots.party} guests` : '2 guests'}
          </p>
        </motion.div>

        <motion.div
          {...develop(3)}
          className="mt-8 flex w-full max-w-[264px] items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3.5"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white">
              <img
                src="/providers/opentable.svg"
                alt=""
                draggable={false}
                className="size-4 object-contain"
              />
            </span>
            <span className="text-[13px] font-medium text-white/85">OpenTable</span>
          </span>
          <span className="text-[12px] tracking-[0.06em] text-white/45">#VLT-8127</span>
        </motion.div>

        <motion.button
          {...develop(4)}
          type="button"
          onClick={onDone}
          className="mt-10 flex h-12 w-full max-w-[264px] items-center justify-center rounded-full bg-white text-[14px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
        >
          Done
        </motion.button>
      </div>
    </motion.div>
  )
}
