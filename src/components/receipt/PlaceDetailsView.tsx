/**
 * Full-frame place details, morphed open from the compact result card.
 * Nothing crossfades — that's what kept flashing. The sheet stays fully
 * opaque and clip-path-reveals from the tapped card's exact bounds (App
 * Store style), while the photo animates its real geometry (position, size,
 * radius) at full opacity from the card thumb's rect to an inset photo card.
 *
 * Property-details layout: top nav (back / title / favorite), a rounded
 * photo card carrying the title lockup + match score, then the original
 * body — AI summary card with "View all reviews," the "What's worth
 * ordering" strip, and the reviews breakdown. Place actions live in the
 * inline dock's suggestion tray (see dockSuggestions), not in the sheet.
 */
import { motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ProgressiveBlur } from '../shared/ProgressiveBlur'
import type { RankedResult } from './data'
import { useReservationFlow } from '../transaction/reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const
const OPEN_S = 0.5
const CLOSE_S = 0.4
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const

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

/** Blue gradient progress ring with the 0–100 fit score (light surface). */
function MatchScore() {
  return (
    // justify-between against the stretched row: ring tops out with the
    // title line, label bottoms out with the rating row, so the score
    // column matches the text block's height.
    <div className="flex flex-col items-center justify-between self-stretch">
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
        <p className="absolute inset-0 flex items-center justify-center text-[18px] leading-none text-ink">
          88
        </p>
      </div>
      <p className="text-[12px] leading-4 font-medium tracking-[0.005em] text-ink">Match Score</p>
    </div>
  )
}

/** Frosted dark action circle floating on the photo. */
function PhotoAction({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full bg-[rgba(20,17,20,0.5)] backdrop-blur-[8px] outline-none transition-transform duration-200 ease-out active:scale-95"
    >
      {children}
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

  // The photo's destination is the inset card in normal flow — measured
  // after first layout (relative to the scroll content, which aligns with
  // the frame at scrollTop 0) so the flight lands exactly on it.
  const contentRef = useRef<HTMLDivElement>(null)
  const photoCardRef = useRef<HTMLDivElement>(null)
  const [photoFrame, setPhotoFrame] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  useLayoutEffect(() => {
    const c = contentRef.current
    const p = photoCardRef.current
    if (!c || !p) return
    const cr = c.getBoundingClientRect()
    const pr = p.getBoundingClientRect()
    setPhotoFrame({
      x: pr.left - cr.left,
      y: pr.top - cr.top,
      width: pr.width,
      height: pr.height,
    })
  }, [])

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
        <div ref={contentRef} className="relative">
          {/* The photo — flies from the card thumb's rect to the inset photo
              card below. Positioned (z-auto) so the card's absolute overlays,
              later in the DOM, paint on top of it. */}
          <motion.img
            src={place.image}
            alt={place.name}
            draggable={false}
            className="absolute top-0 left-0 object-cover"
            initial={thumbFrame}
            animate={photoFrame ? { ...photoFrame, borderRadius: 28 } : thumbFrame}
            exit={{
              ...thumbFrame,
              transition: { duration: CLOSE_S, ease: CLOSE_EASE },
            }}
            transition={{ duration: OPEN_S, ease: EASE }}
          />

          {/* Top nav — back / title / favorite. */}
          <motion.div
            {...FADE}
            className="flex items-center justify-between px-4"
            style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to results"
              className="flex size-11 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-[0px_2px_18px_0px_rgba(0,0,0,0.07)] outline-none transition-transform duration-200 ease-out active:scale-95"
            >
              <img src="/details/chevron-left.svg" alt="" draggable={false} className="size-5" />
            </button>
            <p className="text-[16px] font-medium tracking-[-0.01em] text-ink">
              Restaurant Details
            </p>
            <button
              type="button"
              aria-label="Save place"
              className="flex size-11 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-[0px_2px_18px_0px_rgba(0,0,0,0.07)] outline-none transition-transform duration-200 ease-out active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#171717" aria-hidden="true">
                <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 5 5.9 5c2 0 3.4 1.1 4.1 2.2h4C14.7 6.1 16.1 5 18.1 5c3.5 0 5.5 3.6 3.9 6.7C19.5 16.3 12 21 12 21Z" />
              </svg>
            </button>
          </motion.div>

          {/* Photo card — the morphing image lands exactly here, clean (no
              gradient), with frosted quick actions floating on it. Its own
              background stays transparent so the photo shows through. */}
          <div
            ref={photoCardRef}
            className="relative mx-4 mt-4 h-[290px] overflow-hidden rounded-[28px]"
          >
            <motion.div
              {...FADE}
              className="absolute inset-x-4 bottom-4 flex items-center justify-end gap-2.5"
            >
              <PhotoAction label="Call">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
                </svg>
              </PhotoAction>
              <PhotoAction label="Website">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
                </svg>
              </PhotoAction>
              <PhotoAction label="Email">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
                  <path d="m3.5 7 8.5 6 8.5-6" />
                </svg>
              </PhotoAction>
            </motion.div>
          </div>

          <motion.div {...FADE}>
            {/* Lockup + match score — below the image on the light surface.
                items-stretch so the score column adopts the lockup's height. */}
            <div className="mt-5 flex items-stretch justify-between px-4">
              <div>
                <p className="text-[24px] font-medium leading-[1.1] text-ink">{place.name}</p>
                <p className="mt-1 text-[14px] leading-[18px] text-ink-secondary">
                  {place.cuisine} • {place.price}
                </p>
                <div className="mt-2 flex items-center gap-[5px]">
                  <StarRow
                    size={14}
                    gap={2}
                    filled={Math.floor(rating)}
                    filledSrc="/details/star-sm-fill.svg"
                    emptySrc="/details/star-sm-empty.svg"
                  />
                  <p className="text-[13px] leading-4 font-medium tracking-[0.005em] text-ink">
                    {rating} <span className="font-normal text-ink-tertiary">({reviewLabel})</span>
                  </p>
                </div>
              </div>
              <MatchScore />
            </div>

            {/* AI summary */}
            <div className="mx-4 mt-6 flex flex-col gap-2.5 rounded-[24px] bg-[#f5f5f5] p-4">
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
            <div className="flex flex-col gap-6 px-4 pt-7">
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
                dock and action banner floating over the sheet. */}
            <div
              className="flex flex-col gap-6 px-4 pt-7"
              style={{ paddingBottom: 'calc(var(--safe-bottom) + 216px)' }}
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
      </div>

      {/* Fixed scrim behind the voice dock — a progressive blur, so content
          melts out instead of colliding with the floating orb. The layers
          carry their own entrance fade (a fading wrapper would blank the
          backdrop blur mid-flight). */}
      <ProgressiveBlur
        className="absolute inset-x-0 bottom-0 h-[230px]"
        tint="linear-gradient(to top, rgba(252,252,252,0.75) 0%, rgba(252,252,252,0.3) 50%, rgba(252,252,252,0) 80%)"
      />

    </motion.div>
  )
}
