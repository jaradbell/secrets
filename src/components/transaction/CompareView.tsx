/**
 * Compare — the map + list surface behind the thread's "Compare restaurants"
 * affordance (Figma node 3054:81439). The whole view clip-morphs open from
 * the pill (the details grammar), revealing a full-bleed neighborhood map
 * with provider-branded rating pins, and a results sheet that detents at
 * three heights:
 *
 *   docked — the map owns the screen; the sheet keeps just its grabber,
 *            provider chips, and filter row alive along the bottom.
 *   half   — the resting state: map above, scannable results below.
 *   full   — the sheet takes the screen (radius squares off, safe-top
 *            padding arrives) and the list becomes scrollable.
 *
 * The provider chips are the SAME state as the thread's — toggling Yelp /
 * Google / OpenTable here re-ranks the rows and rewrites every map pin, and
 * the thread's stack is already on the new provider when you morph back.
 * Tapping a row hands off to the existing PlaceDetailsView morph.
 */
import { Squircle } from '@squircle-js/react'
import {
  motion,
  useAnimationControls,
  useDragControls,
  useMotionValue,
} from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  EXTRA_RESULTS,
  PROVIDERS,
  PROVIDER_RESULTS,
  type ProviderId,
  type RankedResult,
} from './data'
import { MatchChip, matchFill, matchLook, RankChip, useMatchStyle } from './MatchRing'
import { Stars } from './PlaceCardStack'
import { useReservationFlow } from './reservationFlow'
import { ProviderChips } from './TransactionView'

const EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const
const SPRING = { type: 'spring', stiffness: 340, damping: 36 } as const

/** Where the morph starts: the Compare pill's insets from the frame edges. */
export type CompareOrigin = { top: number; right: number; bottom: number; left: number }

type Detent = 'docked' | 'half' | 'full'

/** Sheet height kept visible while docked — grabber + chips + filters. */
const DOCK_VISIBLE = 164

/** Five-pointed star path in a 20×20 box (matches the card stack's). */
const STAR =
  'M10 1.6l2.47 5.4 5.9.64-4.38 4.01 1.2 5.82L10 14.52l-5.19 2.95 1.2-5.82L1.63 7.64l5.9-.64z'

/** Pin spots as fractions of the frame, placed over downtown Healdsburg on
    the real basemap and kept above the half detent's sheet edge. */
const PIN_POS: Record<string, { x: number; y: number }> = {
  valette: { x: 0.56, y: 0.36 },
  barndiva: { x: 0.7, y: 0.43 },
  bravas: { x: 0.44, y: 0.22 },
  chalkboard: { x: 0.76, y: 0.29 },
}

const DISTANCES: Record<string, string> = {
  valette: '0.4 mi',
  barndiva: '0.6 mi',
  bravas: '1.1 mi',
  chalkboard: '0.8 mi',
  singlethread: '0.3 mi',
  willis: '0.5 mi',
  campofina: '0.7 mi',
}

/** The two live sorts. Best match is the assistant's ordering (per-place
    match scores, provider-independent); Top Rated is the provider's own
    ranking, so it rewrites when the chips flip. Either chip toggles off,
    landing on the default: provider order, star-rating POIs. */
type SortId = 'match' | 'rating'
type Sort = SortId | null
const SORTS: { id: SortId; label: string }[] = [
  { id: 'match', label: 'Best match' },
  { id: 'rating', label: 'Top Rated' },
]
const FILTERS = ['Open Now', 'Cuisine', 'Price']

/**
 * Real basemap — downtown Healdsburg, stitched from Carto's light tiles and
 * committed at /map/healdsburg.png (regenerate with scripts/map-stitch.mjs).
 * The image matches the frame's 393×852 proportions, so cover = no drift
 * between the pins and their streets.
 */
