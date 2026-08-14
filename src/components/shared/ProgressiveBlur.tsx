/**
 * Progressive blur scrim — the iOS-style dissolve for chrome that floats
 * over scrollable content. Stacked backdrop-filter bands, blur doubling
 * per band, each gradient-masked to bite one step deeper toward `side`,
 * so content melts smoothly into the edge instead of cutting against a
 * painted gradient. An optional `tint` wash rides on top for the chrome's
 * contrast — a whisper of surface color, not a paint-over, so whatever
 * floor is beneath (canvas or mesh) stays present through the melt.
 *
 * The caller positions and sizes the band via `className` (absolute
 * placement, height, z-index). Entrance/exit opacity animates on the
 * layers themselves, never on a wrapping ancestor — a fading ancestor
 * forms its own backdrop root and blanks the blur until the fade lands.
 * Inside an AnimatePresence subtree the layers carry the exit fade too.
 */
import { motion } from 'framer-motion'

/** Blur strength per band, weakest (content side) to strongest (edge). */
const BANDS = [0.5, 1, 2, 4, 8, 16]

export function ProgressiveBlur({
  side = 'bottom',
  tint,
  className,
}: {
  /** Which edge of the band the blur ramps toward. */
  side?: 'top' | 'bottom'
  /** Optional wash painted over the blur — a full CSS background value. */
  tint?: string
  /** Position, size, and stacking, supplied by the caller. */
  className?: string
}) {
  const toward = side === 'bottom' ? 'to bottom' : 'to top'
  return (
    <div aria-hidden className={`pointer-events-none ${className ?? ''}`}>
      {BANDS.map((blur, i) => {
        const start = (i / (BANDS.length + 1)) * 100
        const end = ((i + 2) / (BANDS.length + 1)) * 100
        const mask = `linear-gradient(${toward}, rgba(0,0,0,0) ${start}%, rgb(0,0,0) ${end}%)`
        return (
          <motion.div
            key={blur}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        )
      })}
      {tint && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ background: tint }}
        />
      )}
    </div>
  )
}
