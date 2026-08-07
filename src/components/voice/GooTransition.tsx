/**
 * GooTransition — the liquid pause between screens.
 *
 * A frosted white veil rises over the frame while the goo loader is born
 * at its center; once the veil is opaque the parent swaps the screen
 * underneath (`onSwap`), the loader beats through the hold (the "loading
 * messages" moment), then dies — buds home, core collapses — and the veil
 * melts away to reveal the new screen (`onDone` unmounts the overlay).
 *
 * Render it conditionally in a portal over the app viewport:
 *
 *   {transition && <GooTransition onSwap={commit} onDone={clear} />}
 */
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GooLoader } from './GooLoader'

/** The loader is born a beat after the veil starts rising, so the moment
    reads as a sequence — frost first, then the ink emerges through it. */
const LOADER_IN_MS = 240
/** When the parent swaps the underlying screen — once the veil has gone
    opaque, so the switch is never seen raw. */
const SWAP_MS = 650
/** Total time the loader lives before dying. Birth plus a full beat —
    long enough to read as a pause, short enough to stay a transition. */
const HOLD_MS = 1800

export function GooTransition({
  onSwap,
  onDone,
}: {
  /** Swap the screen beneath the veil here. */
  onSwap: () => void
  /** The veil has melted away — unmount the overlay. */
  onDone: () => void
}) {
  const [stage, setStage] = useState<'build' | 'run' | 'dying' | 'reveal'>('build')

  useEffect(() => {
    const wake = window.setTimeout(() => setStage('run'), LOADER_IN_MS)
    const swap = window.setTimeout(onSwap, SWAP_MS)
    const die = window.setTimeout(() => setStage('dying'), HOLD_MS)
    return () => {
      window.clearTimeout(wake)
      window.clearTimeout(swap)
      window.clearTimeout(die)
    }
    // Choreography runs once for the overlay's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const revealing = stage === 'reveal'

  return (
    <motion.div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-white/92"
      // The blur develops with the fade, so the outgoing screen visibly
      // dissolves back rather than snapping to frost — and resolves
      // forward again as the veil melts.
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={
        revealing
          ? { opacity: 0, backdropFilter: 'blur(0px)' }
          : { opacity: 1, backdropFilter: 'blur(18px)' }
      }
      transition={{ duration: revealing ? 0.5 : 0.6, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (revealing) onDone()
      }}
    >
      {stage !== 'build' && (
        <GooLoader size={80} exiting={stage === 'dying'} onExited={() => setStage('reveal')} />
      )}
    </motion.div>
  )
}
