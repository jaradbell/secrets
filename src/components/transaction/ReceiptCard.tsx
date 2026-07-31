/**
 * In-thread transaction receipt — a Dynamic Island-style live activity card.
 * Once a booking confirms, the assistant's turn swaps the exploring UI
 * (chips + card stack) for this: a dark object that reads as "decided and
 * done" against the light, undecided browsing surfaces. Provider up top,
 * the reservation as the payload, and a live-activity progress track from
 * booked to seated.
 */
import { motion } from 'framer-motion'
import { PROVIDERS } from './data'
import type { ReservationSlots } from './reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const

export function ReceiptCard({ place, slots }: { place: string; slots: ReservationSlots }) {
  const provider = PROVIDERS.find((p) => p.id === 'opentable')!
  const day = slots.date?.split(',')[0] ?? 'Saturday'
  const time = slots.time ?? '7:30 PM'
  const party = slots.party ?? 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.94, filter: 'blur(10px)' }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.55, ease: EASE },
      }}
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)', transition: { duration: 0.2 } }}
      className="overflow-hidden rounded-[26px] px-5 pt-4.5 pb-5 shadow-[0_24px_50px_-22px_rgba(14,12,17,0.55)]"
      style={{
        background:
          'radial-gradient(130% 120% at 28% 0%, #262130 0%, #17141b 58%, #0e0c11 100%)',
      }}
    >
      {/* Provider + confirmation code */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white">
            <img
              src={provider.icon}
              alt=""
              draggable={false}
              className="size-4 object-contain"
            />
          </span>
          <span className="text-[12.5px] font-medium text-white/80">OpenTable</span>
        </span>
        <span className="text-[11.5px] tracking-[0.06em] text-white/40">#VLT-8127</span>
      </div>

      {/* The reservation */}
      <div className="mt-4 flex flex-col gap-1">
        <p className="text-[16px] font-semibold tracking-[-0.01em] text-white">{place}</p>
        <p className="text-[12.5px] text-white/55">
          {day} &middot; {time} &middot; {party} guests
        </p>
      </div>

      {/* Live-activity track: booked → seated */}
      <div className="mt-4.5 flex flex-col gap-2">
        <div className="relative h-[3px] w-full rounded-full bg-white/[0.12]">
          <div className="absolute inset-y-0 left-0 w-[24%] rounded-full bg-emerald-400/90" />
          <motion.span
            className="absolute top-1/2 left-[24%] size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]"
            animate={{ scale: [1, 1.35, 1], opacity: [1, 0.75, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="absolute top-1/2 right-0 size-[5px] -translate-y-1/2 rounded-full bg-white/25" />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-emerald-300">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12.5 10 17.5 19 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Confirmed
          </span>
          <span className="text-white/45">
            Table at {time} &middot; free to cancel until 5 PM
          </span>
        </div>
      </div>
    </motion.div>
  )
}
