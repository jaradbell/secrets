/**
 * BrandGoo — a tappable constellation of connectable-brand marks in
 * LogoGoo's liquid language: ink discs carrying white logos, merging
 * through the same goo filter.
 *
 * At rest the marks sit as a loose constellation. Tapping one focuses it:
 * the mark swells to the center while the others sink into it through the
 * goo (the absorb move from LogoGoo's cycle). Tapping the focused mark
 * releases everything back to the constellation. The host reads `focused`
 * to swap its prompts to that brand's domain.
 */
import { motion } from 'framer-motion'

export type GooBrand = { id: string; name: string; logo: string }

const INK = '#141118'

/** Design-space canvas. */
const W = 200
const H = 96

/** Where a focused mark swells to. */
const FOCUS = { x: 100, y: 48, r: 32 }

/** Rest poses — index-matched to the brands prop (up to four marks). */
const REST = [
  { x: 34, y: 40, r: 21 },
  { x: 86, y: 58, r: 26 },
  { x: 136, y: 34, r: 23 },
  { x: 176, y: 62, r: 18 },
]

const SPRING = { type: 'spring', stiffness: 280, damping: 26 } as const

/** Pose deltas for one mark given the current focus. */
function poseFor(i: number, id: string, focused: string | null) {
  const rest = REST[i]
  if (focused === null) return { x: 0, y: 0, scale: 1, logo: 1 }
  const dx = FOCUS.x - rest.x
  const dy = FOCUS.y - rest.y
  return focused === id
    ? { x: dx, y: dy, scale: FOCUS.r / rest.r, logo: 1 }
    : // Absorbed: travel to the focused mark's center and dissolve into it.
      { x: dx, y: dy, scale: 0.06, logo: 0 }
}

export function BrandGoo({
  brands,
  focused,
  onFocus,
}: {
  brands: GooBrand[]
  focused: string | null
  /** Tap a mark to focus it; tap the focused mark to release (null). */
  onFocus: (id: string | null) => void
}) {
  return (
    <div className="relative" style={{ width: W, height: H }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="brand-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
            />
          </filter>
        </defs>
      </svg>

      {/* Ink layer — discs neck and merge through the goo as they absorb. */}
      <div className="absolute inset-0" style={{ filter: 'url(#brand-goo)' }}>
        {brands.map((b, i) => {
          const rest = REST[i]
          const pose = poseFor(i, b.id, focused)
          return (
            <motion.span
              key={b.id}
              className="absolute rounded-full"
              style={{
                left: rest.x - rest.r,
                top: rest.y - rest.r,
                width: rest.r * 2,
                height: rest.r * 2,
                background: INK,
              }}
              animate={{ x: pose.x, y: pose.y, scale: pose.scale }}
              transition={SPRING}
            />
          )
        })}
      </div>

      {/* Logos ride above the goo, locked to their discs. */}
      {brands.map((b, i) => {
        const rest = REST[i]
        const w = rest.r * 0.95
        const pose = poseFor(i, b.id, focused)
        return (
          <motion.img
            key={b.id}
            src={b.logo}
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: rest.x - w / 2, top: rest.y - w / 2, width: w, height: w }}
            animate={{ x: pose.x, y: pose.y, scale: pose.scale, opacity: pose.logo }}
            transition={SPRING}
          />
        )
      })}

      {/* Hit layer — transparent targets riding the same poses. Absorbed
          marks go pointer-inert so their targets (parked under the focused
          mark) can't steal its release tap. */}
      {brands.map((b, i) => {
        const rest = REST[i]
        const hit = Math.max(44, rest.r * 2)
        const pose = poseFor(i, b.id, focused)
        const isFocused = focused === b.id
        const isAbsorbed = focused !== null && !isFocused
        return (
          <motion.button
            key={b.id}
            type="button"
            aria-label={isFocused ? `Back to all apps` : `${b.name} ideas`}
            aria-pressed={isFocused}
            onClick={() => onFocus(isFocused ? null : b.id)}
            className="absolute cursor-pointer rounded-full outline-none"
            style={{
              left: rest.x - hit / 2,
              top: rest.y - hit / 2,
              width: hit,
              height: hit,
              pointerEvents: isAbsorbed ? 'none' : 'auto',
            }}
            animate={{ x: pose.x, y: pose.y, scale: pose.scale }}
            transition={SPRING}
          />
        )
      })}
    </div>
  )
}
