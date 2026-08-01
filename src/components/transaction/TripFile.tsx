/**
 * The trip file — every receipt from this conversation in one place,
 * summoned by tapping the header island. The thread blurs and falls into
 * the background, the ambient gradient pours up the frame, and the 4E
 * tickets fan out like a hand of cards: swipe or tap to focus, label under
 * the focused one (the app-picker pattern, but the options are your
 * decisions). The dock's orb morphs into an X to close.
 *
 * Choreography: one owner per layer. The backdrop's blur develops
 * progressively (animating the filter, not opacity — a filter behind a
 * fading element pops), the gradient clips up the frame, and the tickets
 * deal up from the dock with a soft stagger. Each ticket splits entrance
 * (outer, tween) from fan position (inner, spring) so opening and swiping
 * never fight over the same transform.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { AmbientShaderBackground } from '../shared/AmbientShaderBackground'
import {
  DiningTicket,
  FlightTicket,
  HotelTicket,
  RideTicket,
} from './ReceiptGalleryTicket'

const EASE = [0.32, 0.72, 0, 1] as const

/** The weekend's artifacts, in trip order. index -1 mutes the tickets' own
    gallery entrance — the fan deals them up itself. */
const RECEIPTS = [
  { id: 'flight', label: 'Flight · United', render: () => <FlightTicket index={-1} /> },
  { id: 'hotel', label: 'Hotel · Expedia', render: () => <HotelTicket index={-1} /> },
  { id: 'dining', label: 'Dinner · OpenTable', render: () => <DiningTicket index={-1} /> },
  { id: 'ride', label: 'Ride · Uber', render: () => <RideTicket index={-1} /> },
]

/** Swipe distance / fling velocity that advances the fan. */
const SWIPE_OFFSET = 50
const SWIPE_VELOCITY = 400

export function TripFile({ onClose }: { onClose: () => void }) {
  const [focused, setFocused] = useState(0)

  return (
    <div className="absolute inset-0 z-30">
      {/* Backdrop — the thread softens into the background as the blur
          develops in. Tap to dismiss. */}
      <motion.div
        className="absolute inset-0"
        initial={{
          backdropFilter: 'blur(0px)',
          WebkitBackdropFilter: 'blur(0px)',
          backgroundColor: 'rgba(252,252,252,0)',
        }}
        animate={{
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          backgroundColor: 'rgba(252,252,252,0.45)',
        }}
        exit={{
          backdropFilter: 'blur(0px)',
          WebkitBackdropFilter: 'blur(0px)',
          backgroundColor: 'rgba(252,252,252,0)',
          transition: { duration: 0.38, ease: 'easeIn' },
        }}
        transition={{ duration: 0.65, ease: EASE }}
        onClick={onClose}
      />

      {/* The ambient gradient pours up the frame — a full-bleed mesh revealed
          bottom-to-top, milk-washed so the fan stays legible over it. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0.6 }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 0.88 }}
        exit={{
          clipPath: 'inset(100% 0% 0% 0%)',
          opacity: 0.4,
          transition: { duration: 0.38, ease: 'easeIn' },
        }}
        transition={{ duration: 0.85, ease: EASE }}
      >
        <AmbientShaderBackground veil={false} />
        {/* Milk wash — heavy up top where the title and fan need quiet,
            thinning toward the bottom so the mesh's color owns the floor. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.62) 34%, rgba(255,255,255,0.3) 60%, rgba(255,255,255,0.06) 85%, rgba(255,255,255,0) 100%)',
          }}
        />
      </motion.div>

      {/* Title block — what this file is. */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 text-center"
        style={{ top: 'calc(var(--safe-top) + 22px)' }}
        initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
        animate={{
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { delay: 0.22, duration: 0.5, ease: EASE },
        }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } }}
      >
        <p className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
          Sisters Birthday Weekend
        </p>
        <p className="mt-0.5 text-[11.5px] text-ink-secondary">
          {RECEIPTS.length} receipts · Jul 25 – 27
        </p>
      </motion.div>

      {/* The fan — tickets dealt out of the island, focused one upright.
          Drag to flip through; tap a neighbor to focus it. */}
      <motion.div
        className="absolute inset-x-0 top-[10%] bottom-[24%]"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY) {
            setFocused((f) => Math.min(RECEIPTS.length - 1, f + 1))
          } else if (info.offset.x > SWIPE_OFFSET || info.velocity.x > SWIPE_VELOCITY) {
            setFocused((f) => Math.max(0, f - 1))
          }
        }}
      >
        <div className="absolute left-1/2 top-1/2 h-0 w-[340px] -translate-x-1/2 scale-[0.74]">
          {RECEIPTS.map((r, i) => {
            const offset = i - focused
            return (
              <div
                key={r.id}
                className="absolute inset-x-0 top-0"
                style={{ zIndex: 10 - Math.abs(offset) }}
              >
                {/* Static half-height centering so the motion layers keep
                    their transforms for the choreography. */}
                <div className="-translate-y-1/2">
                  {/* Entrance / exit — the deal-up from the dock, staggered
                      so the hand fans open rather than arriving as a block. */}
                  <motion.div
                    initial={{ opacity: 0, y: 320 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: 0.1 + i * 0.06, duration: 0.7, ease: EASE },
                    }}
                    // Drop first, fade late: the hand visibly tucks back
                    // toward the dock instead of dissolving in place (stacked
                    // translucent cards read as mud).
                    exit={{
                      opacity: 0,
                      y: 340,
                      transition: {
                        y: {
                          delay: (RECEIPTS.length - 1 - i) * 0.035,
                          duration: 0.36,
                          ease: [0.5, 0, 0.75, 0.4],
                        },
                        opacity: {
                          delay: (RECEIPTS.length - 1 - i) * 0.035 + 0.14,
                          duration: 0.18,
                        },
                      },
                    }}
                  >
                    {/* Fan position — springs between slots on swipe/tap,
                        never re-running the entrance. */}
                    <motion.div
                      onTap={() => {
                        if (offset !== 0) setFocused(i)
                      }}
                      initial={false}
                      animate={{
                        opacity: Math.abs(offset) > 2 ? 0 : offset === 0 ? 1 : 0.55,
                        x: offset * 96,
                        y: Math.abs(offset) * 26,
                        scale: offset === 0 ? 1 : 0.88,
                        rotate: offset * 7,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 28,
                        opacity: { duration: 0.3 },
                      }}
                      className={offset === 0 ? '' : 'cursor-pointer'}
                    >
                      {r.render()}
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Focused label + pagination — the picker's caption slot. */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-[19%] flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.32, duration: 0.45, ease: EASE } }}
        exit={{ opacity: 0, y: 8, transition: { duration: 0.2, ease: 'easeIn' } }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={RECEIPTS[focused].id}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
            transition={{ duration: 0.22, ease: EASE }}
            className="text-[15px] font-medium tracking-[-0.01em] text-ink"
          >
            {RECEIPTS[focused].label}
          </motion.p>
        </AnimatePresence>
        <div className="flex items-center gap-1.5">
          {RECEIPTS.map((r, i) => (
            <span
              key={r.id}
              className="size-1.5 rounded-full transition-colors duration-200"
              style={{ background: i === focused ? '#0d0d0d' : 'rgba(13,13,13,0.22)' }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