function StreetMap() {
  return (
    <>
      <img
        src="/map/healdsburg.png"
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

/** POI on the map. Sorted by Best match, it's our chip with the place's
    0–100 score — same number as the list rows, and a direct parallel to the
    rating pill grammar: white pill = the provider's number, ink pill = ours.
    The rank/gradient match styles swap it for a circle carrying the standing
    (1, 2, 3…), solid ramp-blue under the gradient style. Sorted by Top
    Rated, it's the provider's white rating pill, and the provider's #1 goes
    ink. */
function MapPin({
  result,
  rank,
  provider,
  starColor,
  sort,
  lead,
  selected,
  onSelect,
}: {
  result: RankedResult
  /** The place's 1-based standing by match score. */
  rank: number
  provider: ProviderId
  starColor: string
  sort: Sort
  lead: boolean
  selected: boolean
  onSelect: () => void
}) {
  const matchStyle = useMatchStyle()
  const pos = PIN_POS[result.place.id]
  if (!pos) return null
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none"
      style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, zIndex: selected ? 3 : lead ? 2 : 1 }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: selected ? 1.12 : 1 }}
      transition={SPRING}
    >
      {sort === 'match' ? (
        <motion.span
          key="match"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {matchStyle === 'score' ? (
            <MatchChip
              score={result.place.match}
              look={lead ? 'ink' : 'white'}
              className="px-2.5 py-[7px] text-[11.5px] leading-none shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
            />
          ) : matchStyle === 'number-chip' ? (
            /* 7E: a white pill with real anatomy — the rank seated in its
               own ink circle (transit-badge style) so the two numbers never
               run together, the percentage beside it, and a hairline ring
               to hold the edge over busy streets. */
            <span className="flex items-center gap-[5px] rounded-full bg-white p-[3px] pr-[9px] shadow-[0_4px_16px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.05]">
              <span className="flex size-[19px] items-center justify-center rounded-full bg-ink text-[10.5px] font-semibold leading-none text-white">
                {rank}
              </span>
              <span className="text-[11.5px] font-semibold leading-none text-ink">
                {result.place.match}%
              </span>
            </span>
          ) : (
            <RankChip
              rank={rank}
              look={lead ? 'ink' : 'white'}
              fill={matchStyle === 'gradient' ? matchFill(result.place.match) : undefined}
              className="text-[12.5px] leading-none shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
            />
          )}
        </motion.span>
      ) : (
        <motion.span
          key="rating"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className={`flex items-center gap-1 rounded-full px-2.5 py-[7px] shadow-[0_4px_16px_rgba(0,0,0,0.16)] ${
            lead ? 'bg-ink' : 'bg-white'
          }`}
        >
          <svg width="11" height="11" viewBox="0 0 20 20" fill={starColor} aria-hidden="true">
            <path d={STAR} />
          </svg>
          {/* Rating rewrites when the provider flips — a quick resolve, not a hard swap. */}
          <motion.span
            key={provider}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={`text-[11.5px] font-semibold leading-none ${lead ? 'text-white' : 'text-ink'}`}
          >
            {result.rating}{' '}
            <span className={lead ? 'font-normal text-white/55' : 'font-normal text-ink-tertiary'}>
              ({result.reviews >= 1000 ? `${Math.round(result.reviews / 100) / 10}k` : result.reviews})
            </span>
          </motion.span>
        </motion.span>
      )}
      {selected && (
        <motion.span
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 rounded-full bg-white/90 px-2 py-[3px] text-[10.5px] font-medium text-ink shadow-[0_2px_10px_rgba(0,0,0,0.12)] backdrop-blur-[4px]"
        >
          {result.place.name.replace(/ Restaurant$/, '')}
        </motion.span>
      )}
    </motion.button>
  )
}

/** Filter row under the chips — sliders icon, the two sort chips (the
    active one goes ink), then the quiet dummy filters. */
