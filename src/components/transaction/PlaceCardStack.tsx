/**
 * Wallet-style swipe deck for ranked place results, with the thrive card
 * treatment: frosted white glass over ambient color blooms, film grain, a lit
 * top edge, and a diagonal sheen. Rear cards fade, soft-focus, and tilt so
 * the stack recedes into the background instead of casting hard shadows.
 * Flick the front card up to advance, down to go back; tap also advances.
 */
import { Squircle } from '@squircle-js/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import type { RankedResult } from './data'

const CARD_H = 110

/** Downward recession per depth — rear cards settle behind the front card,
    which stays tight under the provider chips. */
const PEEK = [0, 20, 36, 48]
const DEPTH = PEEK.length - 1

/** Radial tint with a smooth (smoothstep-like) falloff. A plain
    `color → transparent` gradient fades linearly and then stops — the
    slope discontinuity at the last stop reads as a faint ring around each
    bloom (a Mach band; the eye amplifies it into a visible boundary).
    Easing the alpha through several stops lands the fade at zero slope,
    exactly at the ellipse's edge. */
function bloom(rgb: string, alpha: number, size: string, pos: string) {
  const stop = (k: number, at: number) =>
    `rgba(${rgb},${Math.round(alpha * k * 1000) / 1000}) ${at}%`
  return `radial-gradient(${size} at ${pos}, ${[
    stop(1, 0),
    stop(0.78, 43),
    stop(0.5, 64),
    stop(0.22, 80),
    stop(0.06, 90),
    stop(0.015, 96),
    stop(0, 100),
  ].join(', ')})`
}

/** Tiling fractal-noise film grain, inlined so it costs no network fetch. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

/** Five-pointed star path in a 20×20 box. */
const STAR =
  'M10 1.6l2.47 5.4 5.9.64-4.38 4.01 1.2 5.82L10 14.52l-5.19 2.95 1.2-5.82L1.63 7.64l5.9-.64z'

