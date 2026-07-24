/**
 * Full-frame place details, morphed open from the compact result card.
 * Nothing crossfades — that's what kept flashing. The sheet stays fully
 * opaque and clip-path-reveals from the tapped card's exact bounds (App
 * Store style), while the photo animates its real geometry (position, size,
 * radius) at full opacity from the card thumb's rect to the hero.
 * Contents: hero with a dark frosted base, title/rating/match score, action
 * chips, an AI summary card, a "worth ordering" strip, and the reviews
 * breakdown. Figma: node 2953:106748.
 */
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { RankedResult } from './data'
import { useReservationFlow } from '../transaction/reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const
const OPEN_S = 0.5
const CLOSE_S = 0.4
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const

const HERO_H = 376

/** Ink fades in just behind the expanding clip so the sheet never pops. */
const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, delay: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

/** Where the morph starts: the tapped card (as insets from the device-frame
    edges), its photo thumb's rect, and the frame width for the hero's final
    size — all measured at tap time, relative to the device frame. */
export type MorphOrigin = {
  card: { top: number; right: number; bottom: number; left: number }
  thumb: { top: number; left: number; width: number; height: number }
  frameWidth: number
}

function StarRow({
  size,
  filled,
  total = 5,
  filledSrc,
  emptySrc,
  gap,
}: {
  size: number
  filled: number
  total?: number
  filledSrc: string
  emptySrc: string
  gap: number
}) {
  return (
    <div className="flex items-center" style={{ gap }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <img
          key={i}
          src={i < filled ? filledSrc : emptySrc}
          alt=""
          draggable={false}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  )
}

/** Blue gradient progress ring with the 0–100 fit score. */
function MatchScore() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative size-10">
        <img
          src="/details/ring-outer.svg"
          alt=""
          draggable={false}
          className="absolute inset-[-10%] block size-[120%] max-w-none"
        />
        <img
          src="/details/ring-inner.svg"
          alt=""
          draggable={false}
          className="absolute inset-[-10%] block size-[120%] max-w-none"
        />
        <p className="absolute inset-0 flex items-center justify-center text-[18px] leading-none text-white/95">
          88
        </p>
      </div>
      <p className="mt-2.5 text-[12px] font-medium tracking-[0.005em] text-white">Match Score</p>
    </div>
  )
}

const CHIP_ACTIONS = ['Order online', 'Call', 'Website']

/** Presses shorter than this are taps; longer simulate spoken context. */
const HOLD_MS = 450

/**
 * "Get reservation" is a natural-language input, not a button: tapping it is
 * the bare intent (the agent must follow up for time & party), while
 * press-and-holding simulates speaking the full context ("dinner for 2 at
 * 7:30 PM") — both funnel into the same reservation flow.
 */
function GetReservationChip({ place }: { place: string }) {
  const flow = useReservationFlow()
  const pressedAt = useRef(0)

  const release = () => {
    if (!flow || !pressedAt.current) return
    const held = Date.now() - pressedAt.current > HOLD_MS
    pressedAt.current = 0
    if (held) flow.begin({ time: '7:30 PM', party: 2 }, place)
    else flow.begin({}, place)
  }

  return (
    <button
      type="button"
      onPointerDown={() => {
        pressedAt.current = Date.now()
      }}
      onPointerUp={release}
      onPointerCancel={() => {
        pressedAt.current = 0
      }}
      className="flex h-11 shrink-0 items-center rounded-full border border-[#d8dce0] bg-white py-2.5 pl-3.5 pr-4 text-[14px] leading-[18px] text-[#0a0a0a] outline-none transition-transform duration-200 ease-out active:scale-[0.97] touch-none select-none"
    >
      Get reservation
    </button>
  )
}

const RATING_BARS: { label: string; width: number }[] = [
  { label: '5', width: 134 },
  { label: '4', width: 149 },
  { label: '3', width: 40 },
  { label: '2', width: 12 },
  { label: '1', width: 5 },
]

const REVIEWS: {
  name: string
  avatar: string
  when: string
  stars: number
  photos: number
  text: string
}[] = [
  {
    name: 'Enzo Santi',
    avatar: '/details/avatar-1.png',
    when: '2 days ago',
    stars: 4,
    photos: 2,
    text: 'Likely our new date-night spot. Cozy room, polished-but-warm service, and French classics done right. The bread + butter is dangerous, sauces are ridiculous, and the dessert menu is mandatory. Portions felt satisfying without being heavy.',
  },
  {
    name: 'Maya R.',
    avatar: '/details/avatar-2.png',
    when: '4 days ago',
    stars: 5,
    photos: 0,
    text: 'Everything tasted intentional. Onion soup hit the nostalgic notes, steak frites were perfectly crisp, and the staff timed courses like pros. Save room for the crème brûlée—crackly top, silky center. Feels special without being stuffy.',
  },
  {
    name: 'Chris T.',
    avatar: '/details/avatar-2.png',
    when: '2 weeks ago',
    stars: 4,
    photos: 1,
    text: 'Food is excellent, but the wait was tough even with a reservation.',
  },
]

