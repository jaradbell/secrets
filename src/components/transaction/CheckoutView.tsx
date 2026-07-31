/**
 * 2D — Checkout. "Get reservation" slides a full confirmation screen up over
 * the details sheet. The screen is provider-forward: an OpenTable-tinted
 * wash and eyebrow own the top, the place embeds directly into the surface
 * (photo dissolving into the page, no card), and every selection + the go
 * action carry the provider's brand color — you're transacting *through*
 * OpenTable. The voice dock keeps floating above it (z-40), so spoken
 * follow-ups fill the same slots the controls edit.
 */
import { motion } from 'framer-motion'
import { PROVIDER_RESULTS, PROVIDERS } from './data'
import { useReservationFlow } from './reservationFlow'

const TIME_OPTIONS = [
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
]
const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** Horizontally scrolling option row — bleeds to the frame edges so long
    lists read as scrollable, with fixed-size chips instead of squeezed
    flex-1 cells. */
function OptionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
      <div className="flex w-max gap-2">{children}</div>
    </div>
  )
}

export function CheckoutView() {
  const flow = useReservationFlow()
  if (!flow) return null

  const booking = flow.stage === 'booking'
  const ready = !!flow.slots.time && !!flow.slots.party
  const place =
    PROVIDER_RESULTS.yelp.find((r) => r.place.name === flow.place)?.place ??
    PROVIDER_RESULTS.yelp[0].place
  const provider = PROVIDERS.find((p) => p.id === 'opentable')!
  const brand = provider.starColor

  const chipClass = (selected: boolean) =>
    `h-11 shrink-0 rounded-[14px] px-4 text-[13px] font-medium whitespace-nowrap outline-none transition-colors duration-150 ${
      selected ? 'text-white' : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
    }`

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 z-[34] flex flex-col overflow-hidden bg-[#fcfcfc]"
    >
      {/* Brand wash — the provider's color owns the top of the surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[240px]"
        style={{
          background: `linear-gradient(to bottom, color-mix(in srgb, ${brand} 13%, transparent), color-mix(in srgb, ${brand} 5%, transparent) 45%, transparent 100%)`,
        }}
      />

      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-[calc(var(--safe-top)+12px)] pb-[calc(var(--safe-bottom)+170px)]"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Provider lockup — the brand owns the top of the screen, no
            explanatory eyebrow. */}
        <div className="flex items-center justify-between">
          <img
            src={provider.icon}
            alt="OpenTable"
            draggable={false}
            className="size-12 rounded-full shadow-[0_8px_22px_-8px_rgba(20,16,26,0.35)]"
          />
          <button
            type="button"
            aria-label="Close checkout"
            onClick={() => flow.dismiss()}
            className="flex size-9 items-center justify-center rounded-full bg-white/70 shadow-[0_4px_14px_-6px_rgba(20,16,26,0.3)] outline-none backdrop-blur-[6px] transition-colors duration-150 active:bg-white"
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

        {/* Place — embedded in the surface, no photo, no card: just the
            lockup sitting on the brand wash. */}
        <div className="mt-9 flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{place.name}</h1>
          <p className="text-[13px] text-ink-secondary">
            {place.cuisine} &middot; {place.price} &middot; Healdsburg, CA
          </p>
        </div>

        {/* Date — defaults to the ask ("Saturday"); speaking a different day
            to the orb rewrites it. */}
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-[12px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            Date
          </span>
          <div className="flex h-12 items-center justify-between rounded-[16px] bg-black/[0.04] px-4">
            <span className="text-[14px] font-medium text-ink">
              {flow.slots.date ?? 'Saturday, Jul 25'}
            </span>
            <span className="text-[12px] text-ink-tertiary">
              {flow.slots.date ? 'Updated' : 'From your ask'}
            </span>
          </div>
        </div>

        {/* Time — scrolls horizontally; selection takes the brand color. */}
        <div className="mt-5 flex flex-col gap-2">
          <span className="text-[12px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            Time
          </span>
          <OptionRow>
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                disabled={booking}
                onClick={() => flow.fillSlots({ time: t })}
                className={chipClass(flow.slots.time === t)}
                style={flow.slots.time === t ? { background: brand } : undefined}
              >
                {t}
              </button>
            ))}
          </OptionRow>
        </div>

        {/* Party — same scrolling treatment, seats up to 12. */}
        <div className="mt-5 flex flex-col gap-2">
          <span className="text-[12px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            Party size
          </span>
          <OptionRow>
            {PARTY_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={booking}
                onClick={() => flow.fillSlots({ party: n })}
                className={`${chipClass(flow.slots.party === n)} w-14 px-0 text-center`}
                style={flow.slots.party === n ? { background: brand } : undefined}
              >
                {n}
              </button>
            ))}
          </OptionRow>
        </div>

        {/* The go — plain action copy; the provider reinforcement lives in
            the eyebrow right above it. */}
        <div className="mt-7 flex flex-col gap-3">
          <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-ink-tertiary">
            <img src={provider.icon} alt="" draggable={false} className="size-3.5" />
            Booked with OpenTable &middot; free to cancel until 5 PM
          </div>
          <button
            type="button"
            disabled={!ready || booking}
            onClick={() => flow.confirm()}
            className={`flex h-[52px] items-center justify-center rounded-full text-[15px] font-semibold outline-none transition-all duration-200 ${
              ready || booking ? 'text-white active:brightness-95' : 'text-ink-tertiary'
            }`}
            style={{
              background: booking
                ? `color-mix(in srgb, ${brand} 82%, black)`
                : ready
                  ? brand
                  : 'rgba(0,0,0,0.05)',
            }}
          >
            {booking
              ? 'Confirming\u2026'
              : ready
                ? 'Confirm reservation'
                : 'Choose a time and party size'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