/** Provider-branded rating: filled stars in the brand color over gray bases. */
export function Stars({ rating, color }: { rating: number; color: string }) {
  const row = (fill: string) => (
    <div className="flex gap-[2px]">
      {Array.from({ length: 5 }, (_, i) => (
        // shrink-0: inside the percent-width clip wrapper the flex row gets
        // narrower than its content; without it the stars compress to fit
        // (squished, misaligned with the gray bases) instead of clipping.
        <svg
          key={i}
          width="13"
          height="13"
          viewBox="0 0 20 20"
          fill={fill}
          aria-hidden="true"
          className="shrink-0"
        >
          <path d={STAR} />
        </svg>
      ))}
    </div>
  )
  return (
    <div className="relative" role="img" aria-label={`${rating} stars`}>
      {row('rgba(0,0,0,0.16)')}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${(rating / 5) * 100}%` }}
      >
        {row(color)}
      </div>
    </div>
  )
}

/** Frosted-glass place card (thrive treatment). */
function PlaceCard({
  result,
  starColor,
  depth,
}: {
  result: RankedResult
  starColor: string
  /** 0 = front card; higher = deeper in the stack. */
  depth: number
}) {
  const { place, rating, reviews } = result
  const muted = depth > 0
  return (
    // True Figma-style squircle (32px radius, 100% smoothing): an outer
    // squircle painted in the hairline color, inset 1px, with the card body
    // clipped to an inner squircle. No border-radius does the final clipping.
    <Squircle
      cornerRadius={32}
      cornerSmoothing={1}
      className="w-full"
      style={{
        height: CARD_H,
        padding: 1,
        // Rear cards get a faint dark hairline so their silhouette reads
        // against the light canvas.
        background: muted ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.19)',
      }}
    >
      <Squircle
        cornerRadius={31}
        cornerSmoothing={1}
        // backdrop-blur only on the front card: rear cards sit under a
        // depth-of-field blur() filter, and a backdrop-filter anywhere
        // inside a filtered ancestor smears blurred backdrop across the
        // ancestor's whole rectangular filter region (a ghost sheet with
        // visible edges). Rear fills are near-solid, so nothing is lost.
        className={`relative h-full w-full ${muted ? '' : 'backdrop-blur-[28px]'}`}
        style={{
          // backdrop-filter ignores the squircle mask (it clips to the
          // border box only), so without a real radius the blurred backdrop
          // paints square corners past the card's silhouette.
          borderRadius: 31,
          // The front card reads as near-solid white; resting cards are
          // frostier — they recede into the ambient color behind the stack,
          // which the heavy soft-focus blur turns into atmosphere.
          // Resting cards are close to solid so they read as material slabs
          // on the quiet canvas rather than depending on backdrop color.
          background: muted ? 'rgba(252,251,252,0.8)' : 'rgba(255,255,255,0.6)',
          // Lit top edge — glass reads through its edges.
          boxShadow: muted
            ? 'inset 0 1px 0 rgba(255,255,255,0.7)'
            : 'inset 0 1px 0 rgba(255,255,255,0.65)',
        }}
      >
      {/* Diagonal light sweep across the surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(118deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 42%)',
        }}
      />

      <div
        className="relative flex h-full items-center gap-3.5 p-4 transition-opacity duration-300"
        style={{ opacity: muted ? 0 : 1 }}
      >
        {/* Concentric with the card's squircle: 32 outer − 17 inset
            (1px ring + 16px padding) = 15. The details overlay measures this
            rect so its hero photo can fly open from the thumb's exact bounds. */}
        <Squircle asChild cornerRadius={15} cornerSmoothing={1}>
          <img
            data-place-thumb={place.id}
            src={place.image}
            alt={place.name}
            draggable={false}
            className="h-[76px] w-[76px] shrink-0 object-cover"
          />
        </Squircle>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink">
              {place.name}
            </p>
            {/* Save (heart) — decorative for now. */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(0,0,0,0.22)"
              strokeWidth="2"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <path d="M12 21s-7.5-4.7-10-9.3C.5 8 2.6 4.5 6.2 4.5c2.2 0 3.7 1.2 4.6 2.6l1.2 1.8 1.2-1.8c.9-1.4 2.4-2.6 4.6-2.6 3.6 0 5.7 3.5 4.2 7.2C19.5 16.3 12 21 12 21z" />
            </svg>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-ink-secondary">
            {place.cuisine} • {place.price}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Stars rating={rating} color={starColor} />
            <span className="text-[12px] font-semibold text-ink">{rating}</span>
            <span className="text-[12px] text-ink-tertiary">({reviews.toLocaleString()})</span>
          </div>
        </div>
      </div>

        {/* Film grain over everything — makes the frost feel like material. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: GRAIN, mixBlendMode: 'overlay', opacity: 0.3 }}
        />
      </Squircle>
    </Squircle>
  )
}

export function PlaceCardStack({
  results,
  starColor,
  onSelect,
  ambient = true,
}: {
  results: RankedResult[]
  starColor: string
  /** Tap on the front card drills into that place (flick still pages). */
  onSelect?: (result: RankedResult) => void
  /** The color wash behind the glass. Turn it off where the canvas
      already carries color (the draft floor's mesh) — its blurred layer
      clips at the element bounds and reads as a faint rectangle there. */
  ambient?: boolean
}) {
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const n = results.length

  // Guards tap-to-advance: a flick released over the card also fires onTap,
  // which would double-advance. Cleared a frame after the drag ends so the
  // in-flight tap sees it.
  const draggingRef = useRef(false)

  const advance = () => setCurrent((c) => (c + 1) % n)
  const retreat = () => setCurrent((c) => (c - 1 + n) % n)

  return (
    <div
      className="relative w-full"
      style={{ height: CARD_H + PEEK[Math.min(DEPTH, n - 1)] }}
      role="group"
      aria-roledescription="carousel"
      aria-label="Ranked places"
    >
      {/* Ambient color behind the glass — kept quiet, just enough that the
          frost doesn't read as flat gray. The stack's depth comes from the
          cards' own material (fill, hairline, soft shadow), not from color. */}
      {/* The wash box is much bigger than the stack so every bloom can
          dissolve over ~100px of open canvas. Tints that die within a few
          px of the card silhouette read as a capsule/boundary hugging the
          stack, no matter how smooth the falloff is. Each ellipse's full
          extent stays inside this box, so nothing clips into a straight
          edge at the element bounds. */}
      {ambient && (
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: '-88px -100px',
          background: [
            bloom('141,159,166', 0.22, '40% 36%', '40% 60%'),
            bloom('122,103,208', 0.17, '40% 36%', '60% 42%'),
            bloom('211,198,187', 0.28, '34% 30%', '52% 32%'),
          ].join(', '),
        }}
      />
      )}
      {results.map((r, i) => {
        // Depth behind the front card, wrapping so the deck cycles.
        const depth = (i - current + n) % n
        if (depth > DEPTH) return null
        const isFront = depth === 0

        // Rear cards settle downward behind the front card, scaled in just
        // enough that their rounded bottom corners stay visible, and
        // soft-focused so they recede like a shallow depth of field.
        // No tilt — short cards read tilt as error.
        return (
          <motion.div
            key={r.place.id}
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
            // Horizontal paging: flick left for the next ranked option,
            // right for the previous. Release momentum carries into the
            // spring back to x:0 while the card trades places, so the
            // swipe reads as one continuous motion.
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
              if (onSelect) onSelect(r)
              else advance()
            }}
          >
            <div
              // The details overlay measures this rect to clip open from the
              // exact card bounds.
              data-place-card={r.place.id}
              className={isFront ? 'cursor-grab active:cursor-grabbing' : undefined}
              style={{
                // box-shadow, NOT filter: drop-shadow — the card inside has
                // a backdrop-filter, and a backdrop-filter inside a filtered
                // ancestor smears blurred backdrop across the whole
                // rectangular filter region (a visible ghost sheet around
                // the card). The radius shapes the shadow to (almost) the
                // squircle silhouette; the card clips itself inside.
                borderRadius: 32,
                boxShadow: isFront
                  ? '0 18px 44px rgba(0,0,0,0.07)'
                  : '0 6px 24px rgba(0,0,0,0.05)',
                // Depth-of-field lives here (not on the motion wrapper) so
                // the front card's backdrop-blur never has a filtered
                // ancestor. `none` on the front card removes the filter
                // region entirely; CSS interpolates none <-> blur() fine.
                filter: reduced || isFront ? 'none' : `blur(${Math.min(depth * 1.2, 3)}px)`,
                transition: 'filter 0.35s ease',
                touchAction: 'none',
              }}
            >
              <PlaceCard result={r} starColor={starColor} depth={depth} />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