export function PlaceDetailsView({
  result,
  origin,
  onClose,
}: {
  result: RankedResult
  origin: MorphOrigin
  onClose: () => void
}) {
  const { place, rating, reviews } = result
  const reviewLabel = reviews >= 1000 ? `${Math.round(reviews / 100) / 10}k` : `${reviews}`

  // While this sheet is open, spoken intents from the resting orb attach to
  // this place (holding the orb here means "book *this* one").
  const setFocusedPlace = useReservationFlow()?.setFocusedPlace
  useEffect(() => {
    setFocusedPlace?.(place.name)
    return () => setFocusedPlace?.(null)
  }, [setFocusedPlace, place.name])

  const { card, thumb } = origin
  const originClip = `inset(${card.top}px ${card.right}px ${card.bottom}px ${card.left}px round 32px)`
  const thumbFrame = {
    x: thumb.left,
    y: thumb.top,
    width: thumb.width,
    height: thumb.height,
    borderRadius: 15,
  }
  const heroFrame = { x: 0, y: 0, width: origin.frameWidth, height: HERO_H, borderRadius: 0 }

  return (
    <motion.div
      className="absolute inset-0 z-30 overflow-hidden bg-[#fcfcfc]"
      initial={{ clipPath: originClip, opacity: 1 }}
      animate={{ clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }}
      // Closing: the clip eases back to the card bounds (arriving right at
      // unmount, not early), and the sheet fades in the last stretch so the
      // real card's content resolves underneath instead of popping in.
      exit={{
        clipPath: originClip,
        opacity: 0,
        transition: {
          clipPath: { duration: CLOSE_S, ease: CLOSE_EASE },
          opacity: { duration: 0.14, delay: 0.26 },
        },
      }}
      transition={{ duration: OPEN_S, ease: EASE }}
    >
      <div className="h-full overflow-y-auto overscroll-contain">
        {/* Hero — the card photo grows into a full-bleed header. Its real
            geometry animates (no crossfade), so the pixels stay solid: the
            object-cover crop widens as the box travels from thumb to hero. */}
        <div className="relative h-[376px] w-full shrink-0">
          <motion.img
            src={place.image}
            alt={place.name}
            draggable={false}
            className="absolute left-0 top-0 object-cover"
            initial={thumbFrame}
            animate={heroFrame}
            exit={{
              ...thumbFrame,
              transition: { duration: CLOSE_S, ease: CLOSE_EASE },
            }}
            transition={{ duration: OPEN_S, ease: EASE }}
          />

          <motion.div {...FADE} className="absolute inset-0">
            {/* Frosted base: blur ramps in toward the bottom, under a fade
                to near-black so the title block reads. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                maskImage: 'linear-gradient(to bottom, transparent 30%, black 78%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 30%, black 78%)',
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(34,22,12,0) 34%, rgba(34,22,12,0.62) 74%, #22160c 100%)',
              }}
            />

            {/* Back */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to results"
              className="absolute left-[22px] flex size-12 items-center justify-center rounded-full border border-white bg-[rgba(250,250,250,0.9)] shadow-[0px_2px_40px_0px_rgba(0,0,0,0.1)] outline-none backdrop-blur-[12px] transition-transform duration-200 ease-out active:scale-95"
              style={{ top: 'calc(var(--safe-top) + 16px)' }}
            >
              <img src="/details/chevron-left.svg" alt="" draggable={false} className="size-5" />
            </button>

            {/* Title block + match score */}
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between">
              <div>
                <p className="text-[24px] font-medium leading-[1.1] text-white">{place.name}</p>
                <p className="mt-1 text-[14px] leading-[18px] text-white/60">
                  {place.cuisine} • {place.price}
                </p>
                <div className="mt-1.5 flex items-center gap-[5px]">
                  <StarRow
                    size={12}
                    gap={1}
                    filled={Math.floor(rating)}
                    filledSrc="/details/star-hero-fill.svg"
                    emptySrc="/details/star-hero-dim.svg"
                  />
                  <p className="text-[12px] leading-4 font-medium tracking-[0.005em] text-white">
                    {rating} <span className="font-normal text-white/40">({reviewLabel})</span>
                  </p>
                </div>
              </div>
              <MatchScore />
            </div>
          </motion.div>
        </div>

        <motion.div {...FADE}>
          {/* Action chips — lead action in brand blue, rest quiet pills. */}
          <div
            className="mt-[18px] w-full overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="flex w-max items-center gap-2 px-5">
              <button
                type="button"
                className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#124efd] py-2.5 pl-1.5 pr-3.5 outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
              >
                <span className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-white bg-white">
                  <img
                    src="/details/directions-map.png"
                    alt=""
                    draggable={false}
                    className="h-4 w-auto"
                  />
                </span>
                <span className="text-[14px] leading-[18px] text-white">Directions</span>
              </button>
              <GetReservationChip place={place.name} />
              {CHIP_ACTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="flex h-11 shrink-0 items-center rounded-full border border-[#d8dce0] bg-white py-2.5 pl-3.5 pr-4 text-[14px] leading-[18px] text-[#0a0a0a] outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* AI summary */}
          <div className="mx-5 mt-[26px] flex flex-col gap-2.5 rounded-[24px] bg-[#f5f5f5] p-4">
            <p className="text-[14px] leading-[22px] text-[#171717]">
              {place.name} is <span className="font-bold">likely a date-night favorite</span>{' '}
              &mdash; guests rave about the cozy bistro vibe, polished-but-warm service, and
              well-executed classics (think rich sauces, great bread, and desserts worth saving
              room for). Portions feel satisfying, and it&rsquo;s a go-to when you want
              &ldquo;special&rdquo; without feeling stuffy.
            </p>
            <button
              type="button"
              className="flex h-10 w-full items-center gap-3 rounded-[32px] border border-white/20 bg-white/60 py-3 pl-4 pr-2.5 shadow-[0px_8px_42px_0px_rgba(0,0,0,0.1)] outline-none backdrop-blur-[10px] transition-transform duration-200 ease-out active:scale-[0.98]"
            >
              <img src="/details/magic-icon.svg" alt="" draggable={false} className="size-4" />
              <span className="flex-1 truncate text-left text-[14px] font-medium leading-4 text-[#0a0a0a]">
                View all reviews
              </span>
              {/* The export is the bare 4.7×8.2 vector — center it at natural
                  scale inside the 14px icon box instead of stretching it. */}
              <span className="flex size-3.5 items-center justify-center">
                <img
                  src="/details/chevron-right.svg"
                  alt=""
                  draggable={false}
                  className="h-[8.2px] w-auto"
                />
              </span>
            </button>
          </div>

          {/* What's worth ordering */}
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-[5px]">
              <p className="text-[22px] font-medium leading-7 text-[#0a0a0a]">
                What&rsquo;s worth ordering
              </p>
              <p className="text-[14px] leading-[22px] text-[#171717]">
                A quick look at what stands out in the review
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[180px] w-[140px] shrink-0 rounded-[24px] bg-[#e2e1da]"
                />
              ))}
            </div>
          </div>

          {/* What are people saying? Extra bottom padding clears the voice
              dock floating over the sheet. */}
          <div
            className="flex flex-col gap-6 p-6 pt-2"
            style={{ paddingBottom: 'calc(var(--safe-bottom) + 160px)' }}
          >
            <p className="text-[22px] font-medium leading-7 text-[#0a0a0a]">
              What are people saying?
            </p>

            <div className="flex items-center justify-between">
              <div className="flex flex-col items-start gap-2">
                <p className="text-[32px] font-bold leading-10 tracking-[0.005em] text-[#171717]">
                  4.5
                </p>
                <StarRow
                  size={18}
                  gap={4}
                  filled={4}
                  filledSrc="/details/star-big-fill.svg"
                  emptySrc="/details/star-big-half.svg"
                />
                <p className="text-[12px] font-medium leading-[1.3] text-[#171717]">
                  Based on 532 review
                </p>
              </div>
              <div className="flex w-[194px] flex-col">
                {RATING_BARS.map((bar) => (
                  <div key={bar.label} className="flex items-center gap-2">
                    <p className="w-4 text-center text-[10px] font-medium leading-[18px] tracking-[0.05em] text-[#171717]">
                      {bar.label}
                    </p>
                    <div className="relative h-1 w-40 rounded-[4px] bg-[#efefef]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-[4px] bg-[#171717]"
                        style={{ width: bar.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              {REVIEWS.map((review) => (
                <div
                  key={review.name + review.when}
                  className="flex flex-col gap-4 border-t border-black/5 bg-white/50 py-4"
                >
                  {review.photos > 0 && (
                    <div className="flex gap-4">
                      {Array.from({ length: review.photos }, (_, i) => (
                        <div key={i} className="size-20 rounded-[8px] bg-[#d9d9d9]" />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                    <StarRow
                      size={14}
                      gap={3}
                      filled={review.stars}
                      filledSrc="/details/star-sm-fill.svg"
                      emptySrc="/details/star-sm-empty.svg"
                    />
                    <p className="text-[13px] leading-4 text-[rgba(10,10,10,0.8)]">
                      {review.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 py-[5px]">
                    <img
                      src={review.avatar}
                      alt=""
                      draggable={false}
                      className="size-8 rounded-full object-cover"
                    />
                    <div className="flex flex-col justify-center">
                      <p className="text-[14px] font-medium leading-5 text-[#0a0a0a]">
                        {review.name}
                      </p>
                      <p className="text-[12px] font-medium leading-[14px] text-[rgba(10,10,10,0.33)]">
                        {review.when}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fixed scrim behind the voice dock — solid through the dock and its
          support text, easing out above, so the label never collides with
          content scrolled beneath. */}
      <motion.div
        {...FADE}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[210px]"
        style={{
          background:
            'linear-gradient(to top, #fcfcfc 0%, #fcfcfc 45%, rgba(252,252,252,0.62) 68%, rgba(252,252,252,0) 100%)',
        }}
      />
    </motion.div>
  )
}
