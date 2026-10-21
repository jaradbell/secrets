/**
 * BottomGlow — Gemini's living response gradient (60fps shot
 * google-gemini-response-gradient-animation), relocated to the dock.
 *
 * While a hold has the floor, three large soft color blobs breathe along
 * the frame's bottom edge, each on its own slow color journey (blue →
 * violet → green → amber territory) with a gentle positional drift. The
 * shot's grain exactly: slow, ease-in-out, no springs — an ambient
 * "alive while you talk" state, not a flourish.
 *
 * It renders BENEATH the focus veil, so the frost's backdrop blur
 * diffuses the blobs into one organic wash — the liquid blur does the
 * blending, the blobs just carry color. Honors prefers-reduced-motion by
 * holding a static wash.
 */
import { motion } from 'framer-motion'

/** Each blob's color journey — staggered palettes so the wash never sits
    on one hue, after the shot's blue → green → amber drift. */
const JOURNEYS: string[][] = [
  ['#4a63f0', '#7a5cd8', '#35a86e', '#e8a05c', '#4a63f0'],
  ['#8b5fd6', '#3b86de', '#d95f80', '#58b88a', '#8b5fd6'],
  ['#35a86e', '#e8a05c', '#5b7bf0', '#b65fd6', '#35a86e'],
]

/** Resting geometry per blob: anchored around the bottom edge, bleeding
    off the frame so only the soft crowns show. */
const BLOBS = [
  { left: '-14%', bottom: -120, size: 300, duration: 9, drift: 28 },
  { left: '32%', bottom: -150, size: 340, duration: 11, drift: 36 },
  { left: '72%', bottom: -110, size: 280, duration: 10, drift: 24 },
]

export function BottomGlow() {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[33] h-[340px]"
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 36 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: b.left,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            filter: 'blur(52px)',
            opacity: 0.55,
            backgroundColor: JOURNEYS[i][0],
          }}
          animate={
            reduced
              ? undefined
              : {
                  backgroundColor: JOURNEYS[i],
                  x: [0, b.drift, -b.drift * 0.6, 0],
                  y: [0, -b.drift * 0.8, b.drift * 0.4, 0],
                  scale: [1, 1.12, 0.96, 1],
                }
          }
          transition={{
            duration: b.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  )
}
