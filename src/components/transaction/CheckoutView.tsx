/**
 * 2D — Checkout. "Get reservation" slides a full confirmation screen up over
 * the details sheet. The screen is provider-forward: an OpenTable-tinted
 * wash and eyebrow own the top, the place embeds directly into the surface
 * (photo dissolving into the page, no card), and every selection + the go
 * action carry the provider's brand color — you're transacting *through*
 * OpenTable. The voice dock keeps floating above it (z-40), so spoken
 * follow-ups fill the same slots the controls edit.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { AmbientShaderBackground } from '../shared/AmbientShaderBackground'
import { PROVIDER_RESULTS, PROVIDERS } from './data'
import { useReservationFlow } from './reservationFlow'

/** The ask's own day — selected until the user changes it. */
const ASK_DATE = 'Saturday, Jul 25'
/** The prototype's calendar anchor: 2026 seats Jul 25 on a Saturday.
    Days before the ask are gone; the picker starts here. */
const MIN_DATE = new Date(2026, 6, 25)

/** A picked day, written in the same grammar the voice path uses
    ("Saturday, Jul 25") — one slot, two doors. */
function dateLabel(d: Date) {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
  const rest = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${weekday}, ${rest}`
}

/** White mixed toward a hex at `amt` — keeps the mesh palette scrim-quiet. */
function tint(hex: string, amt: number): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => (255 * (1 - amt) + c * amt) / 255
  return [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)]
}

/** The brand wash as a living palette: white base plus pale tints of the
    provider color, interleaved with a warm peach neighbor so the blooms
    mesh into each other instead of reading as one flat pink. */
function meshPalette(brand: string): [number, number, number][] {
  return [
    [1, 1, 1],
    tint(brand, 0.22),
    tint('#E8703D', 0.14),
    tint(brand, 0.14),
    tint(brand, 0.08),
    tint('#E8703D', 0.14),
  ]
}

export const TIME_OPTIONS = [
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
export const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** The map under the place lockup — a real basemap of downtown
    Healdsburg (pre-stitched Carto/OSM tiles, see scripts/build-checkout-map.mjs;
    all four seeded restaurants live within these blocks), with the
    provider-colored pin at the place and the address riding the map as
    a chip. */
function MiniMap({ brand, address }: { brand: string; address: string }) {
  return (
    <div className="relative h-[136px] overflow-hidden rounded-[18px] ring-1 ring-black/[0.06]">
      <img
        src="/places/valette-map.png"
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-cover"
      />
      {/* pin — tip planted at the map's center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[86%]">
        <svg width="30" height="39" viewBox="0 0 30 39" aria-hidden="true">
          <ellipse cx="15" cy="35.6" rx="6.4" ry="2.2" fill="rgba(20,16,28,0.2)" />
          <path
            d="M15 1.4C7.9 1.4 2.2 7.1 2.2 14.1c0 9.4 12.8 21.5 12.8 21.5s12.8-12.1 12.8-21.5C27.8 7.1 22.1 1.4 15 1.4z"
            fill={brand}
            stroke="#ffffff"
            strokeWidth="2.2"
          />
          <circle cx="15" cy="13.8" r="4.3" fill="#ffffff" />
        </svg>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-white/85 py-1.5 pr-3 pl-2.5 text-[11px] font-medium text-ink shadow-[0_4px_14px_-6px_rgba(20,16,28,0.35)] backdrop-blur-[6px]">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-ink-secondary"
        >
          <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        {address}
      </div>
      <span className="absolute right-2 bottom-1.5 text-[8px] font-medium text-black/30">
        &copy; OpenStreetMap
      </span>
    </div>
  )
}

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

/** The month grid inside the date sheet — July and August of the
    prototype's year, days before the ask disabled. A picked day writes
    the slot in the voice path's grammar and the sheet slides away.
    (Exported: 2C's draft card raises the same calendar for its Date row.) */
export function CalendarPicker({
  selected,
  brand,
  disabled,
  onPick,
}: {
  selected: string
  brand: string
  disabled: boolean
  onPick: (label: string) => void
}) {
  // 6 = July 2026, the ask's month; August is the one page beyond.
  const [month, setMonth] = useState(6)
  const first = new Date(2026, month, 1)
  const offset = first.getDay()
  const days = new Date(2026, month + 1, 0).getDate()
  const title = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const arrowClass = (enabled: boolean) =>
    `flex size-8 items-center justify-center rounded-full outline-none transition-colors duration-150 ${
      enabled ? 'text-ink active:bg-black/[0.06]' : 'text-ink/20'
    }`

  return (
    <div className="px-1 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">{title}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={month <= 6}
            onClick={() => setMonth(6)}
            className={arrowClass(month > 6)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={month >= 7}
            onClick={() => setMonth(7)}
            className={arrowClass(month < 7)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span
            key={`${d}-${i}`}
            className="flex h-7 items-center justify-center text-[10.5px] font-semibold tracking-[0.04em] text-ink-tertiary"
          >
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(2026, month, i + 1)
          const gone = date < MIN_DATE
          const isSelected = dateLabel(date) === selected
          return (
            <button
              key={i + 1}
              type="button"
              disabled={gone || disabled}
              onClick={() => onPick(dateLabel(date))}
              className={`mx-auto flex size-9 items-center justify-center rounded-full text-[13px] font-medium outline-none transition-colors duration-150 ${
                isSelected
                  ? 'text-white'
                  : gone
                    ? 'text-ink/25'
                    : 'text-ink active:bg-black/[0.06]'
              }`}
              style={isSelected ? { background: brand } : undefined}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CheckoutView({
  onClose,
}: {
  /** Overrides the X. 2D's checkout IS the flow, so closing aborts it
      (default); 2C opens this sheet over a draft that lives in the thread —
      its X just tucks the sheet away and the draft carries on. */
  onClose?: () => void
} = {}) {
  const flow = useReservationFlow()
  const [dateOpen, setDateOpen] = useState(false)
  if (!flow) return null

  const booking = flow.stage === 'booking'
  const ready = !!flow.slots.time && !!flow.slots.party
  const place =
    PROVIDER_RESULTS.yelp.find((r) => r.place.name === flow.place)?.place ??
    PROVIDER_RESULTS.yelp[0].place
  const provider = PROVIDERS.find((p) => p.id === 'opentable')!
  const brand = provider.starColor
  // The provider's own numbers — this screen transacts through
  // OpenTable, so its rating is the one that belongs here.
  const ranked = PROVIDER_RESULTS.opentable.find((r) => r.place.id === place.id)
  const selectedDate = flow.slots.date ?? ASK_DATE

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
      {/* Brand wash — the provider's color owns the top of the surface.
          The linear tint paints first (and is the graceful no-WebGL
          fallback); the living brand mesh fades in over it once the
          sheet's slide has landed, masked so it dissolves into the page
          the same way the flat wash does. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[240px]"
        style={{
          background: `linear-gradient(to bottom, color-mix(in srgb, ${brand} 13%, transparent), color-mix(in srgb, ${brand} 5%, transparent) 45%, transparent 100%)`,
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[240px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
        style={{
          maskImage: 'linear-gradient(to bottom, black 0%, black 25%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 25%, transparent 100%)',
        }}
      >
        <AmbientShaderBackground veil={false} palette={meshPalette(brand)} />
      </motion.div>

      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-[calc(var(--safe-top)+12px)] pb-[calc(var(--safe-bottom)+170px)]"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Provider lockup — small mark left, close right: matched 36px
            circles anchoring each corner, so the asymmetry reads as
            intentional chrome instead of an off-axis centerpiece. */}
        <div className="flex h-9 items-center justify-between">
          <img
            src={provider.icon}
            alt="OpenTable"
            draggable={false}
            className="size-9 rounded-full shadow-[0_4px_14px_-6px_rgba(20,16,26,0.35)]"
          />
          <button
            type="button"
            aria-label="Close checkout"
            onClick={() => (onClose ?? flow.dismiss)()}
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

        {/* Place — a tight lockup: photo thumbnail beside the name, meta
            and the provider's rating stacked under it, then the map
            carrying the address. */}
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <img
              src={place.image}
              alt=""
              draggable={false}
              className="size-[60px] shrink-0 rounded-[16px] object-cover shadow-[0_10px_24px_-10px_rgba(20,16,28,0.4)]"
            />
            <div className="flex min-w-0 flex-col gap-[3px]">
              <h1 className="truncate text-[19px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                {place.name}
              </h1>
              <p className="text-[12.5px] text-ink-secondary">
                {place.cuisine} &middot; {place.price}
              </p>
              {ranked && (
                <p className="flex items-center gap-1.5 text-[12.5px] text-ink-secondary">
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"
                      fill={brand}
                    />
                  </svg>
                  <span className="font-medium text-ink">{ranked.rating}</span>
                  {ranked.reviews.toLocaleString()} reviews
                </p>
              )}
            </div>
          </div>
          <MiniMap brand={brand} address={place.address} />
        </div>

        {/* Date — the quiet row from the ask, but tappable: it raises
            the calendar sheet. Speaking a different day to the orb
            rewrites the same slot. */}
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-[12px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            Date
          </span>
          <button
            type="button"
            aria-expanded={dateOpen}
            disabled={booking}
            onClick={() => setDateOpen(true)}
            className="flex h-12 items-center justify-between rounded-[16px] bg-black/[0.04] px-4 outline-none transition-colors duration-150 active:bg-black/[0.07]"
          >
            <span className="text-[14px] font-medium text-ink">{selectedDate}</span>
            <span className="flex items-center gap-2 text-[12px] text-ink-tertiary">
              {flow.slots.date ? 'Updated' : 'From your ask'}
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 9l7 7 7-7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
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

      {/* The date sheet — the calendar rides up from the frame's foot
          over its own scrim. The orb keeps floating above (the sheet's
          deep footer padding is its clearance), so a spoken day still
          lands while the grid is up. */}
      <AnimatePresence>
        {dateOpen && (
          <>
            <motion.div
              key="date-scrim"
              className="absolute inset-0 z-20 bg-[rgba(20,16,28,0.28)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              onClick={() => setDateOpen(false)}
            />
            <motion.div
              key="date-sheet"
              role="dialog"
              aria-label="Choose a date"
              className="absolute inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-[#fcfcfc] px-5 pt-3 shadow-[0_-24px_70px_-24px_rgba(20,16,28,0.45)]"
              style={{ paddingBottom: 'calc(var(--safe-bottom) + 184px)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            >
              <div aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-black/12" />
              <p className="mt-4 px-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                Choose a date
              </p>
              <div className="mt-2">
                <CalendarPicker
                  selected={selectedDate}
                  brand={brand}
                  disabled={booking}
                  onPick={(label) => {
                    flow.fillSlots({ date: label })
                    setDateOpen(false)
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
