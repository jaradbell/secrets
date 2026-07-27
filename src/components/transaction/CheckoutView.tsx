/**
 * 2D — Checkout. "Get reservation" slides a full confirmation screen up over
 * the details sheet: editable time / party, a place summary, and one big
 * Book action. The voice dock keeps floating above it (z-40), so spoken
 * follow-ups fill the same slots the controls edit.
 */
import { motion } from 'framer-motion'
import { PROVIDER_RESULTS, PROVIDERS } from './data'
import { useReservationFlow } from './reservationFlow'

const TIME_OPTIONS = ['6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM']
const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6]

export function CheckoutView() {
  const flow = useReservationFlow()
  if (!flow) return null

  const booking = flow.stage === 'booking'
  const ready = !!flow.slots.time && !!flow.slots.party
  const place =
    PROVIDER_RESULTS.yelp.find((r) => r.place.name === flow.place)?.place ??
    PROVIDER_RESULTS.yelp[0].place
  const opentable = PROVIDERS.find((p) => p.id === 'opentable')!

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 z-[34] flex flex-col overflow-hidden bg-[#fcfcfc]"
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-[calc(var(--safe-top)+12px)] pb-[calc(var(--safe-bottom)+170px)]"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
            Confirm &amp; book
          </h1>
          <button
            type="button"
            aria-label="Close checkout"
            onClick={() => flow.dismiss()}
            className="flex size-9 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-colors duration-150 active:bg-black/[0.1]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
                stroke="#4a4a4a"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Place summary */}
        <div className="mt-5 flex items-center gap-3.5 rounded-[22px] border border-black/[0.06] bg-white p-3.5 shadow-[0_14px_36px_-18px_rgba(20,16,26,0.22)]">
          <img
            src={place.image}
            alt=""
            draggable={false}
            className="size-16 rounded-[16px] object-cover"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold text-ink">{place.name}</span>
            <span className="truncate text-[12px] text-ink-secondary">
              {place.cuisine} &middot; {place.price}
            </span>
            <span className="text-[12px] text-ink-tertiary">Healdsburg, CA</span>
          </div>
        </div>

        {/* Date — fixed in this prototype; the ask was "Saturday". */}
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-[12px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            Date
          </span>
          <div className="flex h-12 items-center justify-between rounded-[16px] bg-black/[0.04] px-4">
            <span className="text-[14px] font-medium text-ink">Saturday, Jul 25</span>
            <span className="text-[12px] text-ink-tertiary">From your ask</span>
          </div>
        </div>

        {/* Time */}
        <div className="mt-5 flex flex-col gap-2">
          <span className="text-[12px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            Time
          </span>
          <div className="flex gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                disabled={booking}
                onClick={() => flow.fillSlots({ time: t })}
                className={`h-11 flex-1 rounded-[14px] text-[12.5px] font-medium whitespace-nowrap outline-none transition-colors duration-150 ${
                  flow.slots.time === t
                    ? 'bg-ink text-white'
                    : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Party */}
        <div className="mt-5 flex flex-col gap-2">
          <span className="text-[12px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            Party size
          </span>
          <div className="flex gap-2">
            {PARTY_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={booking}
                onClick={() => flow.fillSlots({ party: n })}
                className={`flex h-11 flex-1 items-center justify-center rounded-[14px] text-[13px] font-medium outline-none transition-colors duration-150 ${
                  flow.slots.party === n
                    ? 'bg-ink text-white'
                    : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Attribution + the go */}
        <div className="mt-7 flex flex-col gap-3">
          <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-ink-tertiary">
            <img src={opentable.icon} alt="" draggable={false} className="size-3.5" />
            Booked through OpenTable &middot; free to cancel until 5 PM
          </div>
          <button
            type="button"
            disabled={!ready || booking}
            onClick={() => flow.confirm()}
            className={`flex h-[52px] items-center justify-center rounded-full text-[15px] font-semibold outline-none transition-colors duration-200 ${
              booking
                ? 'bg-ink/80 text-white/80'
                : ready
                  ? 'bg-ink text-white active:bg-ink/85'
                  : 'bg-black/[0.06] text-ink-tertiary'
            }`}
          >
            {booking
              ? 'Booking\u2026'
              : ready
                ? `Book ${flow.slots.time} for ${flow.slots.party}`
                : 'Choose a time and party size'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