function FilterRow({ sort, onSort }: { sort: Sort; onSort: (s: SortId) => void }) {
  return (
    <div className="-mx-5 mt-3 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
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

export function CompareView({
  origin,
  provider,
  onSelectProvider,
  onClose,
  onOpenPlace,
}: {
  origin: CompareOrigin
  provider: ProviderId
  onSelectProvider: (id: ProviderId) => void
  onClose: () => void
  /** Hands a tapped row to the details morph — card + thumb elements give
      the overlay its origin geometry. */
  onOpenPlace: (result: RankedResult, card: Element, thumb: Element) => void
}) {
  const results = PROVIDER_RESULTS[provider]
  const starColor = PROVIDERS.find((p) => p.id === provider)!.starColor
  const matchStyle = useMatchStyle()

  // While the compare surface is up the orb stays live, but its resting
  // "Hold or tap to speak" hint stands down — the map is the moment.
  const setHintSuppressed = useReservationFlow()?.setHintSuppressed
  useEffect(() => {
    setHintSuppressed?.(true)
    return () => setHintSuppressed?.(false)
  }, [setHintSuppressed])

  // The surface opens in the assistant's ordering; re-tapping the active
  // chip toggles it off, back to the provider's order and rating POIs.
  // The list carries the shared four plus the compare-only extras.
  const listResults = [...results, ...EXTRA_RESULTS[provider]]
  const [sort, setSort] = useState<Sort>('match')
  const toggleSort = (id: SortId) => setSort((s) => (s === id ? null : id))
  const byMatch = [...listResults].sort((a, b) => b.place.match - a.place.match)
  const rows = sort === 'match' ? byMatch : listResults
  /** 1-based match rank per place — what the map's rank markers carry. */
  const matchRank = new Map(byMatch.map((r, i) => [r.place.id, i + 1]))

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
  // the overlay's clip is still blooming open from the Compare pill.
  useEffect(() => {
    if (!frameH) return
    y.set(frameH)
    sheet.start({ y: detentY('half'), transition: { duration: 0.55, ease: EASE } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameH])

  const settle = (d: Detent) => {
    setDetent(d)
    sheet.start({ y: detentY(d), transition: SPRING })
  }

  // Guards row taps: a drag released over a row would also fire its click.
  const draggingRef = useRef(false)

  const onDragEnd = (_: unknown, info: { velocity: { y: number } }) => {
    requestAnimationFrame(() => {
      draggingRef.current = false
    })
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
        {results.map((r, i) => (
          <MapPin
            key={r.place.id}
            result={r}
            rank={matchRank.get(r.place.id) ?? 0}
            provider={provider}
            starColor={starColor}
            sort={sort}
            lead={sort === 'match' ? matchRank.get(r.place.id) === 1 : i === 0}
            selected={selectedPin === r.place.id}
            onSelect={() => setSelectedPin((s) => (s === r.place.id ? null : r.place.id))}
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

      {/* Back — morphs the whole surface back into the Compare pill. */}
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
          onDragStart={() => {
            draggingRef.current = true
          }}
          onDragEnd={onDragEnd}
        >
          <motion.div
            className="flex h-full select-none flex-col overflow-hidden bg-white"
            animate={{
              borderTopLeftRadius: full ? 0 : 28,
              borderTopRightRadius: full ? 0 : 28,
            }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{ boxShadow: '0 -12px 44px rgba(0,0,0,0.14)' }}
          >
            {/* Header — always the drag handle. */}
            <div
              data-compare-handle
              onPointerDown={(e) => dragControls.start(e)}
              className="shrink-0 cursor-grab px-5 active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              {/* Safe-top spacer arrives only at the full detent. */}
              <motion.div
                animate={{ height: full ? 34 : 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              />
              <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-black/15" />
              <div className="mt-3.5">
                <ProviderChips active={provider} onSelect={onSelectProvider} />
              </div>
              <FilterRow sort={sort} onSort={toggleSort} />
            </div>

            {/* Results — scrolls only at full; otherwise dragging anywhere
                on the list moves the sheet between detents. */}
            <div
              onPointerDown={(e) => {
                if (!full) dragControls.start(e)
              }}
              className={`mt-1 min-h-0 flex-1 px-5 ${full ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'}`}
              style={{
                scrollbarWidth: 'none',
                touchAction: full ? 'pan-y' : 'none',
                paddingBottom: 'calc(var(--safe-bottom) + 150px)',
              }}
            >
              {rows.map((r) => (
                <motion.button
                  layout="position"
                  key={r.place.id}
                  type="button"
                  onClick={(e) => {
                    if (draggingRef.current) return
                    const thumb = e.currentTarget.querySelector('[data-compare-thumb]')
                    if (thumb) onOpenPlace(r, e.currentTarget, thumb)
                  }}
                  transition={SPRING}
                  className="flex w-full items-center gap-3.5 border-b border-black/5 py-3.5 text-left outline-none last:border-b-0"
                >
                  <span className="relative shrink-0">
                    <Squircle asChild cornerRadius={15} cornerSmoothing={1}>
                      <img
                        data-compare-thumb
                        src={r.place.image}
                        alt={r.place.name}
                        draggable={false}
                        className="h-[76px] w-[76px] object-cover"
                      />
                    </Squircle>
                    {/* 7D: the standing rides the photo — a corner badge
                        notched over the squircle, tied to the Best match
                        lens like the rail. The lead goes ink, the rest
                        white, same as the map pins. */}
                    {matchStyle === 'photo-rank' && (
                      <motion.span
                        initial={false}
                        animate={
                          sort === 'match'
                            ? { opacity: 1, scale: 1 }
                            : { opacity: 0, scale: 0.5 }
                        }
                        transition={{ duration: 0.25, ease: EASE }}
                        className={`absolute -left-1.5 -top-1.5 flex size-[23px] items-center justify-center rounded-full text-[11.5px] font-semibold leading-none shadow-[0_2px_8px_rgba(0,0,0,0.18)] ring-2 ring-white ${
                          matchRank.get(r.place.id) === 1
                            ? 'bg-ink text-white'
                            : 'bg-white text-ink'
                        }`}
                      >
                        {matchRank.get(r.place.id) ?? 0}
                      </motion.span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink">
                      {r.place.name}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-secondary">
                      {r.place.cuisine} • {DISTANCES[r.place.id]} • {r.place.price}
                    </p>
                    <motion.div
                      key={provider}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="mt-1.5 flex items-center gap-1.5"
                    >
                      <Stars rating={r.rating} color={starColor} />
                      <span className="text-[12px] font-semibold text-ink">{r.rating}</span>
                      <span className="text-[12px] text-ink-tertiary">
                        ({r.reviews.toLocaleString()})
                      </span>
                    </motion.div>
                  </div>
                  {/* Right rail: the score chip, tied to the Best match
                      lens — it rides in as the rows reorder (the animation
                      is what explains the number) and collapses away when
                      the sort toggles off, leaving the provider's stars as
                      the row's only rating. Graded by its own tier, so the
                      column reads as a hierarchy. Rank/gradient styles trade
                      the score pill for the standing circle — same one the
                      map pins carry; number-chip captions that circle with
                      a quiet percentage (icon-plus-label, nothing heavy).
                      Photo-rank retires the rail (the badge on the thumb
                      carries the standing). */}
                  {matchStyle !== 'photo-rank' && (
                    <motion.span
                      className="flex shrink-0 items-center justify-center overflow-hidden"
                      initial={false}
                      animate={
                        sort === 'match'
                          ? { width: 40, marginLeft: 0, opacity: 1, scale: 1 }
                          : { width: 0, marginLeft: -14, opacity: 0, scale: 0.6 }
                      }
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      {matchStyle === 'score' ? (
                        <MatchChip
                          score={r.place.match}
                          className="w-10 shrink-0 py-[7px] text-[12px] leading-none"
                        />
                      ) : matchStyle === 'number-chip' ? (
                        <span className="flex shrink-0 flex-col items-center gap-[5px]">
                          <span className="flex size-[22px] items-center justify-center rounded-full bg-ink text-[11px] font-semibold leading-none text-white">
                            {matchRank.get(r.place.id) ?? 0}
                          </span>
                          <span className="text-[10px] font-medium leading-none text-ink-tertiary">
                            {r.place.match}%
                          </span>
                        </span>
                      ) : (
                        <RankChip
                          rank={matchRank.get(r.place.id) ?? 0}
                          look={matchLook(r.place.match)}
                          fill={matchStyle === 'gradient' ? matchFill(r.place.match) : undefined}
                          size={30}
                          className="text-[12.5px] leading-none"
                        />
                      )}
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Fixed scrim behind the voice dock — solid through the dock and its
          support text, easing out above, so list rows dissolve before they
          reach the orb instead of colliding with it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[164px]"
        style={{
          background:
            'linear-gradient(to top, #ffffff 0%, #ffffff 40%, rgba(255,255,255,0.62) 66%, rgba(255,255,255,0) 100%)',
        }}
      />
    </motion.div>
  )
}
