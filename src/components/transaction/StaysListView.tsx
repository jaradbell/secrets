/**
 * Stays full results — the map + list surface behind the stays thread's
 * "View More" affordance, borrowing the places Compare grammar wholesale:
 * the surface clip-morphs open from the pill onto a full-bleed LA basemap
 * with price-pill POIs (the rentals-map grammar — the pin IS the price),
 * and a results sheet that detents at three heights:
 *
 *   docked — the map owns the screen; the sheet keeps just its grabber,
 *            marketplace chips, and filter row alive along the bottom.
 *   half   — the resting state: map above, scannable listings below.
 *   full   — the sheet takes the screen (radius squares off, safe-top
 *            padding arrives) and the list becomes scrollable.
 *
 * The marketplace chips are the SAME state as the thread's — toggling
 * Airbnb / Vrbo / Expedia here rewrites the rows and every map pin, and
 * the thread's deck is already on the new source when you morph back.
 */
import { motion, useAnimationControls, useDragControls, useMotionValue } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type UIEvent } from 'react'
import { ProgressiveBlur } from '../shared/ProgressiveBlur'
import { useReservationFlow } from './reservationFlow'
import { StayCard } from './StayCard'
import { PROVIDER_STAYS, StayChips, type Stay, type StayProviderId } from './staysData'

const EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const
const SPRING = { type: 'spring', stiffness: 340, damping: 36 } as const

/** Where the morph starts: the View More pill's insets from the frame edges. */
export type StaysListOrigin = { top: number; right: number; bottom: number; left: number }

type Detent = 'docked' | 'half' | 'full'

/** Sheet height kept visible while docked — grabber + chips + filters. */
const DOCK_VISIBLE = 164

/** Pin spots as fractions of the frame, hand-placed over the LA basemap
    (coastal listings hug the west edge — Santa Monica and Malibu sit just
    off the crop) and kept above the half detent's sheet edge. */
const PIN_POS: Record<string, { x: number; y: number }> = {
  // Airbnb
  'ab-1': { x: 0.5, y: 0.38 },
  'ab-2': { x: 0.68, y: 0.3 },
  'ab-3': { x: 0.12, y: 0.4 },
  'ab-4': { x: 0.17, y: 0.44 },
  // Vrbo
  'vr-1': { x: 0.42, y: 0.24 },
  'vr-2': { x: 0.6, y: 0.27 },
  'vr-3': { x: 0.08, y: 0.31 },
  'vr-4': { x: 0.14, y: 0.22 },
  // Expedia
  'ex-1': { x: 0.3, y: 0.34 },
  'ex-2': { x: 0.72, y: 0.42 },
  'ex-3': { x: 0.1, y: 0.42 },
  'ex-4': { x: 0.2, y: 0.37 },
}

/** The two live sorts — the assistant's ordering vs. cheapest stay first.
    Either chip toggles off, landing back on the marketplace's own order. */
type SortId = 'best' | 'cheapest'
type Sort = SortId | null
const SORTS: { id: SortId; label: string }[] = [
  { id: 'best', label: 'Best match' },
  { id: 'cheapest', label: 'Cheapest' },
]
const FILTERS = ['Entire home', 'Pool', 'Free cancellation']

/**
 * Real basemap — the LA basin from Santa Monica to Downtown, stitched from
 * Carto's light tiles and committed at /map/la.png (regenerate with
 * scripts/map-stitch-la.mjs). The image matches the frame's 393×852
 * proportions, so cover = no drift between the pins and their streets.
 */
function StreetMap() {
  return (
    <>
      <img
        src="/map/la.png"
        alt=""
        draggable={false}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <p className="absolute right-2 top-[3px] text-[8px] tracking-[0.01em] text-black/25">
        © OpenStreetMap © CARTO
      </p>
    </>
  )
}

/** POI on the map — the rentals-map grammar: the pin IS the trip total,
    a white price pill with the lead listing's gone ink. Tapping selects,
    floating the listing's name under the pill. */
