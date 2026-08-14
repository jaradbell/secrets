/**
 * Stay card (Figma node 2377:73083) and its conversation stack.
 *
 * The card is the list-result object for rentals and hotels: the listing
 * photo as an 80px rounded tile, the marketplace-grammar headline ("Home
 * in Los Angeles"), the spec line (bedrooms • beds • bathrooms), and a
 * footer split between the trip total ("$3,400 for 4 nights") and the
 * star rating with its review count. A save-heart floats top right.
 *
 * StayCardStack reuses FlightTicketStack's deck grammar (rear cards settle
 * downward, soft-focused; flick to page, tap to select) so stays read as
 * the same suggested-object class — only the card body changes.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import type { Stay } from './staysData'

/** Fixed card height — the deck positions rear cards absolutely, so the
    card's anatomy is set (not content-grown): 80px photo + 13px padding. */
export const STAY_H = 106

/** Five 11px stars — the design fills to the floor of the rating and dims
    the rest (the dim glyph is the fill at 27% opacity, per Figma). */
function Stars({ rating }: { rating: number }) {
  const filled = Math.floor(rating)
  return (
    <span className="flex items-center gap-px">
      {Array.from({ length: 5 }, (_, i) => (
        <img
          key={i}
          src={i < filled ? '/stays/star-fill.svg' : '/stays/star-dim.svg'}
          alt=""
          draggable={false}
          className="size-[11px]"
        />
      ))}
    </span>
  )
}

export function StayCard({
  stay,
  muted = false,
  flat = false,
}: {
  stay: Stay
  /** Rear-of-deck treatment: the shell stays, the printing fades. */
  muted?: boolean
  /** List-row treatment: the card shell drops — same anatomy printed
      straight on the canvas, rows split by hairlines. */
  flat?: boolean
}) {
  return (
    <div
      className={
        flat
          ? 'flex w-full items-center gap-4 py-4'
          : 'flex w-full items-center gap-4 rounded-[32px] bg-white px-4'
      }
      style={{
        height: flat ? undefined : STAY_H,
        boxShadow: flat
          ? undefined
          : muted
            ? '0px 6px 20px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)'
            : '0px 11px 20px rgba(0,0,0,0.1)',
      }}
    >
      <div
        className="flex w-full items-center gap-4 transition-opacity duration-300"
        style={{ opacity: muted ? 0 : 1 }}
      >
        <img
          src={stay.photo}
          alt=""
          draggable={false}
          className="size-20 shrink-0 rounded-[24px] object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Headline + save. */}
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[14px] leading-[18px] font-medium text-[#0a0a0a]">
              {stay.title}
            </p>
            <img
              src="/stays/heart.svg"
              alt="Save"
              draggable={false}
              className="mt-px w-[17px] shrink-0"
            />
          </div>
          {/* Spec line. */}
          <p className="mt-0.5 truncate text-[12px] leading-[18px] text-[#717375]">
            {stay.specs}
          </p>
          {/* Trip total against the rating. */}
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[11px] leading-4 font-medium tracking-[0.055px] whitespace-nowrap text-[#0a0a0a]">
              ${stay.price.toLocaleString()}{' '}
              <span className="font-normal text-[rgba(10,10,10,0.4)]">
                for {stay.nights} nights
              </span>
            </p>
            <span className="flex items-center gap-[5px]">
              <Stars rating={stay.rating} />
              <p className="text-[11px] leading-4 font-medium tracking-[0.055px] whitespace-nowrap text-[#0a0a0a]">
                {stay.rating}{' '}
                <span className="font-normal text-[rgba(10,10,10,0.4)]">
                  ({stay.reviews})
                </span>
              </p>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Downward recession per depth — same grammar as FlightTicketStack. */
const PEEK = [0, 20, 36]
const DEPTH = PEEK.length - 1

export function StayCardStack({
  stays,
  onSelect,
}: {
  stays: Stay[]
  /** Tap on the front card (flick still pages). */
  onSelect?: (stay: Stay) => void
}) {
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const n = stays.length

  // Guards tap-to-advance: a flick released over the card also fires onTap.
  const draggingRef = useRef(false)

  const advance = () => setCurrent((c) => (c + 1) % n)
  const retreat = () => setCurrent((c) => (c - 1 + n) % n)

  return (
    <div
      className="relative w-full"
      style={{ height: STAY_H + PEEK[Math.min(DEPTH, n - 1)] }}
      role="group"
      aria-roledescription="carousel"
      aria-label="Stay options"
    >
      {stays.map((s, i) => {
        const depth = (i - current + n) % n
        if (depth > DEPTH) return null
        const isFront = depth === 0
        return (
          <motion.div
            key={s.id}
            className="absolute inset-x-0 top-0"
            style={{ zIndex: n - depth }}
            initial={reduced ? { opacity: 0 } : { y: -40, opacity: 0 }}
            animate={{
              y: reduced ? 0 : PEEK[depth],
              x: 0,
              scale: reduced || isFront ? 1 : 1 - depth * 0.045,
              opacity: 1 - depth * 0.06,
            }}
            transition={
              reduced ? { duration: 0.25 } : { type: 'spring', stiffness: 300, damping: 28 }
            }
            drag={isFront && !reduced ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragStart={() => {
              draggingRef.current = true
            }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40 || info.velocity.x < -380) advance()
              else if (info.offset.x > 40 || info.velocity.x > 380) retreat()
              requestAnimationFrame(() => {
                draggingRef.current = false
              })
            }}
            onTap={() => {
              if (!isFront || draggingRef.current) return
              if (onSelect) onSelect(s)
              else advance()
            }}
          >
            <div
              data-stay-card={s.id}
              className={isFront ? 'cursor-grab active:cursor-grabbing' : undefined}
              style={{
                filter:
                  reduced || isFront ? 'none' : `blur(${Math.min(depth * 1.2, 3)}px)`,
                transition: 'filter 0.35s ease',
                touchAction: 'none',
              }}
            >
              <StayCard stay={s} muted={!isFront} />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
