/**
 * UtteranceDial — the dock's resting hint turned into a contextual
 * suggestion surface. Voice-first discovery without new chrome: the one
 * text line the dock already owns cycles through speakable prompts
 * (phrased as things you'd say, not actions), and the line itself is the
 * control.
 *
 *   Tap — commit the showing utterance, as if you'd spoken it.
 *   Press and hold — the full hand expands upward as a vertical dial
 *   (after ChatGPT's intelligence picker, 60fps shot
 *   chatgpt-intelligence-picker-long-press-slider-interaction): a soft
 *   highlight thumb sits on the current row, stretches elastically toward
 *   a vertical drag, and snaps row to row with a subtle spring. Release
 *   on a row commits it; release without dragging leaves the dial open
 *   for a tap. Tap away and it folds.
 *
 * The dial lives in the hint slot's airspace — it rises from the line and
 * folds back into it, so the dock's silhouette never changes.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/** A speakable prompt and the demo's scripted reply to it. */
export type UtteranceSuggestion = { text: string; reply: string }

/** Rest cycle beat — slow enough to read, quick enough to feel alive. */
const CYCLE_MS = 4500
/** Hold threshold that opens the dial (shorter than the orb's 450ms
    walkie-talkie hold — the line is a lighter commitment). */
const HOLD_OPEN_MS = 300
/** Row pitch in the dial column. */
const ROW_STEP = 36
/** Drag past this (px) and release commits; under it the dial stays open. */
const DRAG_COMMIT_PX = 8

const EASE = [0.32, 0.72, 0, 1] as const

export function UtteranceDial({
  utterances,
  onCommit,
  onOpenChange,
}: {
  utterances: UtteranceSuggestion[]
  onCommit: (u: UtteranceSuggestion) => void
  /** The dial rose / folded — the host raises its focus veil behind it. */
  onOpenChange?: (open: boolean) => void
}) {
  /** Which prompt the resting line shows. */
  const [cursor, setCursor] = useState(0)
  const [open, setOpen] = useState(false)
  /** Continuous row position while the hold-drag is live. */
  const [frac, setFrac] = useState(0)
  /** Released without dragging — the dial stays up for a tap. */
  const [sticky, setSticky] = useState(false)

  const n = utterances.length
  const active = Math.max(0, Math.min(n - 1, Math.round(frac)))

  // The hold-drag gesture's live state.
  const press = useRef<{ timer: number; startY: number; moved: boolean } | null>(null)

  // Mirror the dial's openness to the host (and fold the veil with the
  // dial when this unmounts — commits swap the slot's content away).
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange
  useEffect(() => {
    onOpenChangeRef.current?.(open)
    return () => onOpenChangeRef.current?.(false)
  }, [open])

  // Rest cycle — paused while the dial is up.
  useEffect(() => {
    if (open || n < 2) return
    const id = window.setInterval(() => setCursor((c) => (c + 1) % n), CYCLE_MS)
    return () => clearInterval(id)
  }, [open, n])

  // Sticky dial: any press outside folds it (passive — the press still
  // lands where it was aimed, same manner as the inline tray).
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!(open && sticky)) return
    const onPress = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
      setSticky(false)
    }
    document.addEventListener('pointerdown', onPress)
    return () => document.removeEventListener('pointerdown', onPress)
  }, [open, sticky])

  const commit = (i: number) => {
    setCursor(i)
    setOpen(false)
    setSticky(false)
    onCommit(utterances[i])
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (sticky) return // the rows carry their own taps now
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = { timer: 0, startY: e.clientY, moved: false }
    p.timer = window.setTimeout(() => {
      setFrac(cursor)
      setOpen(true)
    }, HOLD_OPEN_MS)
    press.current = p
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || !open) return
    const dy = p.startY - e.clientY // up is positive — rows climb upward
    if (Math.abs(dy) > DRAG_COMMIT_PX) p.moved = true
    setFrac(Math.max(0, Math.min(n - 1, cursor + dy / ROW_STEP)))
  }

  const onPointerUp = () => {
    const p = press.current
    press.current = null
    if (!p) return
    window.clearTimeout(p.timer)
    if (!open) {
      commit(cursor) // released before the hold landed — a tap
    } else if (p.moved) {
      commit(active) // slid to a row — release is the pick
    } else {
      setSticky(true) // held in place — stay open for a tap
    }
  }

  const onPointerCancel = () => {
    const p = press.current
    press.current = null
    if (p) window.clearTimeout(p.timer)
    setOpen(false)
    setSticky(false)
  }

  /** Thumb geometry — the highlight rides the active row and leans
      elastically toward the drag before snapping (spring does the snap).
      In the column, row i sits (n-1-i) steps from the top. */
  const lean = frac - active // -0.5..0.5 toward the next row
  const stretch = Math.min(Math.abs(lean) * 26, 13)
  const thumbTop = (n - 1 - active) * ROW_STEP - (lean > 0 ? stretch : 0)

  return (
    <div ref={rootRef} className="relative flex justify-center">
      {/* The dial — the full hand, risen out of the line's airspace. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dial"
            role="listbox"
            aria-label="Suggested things to say"
            initial={{ opacity: 0, y: 16, scale: 0.94, filter: 'blur(6px)' }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              transition: { type: 'spring', stiffness: 360, damping: 28 },
            }}
            exit={{
              opacity: 0,
              y: 12,
              scale: 0.96,
              filter: 'blur(4px)',
              transition: { duration: 0.18, ease: EASE },
            }}
            className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2"
            style={{ transformOrigin: '50% 100%' }}
          >
            <div className="relative flex flex-col-reverse items-stretch">
              {/* The thumb — a quiet highlight that stretches toward the
                  drag and snaps to the next row with a subtle spring. */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-x-0 rounded-full bg-[#17141b]/8"
                initial={false}
                animate={{ top: thumbTop, height: ROW_STEP + stretch }}
                transition={{ type: 'spring', stiffness: 460, damping: 27 }}
              />
              {utterances.map((u, i) => (
                <motion.button
                  key={u.text}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onClick={() => sticky && commit(i)}
                  className="relative flex items-center justify-center whitespace-nowrap rounded-full px-4 text-[13px] font-medium tracking-[-0.01em] outline-none select-none"
                  style={{ height: ROW_STEP, cursor: sticky ? 'pointer' : 'default' }}
                  initial={false}
                  animate={{
                    color: i === active ? '#0d0d0d' : '#969696',
                    scale: i === active ? 1 : 0.96,
                  }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  &ldquo;{u.text}&rdquo;
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The resting line — the hint slot's one text element, now alive.
          It keeps its seat (and holds the slot's height) while the dial is
          up, just faded so the column owns the moment. */}
      <motion.button
        type="button"
        aria-label={`Say \u201C${utterances[cursor]?.text}\u201D \u2014 hold for more`}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="flex cursor-pointer items-center justify-center gap-1.5 outline-none select-none touch-none"
        initial={false}
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={utterances[cursor]?.text}
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
            transition={{ duration: 0.32, ease: EASE }}
            className="max-w-[300px] text-center text-[13px] font-medium tracking-[-0.01em] text-ink-secondary"
          >
            &ldquo;{utterances[cursor]?.text}&rdquo;
          </motion.span>
        </AnimatePresence>
        {/* The affordance — a quiet disc holding the chevron (the dial
            thumb's own material), enough body to read as "there's more
            above this line" without becoming new chrome. */}
        <span
          aria-hidden="true"
          className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#17141b]/8"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 6.5 5 3.5 8 6.5"
              stroke="#636363"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </motion.button>
    </div>
  )
}