function MapPin({
  stay,
  lead,
  selected,
  onSelect,
}: {
  stay: Stay
  lead: boolean
  selected: boolean
  onSelect: () => void
}) {
  const pos = PIN_POS[stay.id]
  if (!pos) return null
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none"
      style={{
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        zIndex: selected ? 3 : lead ? 2 : 1,
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: selected ? 1.12 : 1 }}
      transition={SPRING}
    >
      <span
        className={`flex items-center rounded-full px-2.5 py-[7px] shadow-[0_4px_16px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.05] ${
          lead ? 'bg-ink' : 'bg-white'
        }`}
      >
        <span
          className={`text-[11.5px] font-semibold leading-none ${lead ? 'text-white' : 'text-ink'}`}
        >
          ${stay.price.toLocaleString()}
        </span>
      </span>
      {selected && (
        <motion.span
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 rounded-full bg-white/90 px-2 py-[3px] text-[10.5px] font-medium text-ink shadow-[0_2px_10px_rgba(0,0,0,0.12)] backdrop-blur-[4px]"
        >
          {stay.title}
        </motion.span>
      )}
    </motion.button>
  )
}

/** Filter row under the chips — sliders icon, the two sort chips (the
    active one goes ink), then the quiet dummy filters. The full-bleed
    margins live on its collapse wrapper (it hides on scroll), so this row
    only carries the gutters back in. */
function FilterRow({ sort, onSort }: { sort: Sort; onSort: (s: SortId) => void }) {
  return (
    <div className="mt-3 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
      <div className="flex w-max items-center gap-2">
        <button
          type="button"
          aria-label="Filters"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-200 ease-out active:scale-95"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2.4" />
            <circle cx="8" cy="17" r="2.4" />
          </svg>
        </button>
        {SORTS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={sort === id}
            onClick={() => onSort(id)}
            className={`flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-medium whitespace-nowrap outline-none transition-[transform,background-color,color] duration-200 ease-out active:scale-[0.97] ${
              sort === id ? 'bg-ink text-white' : 'bg-black/[0.05] text-ink'
            }`}
          >
            {label}
          </button>
        ))}
        {FILTERS.map((label) => (
          <button
            key={label}
            type="button"
            className="flex h-10 shrink-0 items-center rounded-full bg-black/[0.05] px-4 text-[13px] font-medium whitespace-nowrap text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function StaysListView({
  origin,
  provider,
  onSelectProvider,
  onClose,
}: {
  origin: StaysListOrigin
  provider: StayProviderId
  onSelectProvider: (id: StayProviderId) => void
  onClose: () => void
}) {
  // While the map surface is up the orb stays live, but its resting
  // "Hold or tap to speak" hint stands down — the map is the moment.
  const setHintSuppressed = useReservationFlow()?.setHintSuppressed
  useEffect(() => {
    setHintSuppressed?.(true)
    return () => setHintSuppressed?.(false)
  }, [setHintSuppressed])

  // The surface opens in the assistant's ordering; re-tapping the active
  // chip toggles it off, back to the marketplace's own order.
  const [sort, setSort] = useState<Sort>('best')
  const toggleSort = (id: SortId) => setSort((s) => (s === id ? null : id))
  const stays = PROVIDER_STAYS[provider]
  const rows = sort === 'cheapest' ? [...stays].sort((a, b) => a.price - b.price) : stays
  const lead = rows[0]

  const rootRef = useRef<HTMLDivElement>(null)
  const [frameH, setFrameH] = useState(0)
  useLayoutEffect(() => {
    setFrameH(rootRef.current?.clientHeight ?? 0)
  }, [])

  const [detent, setDetent] = useState<Detent>('half')
  const detentY = (d: Detent) =>
    d === 'full' ? 0 : d === 'half' ? Math.round(frameH * 0.47) : Math.max(frameH - DOCK_VISIBLE, 0)

  const y = useMotionValue(0)
  const sheet = useAnimationControls()
  const dragControls = useDragControls()

  // Entry: the sheet rises from below the frame to the half detent while
  // the overlay's clip is still blooming open from the View More pill.
  useEffect(() => {
    if (!frameH) return
    y.set(frameH)
    sheet.start({ y: detentY('half'), transition: { duration: 0.55, ease: EASE } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameH])

  const settle = (d: Detent) => {
    setDetent(d)
    if (d !== 'full') setFiltersHidden(false)
    sheet.start({ y: detentY(d), transition: SPRING })
  }

  // Modern list chrome: scrolling down slides the filter row away (the
  // rows own the screen); any pull back up — or landing near the top —
  // brings it home. Direction, not position, drives it, with a small
  // deadband so momentum jitter doesn't flicker the row.
  const [filtersHidden, setFiltersHidden] = useState(false)
  const lastScrollY = useRef(0)
  const onListScroll = (e: UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop
    const dy = top - lastScrollY.current
    lastScrollY.current = top
    if (top <= 12) setFiltersHidden(false)
    else if (dy > 6) setFiltersHidden(true)
    else if (dy < -6) setFiltersHidden(false)
  }

  // The frosted header floats over the list, so the list pads itself by
  // the header's resting (filters-shown) height. Measured once on mount —
  // the pad must NOT follow the filter collapse, or the rows would jump
  // mid-scroll; the safe-top spacer is added per detent instead.
  const headerBaseRef = useRef<HTMLDivElement>(null)
  const [headerBase, setHeaderBase] = useState(132)
  useLayoutEffect(() => {
    if (headerBaseRef.current) setHeaderBase(headerBaseRef.current.offsetHeight)
  }, [])

  const onDragEnd = (_: unknown, info: { velocity: { y: number } }) => {
    // Project the release forward so a flick carries past the nearest stop.
    const projected = y.get() + info.velocity.y * 0.2
    const target = (['full', 'half', 'docked'] as Detent[]).reduce((best, d) =>
      Math.abs(detentY(d) - projected) < Math.abs(detentY(best) - projected) ? d : best,
    )
    settle(target)
  }

  const [selectedPin, setSelectedPin] = useState<string | null>(null)

  const full = detent === 'full'
  const originClip = `inset(${origin.top}px ${origin.right}px ${origin.bottom}px ${origin.left}px round 22px)`

  return (
    <motion.div
      ref={rootRef}
      className="absolute inset-0 z-[28] overflow-hidden bg-[#f7f6f3]"
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
      {/* Map — breathes slightly as the sheet leaves the docked state. */}
      <motion.div
        className="absolute inset-0"
        animate={{ scale: detent === 'docked' ? 1 : 1.03 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <StreetMap />
        {stays.map((s) => (
          <MapPin
            key={s.id}
            stay={s}
            lead={s.id === lead.id}
            selected={selectedPin === s.id}
            onSelect={() => setSelectedPin((sel) => (sel === s.id ? null : s.id))}
          />
        ))}
        {/* Soft top wash so the back button reads over busy streets. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[120px]"
          style={{
            background:
              'linear-gradient(to bottom, rgba(247,246,243,0.9), rgba(247,246,243,0))',
          }}
        />
      </motion.div>

      {/* Back — morphs the whole surface back into the View More pill. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Back to thread"
        className="absolute left-[22px] z-[2] flex size-12 items-center justify-center rounded-full border border-white bg-[rgba(250,250,250,0.9)] shadow-[0px_2px_40px_0px_rgba(0,0,0,0.1)] outline-none backdrop-blur-[12px] transition-transform duration-200 ease-out active:scale-95"
        style={{ top: 'calc(var(--safe-top) + 16px)' }}
      >
        <img src="/details/chevron-left.svg" alt="" draggable={false} className="size-5" />
      </button>

      {/* Results sheet — full-height surface translated to its detent. */}
      {frameH > 0 && (
        <motion.div
          className="absolute inset-x-0 top-0 z-[3]"
          style={{ height: frameH, y, touchAction: 'none' }}
          animate={sheet}
          drag="y"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: Math.max(frameH - DOCK_VISIBLE, 0) }}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={onDragEnd}
        >
          <motion.div
            className="relative flex h-full select-none flex-col overflow-hidden bg-white"
            animate={{
              borderTopLeftRadius: full ? 0 : 28,
              borderTopRightRadius: full ? 0 : 28,
            }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{ boxShadow: '0 -12px 44px rgba(0,0,0,0.14)' }}
          >
            {/* Header — always the drag handle. It floats OVER the list on
                a progressive blur (heavy behind the chips, melting to
                nothing below the filters), so scrolled rows frost out
                under the chrome instead of hard-cutting at its edge. */}
            <div
              data-stays-handle
              onPointerDown={(e) => dragControls.start(e)}
              className="absolute inset-x-0 top-0 z-[5] cursor-grab px-5 pb-3 active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              {/* Frosted chrome — full-strength blur through the header's
                  body, stepping off across the bottom ~44px so rows melt
                  in under the filters instead of cutting. */}
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {[
                  { blur: 4, hold: 12, gone: 0 },
                  { blur: 8, hold: 28, gone: 8 },
                  { blur: 16, hold: 44, gone: 24 },
                ].map(({ blur, hold, gone }) => {
                  const mask = `linear-gradient(to bottom, rgb(0,0,0) 0%, rgb(0,0,0) calc(100% - ${hold}px), rgba(0,0,0,0) calc(100% - ${gone}px))`
                  return (
                    <div
                      key={blur}
                      className="absolute inset-0"
                      style={{
                        backdropFilter: `blur(${blur}px)`,
                        WebkitBackdropFilter: `blur(${blur}px)`,
                        maskImage: mask,
                        WebkitMaskImage: mask,
                      }}
                    />
                  )
                })}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.86) calc(100% - 44px), rgba(255,255,255,0) 100%)',
                  }}
                />
              </div>
              <div className="relative">
                {/* Safe-top spacer arrives only at the full detent. */}
                <motion.div
                  animate={{ height: full ? 34 : 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                />
                <div ref={headerBaseRef}>
                  <div className="mx-auto pt-2.5">
                    <div className="mx-auto h-1 w-9 rounded-full bg-black/15" />
                  </div>
                  <div className="mt-3.5">
                    <StayChips active={provider} onSelect={onSelectProvider} />
                  </div>
                  {/* The filter row hides on scroll-down and rides back in
                      on scroll-up — collapsing height so the frosted zone
                      shrinks with it. Full-bleed margins live here (the
                      collapse must clip vertically, not the chips' bleed). */}
                  <motion.div
                    className="-mx-5 overflow-hidden"
                    initial={false}
                    animate={
                      filtersHidden
                        ? { height: 0, opacity: 0, y: -6 }
                        : { height: 52, opacity: 1, y: 0 }
                    }
                    transition={{ duration: 0.32, ease: EASE }}
                  >
                    <FilterRow sort={sort} onSort={toggleSort} />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Listings — scroll only at full; otherwise dragging anywhere
                on the list moves the sheet between detents. Rows slide
                under the frosted header; the pad below matches its resting
                height (plus the safe-top spacer at full). */}
            <motion.div
              onScroll={onListScroll}
              onPointerDown={(e) => {
                if (!full) dragControls.start(e)
              }}
              className={`min-h-0 flex-1 px-5 ${full ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'}`}
              animate={{ paddingTop: headerBase + 4 + (full ? 34 : 0) }}
              transition={{ duration: 0.35, ease: EASE }}
              style={{
                scrollbarWidth: 'none',
                touchAction: full ? 'pan-y' : 'none',
                paddingBottom: 'calc(var(--safe-bottom) + 150px)',
              }}
            >
              {rows.map((s, i) => (
                <motion.div layout="position" key={s.id} transition={SPRING}>
                  <StayCard stay={s} flat />
                  {i < rows.length - 1 && <div className="h-px w-full bg-black/5" />}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Fixed scrim behind the voice dock — a progressive blur, so list
          rows melt out before they reach the orb instead of fading under
          paint. */}
      <ProgressiveBlur
        className="absolute inset-x-0 bottom-0 z-[4] h-[164px]"
        tint="linear-gradient(to top, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0) 80%)"
      />
    </motion.div>
  )
}
