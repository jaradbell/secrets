/**
 * The trip file — every receipt and to-do from this conversation in one
 * place, summoned by tapping the header island. The thread blurs and falls
 * into the background, the ambient gradient pours up the frame, and two
 * decks stack on a vertical axis:
 *
 *   Receipts — the 4E tickets fanned like a hand of cards. Swipe or tap
 *   sideways to focus; rich artifacts, one at a time.
 *   Tasks — a bare, scannable list floating on the gradient. Each row is a
 *   doorway: done rows flip to their receipt, in-flight rows land you back
 *   at the turn in the thread, untouched ones spawn a fresh thread.
 *
 * One drag surface serves both axes via direction lock — horizontal flips
 * items within the receipts deck, vertical flips decks. The dash rail on
 * the right edge tracks which deck you're holding. The dock's orb morphs
 * into an X to close.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { AmbientShaderBackground } from '../shared/AmbientShaderBackground'
import {
  DiningTicket,
  FlightTicket,
  HotelTicket,
  RideTicket,
} from './ReceiptGalleryTicket'
import { ReceiptSheet, type SheetOrigin } from './ReceiptSheet'

const EASE = [0.32, 0.72, 0, 1] as const

/** The weekend's artifacts, in trip order. index -1 mutes the tickets' own
    gallery entrance — the fan deals them up itself. `meta` and `actions`
    surface under the ticket when it's expanded to full scale. */
const RECEIPTS = [
  {
    id: 'flight',
    label: 'Flight · United',
    meta: 'United · UA 1128 · Confirmed',
    actions: ['Check in', 'Add to Wallet'],
    render: () => <FlightTicket index={-1} />,
  },
  {
    id: 'hotel',
    label: 'Hotel · Expedia',
    meta: 'Expedia · EXP-99231 · Confirmed',
    actions: ['Directions', 'Modify'],
    render: () => <HotelTicket index={-1} />,
  },
  {
    id: 'dining',
    label: 'Dinner · OpenTable',
    meta: 'OpenTable · VLT-8127 · Confirmed',
    actions: ['Change time', 'Cancel'],
    render: () => <DiningTicket index={-1} />,
  },
  {
    id: 'ride',
    label: 'Ride · Uber',
    meta: 'Uber · UBR-88213 · En route',
    actions: ['Track ride'],
    render: () => <RideTicket index={-1} />,
  },
]

/** The fan renders tickets at this scale; expanding one inverts it so the
    ticket settles at its natural designed size (scale 1 on screen). */
const FAN_SCALE = 0.74

/** Zoomed-in pager pitch — one full-scale card width plus a gutter, in the
    fan wrapper's (scaled) coordinate space. */
const PAGE_STEP = (340 + 28) / FAN_SCALE

/** A to-do in the trip file. State decides the row's tap behavior:
    done → flip to its receipt; active → jump to the thread turn where it
    lives; todo → start a new thread seeded with the intent. */
export type TripTask = {
  id: string
  label: string
  state: 'done' | 'active' | 'todo'
  /** done: which receipt this task produced. */
  receiptId?: string
  /** done: the provider that fulfilled it, shown on the trailing edge. */
  provider?: { name: string; icon: string }
  /** todo: the utterance that seeds the new thread. */
  seed?: string
}

type Deck = 'receipts' | 'tasks'
const DECKS: Deck[] = ['receipts', 'tasks']

/** Backdrop keyframes. The Safari-prefixed filter isn't in framer's target
    types (it animates fine at runtime); consts skip the literal-only excess
    property check that fails `tsc -b`. */
const BACKDROP_HIDDEN = {
  backdropFilter: 'blur(0px)',
  WebkitBackdropFilter: 'blur(0px)',
  backgroundColor: 'rgba(252,252,252,0)',
}
const BACKDROP_SHOWN = {
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  backgroundColor: 'rgba(252,252,252,0.45)',
}

/** Swipe distance / fling velocity that advances the fan or flips decks. */
const SWIPE_OFFSET = 50
const SWIPE_VELOCITY = 400
const DECK_OFFSET = 60
const DECK_VELOCITY = 500

function CheckGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Leading status ring: filled check (done), pulsing dot (in thread),
    empty ring (untouched). */
function StatusRing({ state }: { state: TripTask['state'] }) {
  if (state === 'done') {
    return (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-ink">
        <CheckGlyph />
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink/40">
        <motion.span
          className="size-2 rounded-full bg-ink/70"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </span>
    )
  }
  return <span className="size-[22px] shrink-0 rounded-full border-[1.5px] border-ink/25" />
}

export function TripFile({
  tasks = [],
  initialReceiptId,
  onJumpToThread,
  onStartThread,
  onViewInThread,
  onClose,
}: {
  tasks?: TripTask[]
  /** Enter the deck at a specific card, already zoomed — for doorways
      that lead to one receipt (the briefing's stubs). Swiping still
      cycles the whole hand from there. */
  initialReceiptId?: string
  /** An in-flight task was tapped — close and land on its turn. */
  onJumpToThread?: (task: TripTask) => void
  /** An untouched task was tapped — close and open a new seeded thread. */
  onStartThread?: (task: TripTask) => void
  /** "View in thread" on an expanded receipt — close and land on the turn
      that produced it. */
  onViewInThread?: (receiptId: string) => void
  onClose: () => void
}) {
  const entryIdx = initialReceiptId
    ? RECEIPTS.findIndex((r) => r.id === initialReceiptId)
    : -1
  const [deck, setDeck] = useState<Deck>('receipts')
  const [focused, setFocused] = useState(entryIdx >= 0 ? entryIdx : 0)
  // Wallet-style focus: the tapped ticket glides to center at full scale
  // while the rest of the hand falls away. Deck flips always reset it.
  const [expanded, setExpanded] = useState(entryIdx >= 0)
  // Level three — the full sheet, expanding from the zoomed ticket's
  // measured bounds. Tap the zoomed ticket to enter; drag down to leave.
  const [sheet, setSheet] = useState<{ id: string; origin: SheetOrigin } | null>(null)
  useEffect(() => {
    if (deck !== 'receipts') {
      setExpanded(false)
      setSheet(null)
    }
  }, [deck])

  const openSheet = (id: string) => {
    const viewport = document.getElementById('app-viewport')
    const ticket = document.querySelector(`[data-trip-ticket="${id}"]`)
    if (!viewport || !ticket) return
    const v = viewport.getBoundingClientRect()
    const t = ticket.getBoundingClientRect()
    setSheet({
      id,
      origin: {
        top: t.top - v.top,
        left: t.left - v.left,
        right: v.right - t.right,
        bottom: v.bottom - t.bottom,
      },
    })
  }

  // The tickets deal up from the dock only on the overlay's first reveal;
  // when the fan remounts after a deck round-trip, the deck slide carries
  // the motion and the entrance stays quiet.
  const dealtRef = useRef(false)
  useEffect(() => {
    dealtRef.current = true
  }, [])

  const doneCount = tasks.filter((t) => t.state === 'done').length

  const onTaskTap = (task: TripTask) => {
    if (task.state === 'done' && task.receiptId) {
      const idx = RECEIPTS.findIndex((r) => r.id === task.receiptId)
      if (idx >= 0) {
        setFocused(idx)
        setDeck('receipts')
      }
      return
    }
    if (task.state === 'active') onJumpToThread?.(task)
    else if (task.state === 'todo') onStartThread?.(task)
  }

  return (
    <div className="absolute inset-0 z-30">
      {/* Backdrop — the thread softens into the background as the blur
          develops in. Tap to dismiss. */}
      <motion.div
        className="absolute inset-0"
        initial={BACKDROP_HIDDEN}
        animate={BACKDROP_SHOWN}
        exit={{ ...BACKDROP_HIDDEN, transition: { duration: 0.38, ease: 'easeIn' } }}
        transition={{ duration: 0.65, ease: EASE }}
        // Outside taps step back one level: expanded ticket first, then out.
        onClick={() => (expanded ? setExpanded(false) : onClose())}
      />

      {/* The ambient gradient pours up the frame — a full-bleed mesh revealed
          bottom-to-top, milk-washed so the decks stay legible over it. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0.6 }}
        // A touch more milk while a ticket holds the stage.
        animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: expanded ? 0.96 : 0.88 }}
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

      {/* Title block — what this file is, caption tracking the held deck. */}
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={deck}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mt-0.5 text-[11.5px] text-ink-secondary"
          >
            {deck === 'receipts'
              ? `${RECEIPTS.length} receipts · Jul 25 – 27`
              : `${tasks.length} tasks · ${doneCount} done`}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Deck rail — a little notch cut into the frame's right edge, one
          dash per deck. Each side of the silhouette is a single cubic
          bézier — one continuous S from the frame edge into the notch wall
          (arc-to-line joints read as kinks); the fanned cards slide
          beneath it. */}
      <motion.div
        className="absolute right-0 z-10 h-[96px] w-[34px]"
        style={{ top: '50%', y: '-50%', pointerEvents: expanded ? 'none' : 'auto' }}
        initial={{ opacity: 0, x: 16 }}
        animate={
          // Deck-switching means nothing mid-focus — the notch stands down.
          expanded
            ? { opacity: 0, x: 16, transition: { duration: 0.25, ease: 'easeIn' } }
            : { opacity: 1, x: 0, transition: { delay: 0.3, duration: 0.4, ease: EASE } }
        }
        exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
      >
        <svg
          className="absolute inset-0"
          width="34"
          height="96"
          viewBox="0 0 34 96"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M34 0C34 13 4 15 4 30L4 66C4 81 34 83 34 96Z"
            fill="#131117"
          />
        </svg>
        <div className="absolute inset-y-0 right-0 left-1 flex flex-col items-center justify-center gap-1">
          {DECKS.map((d) => {
            const isActive = d === deck
            return (
              <button
                key={d}
                type="button"
                aria-label={d === 'receipts' ? 'Receipts' : 'Tasks'}
                onClick={() => setDeck(d)}
                className="relative flex h-3.5 w-4 items-center justify-center outline-none"
              >
                <span
                  className={`h-[2px] rounded-full transition-all duration-300 ${
                    isActive ? 'w-4 bg-white' : 'w-2.5 bg-white/35'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* The deck surface — one drag plane, two axes. Direction lock commits
          each gesture: horizontal steps the fan, vertical flips decks. */}
      <motion.div
        className="absolute inset-x-0 top-[10%] bottom-[24%]"
        drag
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onTap={(e) => {
          // Tapping the space around a zoomed ticket steps back to the fan —
          // the drag surface sits over the backdrop, so it has to relay the
          // outside tap itself. Taps on the ticket bubble through with the
          // ticket in their path; leave those to the ticket's own handler.
          if (!expanded) return
          const target = e.target as Element | null
          if (target?.closest?.('[data-trip-ticket]')) return
          setExpanded(false)
        }}
        onDragEnd={(_, info) => {
          // Zoomed ticket keeps the surface's gestures: drag down tucks it
          // back into the fan, horizontal swipes step between receipts
          // without leaving the zoom. Deck flips wait until you're back out.
          if (expanded) {
            if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
              if (info.offset.y > DECK_OFFSET || info.velocity.y > DECK_VELOCITY) {
                setExpanded(false)
              }
              return
            }
            if (info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY) {
              setFocused((f) => Math.min(RECEIPTS.length - 1, f + 1))
            } else if (info.offset.x > SWIPE_OFFSET || info.velocity.x > SWIPE_VELOCITY) {
              setFocused((f) => Math.max(0, f - 1))
            }
            return
          }
          if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
            if (info.offset.y < -DECK_OFFSET || info.velocity.y < -DECK_VELOCITY) {
              setDeck('tasks')
            } else if (info.offset.y > DECK_OFFSET || info.velocity.y > DECK_VELOCITY) {
              setDeck('receipts')
            }
            return
          }
          if (deck !== 'receipts') return
          if (info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY) {
            setFocused((f) => Math.min(RECEIPTS.length - 1, f + 1))
          } else if (info.offset.x > SWIPE_OFFSET || info.velocity.x > SWIPE_VELOCITY) {
            setFocused((f) => Math.max(0, f - 1))
          }
        }}
      >
        {/* Receipts sit "above" tasks in the stack: each deck enters from
            and exits toward its home side, so the vertical swipe reads as
            sliding a shelf. */}
        <AnimatePresence initial={false}>
          {deck === 'receipts' ? (
            <motion.div
              key="receipts"
              className="absolute inset-0"
              initial={{ opacity: 0, y: -170 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -170 }}
              transition={{ duration: 0.45, ease: EASE }}
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
                        {/* Entrance / exit — the deal-up from the dock,
                            staggered so the hand fans open rather than
                            arriving as a block. Skipped on deck re-entry. */}
                        <motion.div
                          initial={dealtRef.current ? false : { opacity: 0, y: 320 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            transition: { delay: 0.1 + i * 0.06, duration: 0.7, ease: EASE },
                          }}
                          // Drop first, fade late: the hand visibly tucks back
                          // toward the dock instead of dissolving in place
                          // (stacked translucent cards read as mud).
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
                              never re-running the entrance. Tapping the
                              focused ticket expands it to full scale (the
                              inverse of the fan's) while siblings fall away;
                              tapping again tucks it back. */}
                          <motion.div
                            data-trip-ticket={r.id}
                            onTap={() => {
                              // The gesture stack deepens: fan tap → zoom,
                              // zoomed tap → the full sheet. Drag-down and
                              // backdrop taps walk back one level at a time.
                              if (offset === 0) {
                                if (expanded) openSheet(r.id)
                                else setExpanded(true)
                              } else if (!expanded) setFocused(i)
                            }}
                            initial={false}
                            animate={
                              expanded
                                ? // Zoomed, the hand flattens into a pager:
                                  // every card at full scale in one row, so a
                                  // swipe is a plain horizontal slide — no
                                  // rotation, no dive, no scale change.
                                  {
                                    opacity: Math.abs(offset) > 1 ? 0 : 1,
                                    x: offset * PAGE_STEP,
                                    y: -10,
                                    scale: 1 / FAN_SCALE,
                                    rotate: 0,
                                  }
                                : {
                                    opacity: Math.abs(offset) > 2 ? 0 : offset === 0 ? 1 : 0.55,
                                    x: offset * 96,
                                    y: Math.abs(offset) * 26,
                                    scale: offset === 0 ? 1 : 0.88,
                                    rotate: offset * 7,
                                  }
                            }
                            transition={{
                              type: 'spring',
                              stiffness: 260,
                              damping: 28,
                              opacity: { duration: 0.3 },
                            }}
                            className="cursor-pointer"
                            style={{
                              pointerEvents: expanded && offset !== 0 ? 'none' : 'auto',
                            }}
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
          ) : (
            <motion.div
              key="tasks"
              className="absolute inset-0 flex flex-col items-center justify-center"
              initial={{ opacity: 0, y: 190 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 190, transition: { duration: 0.32, ease: 'easeIn' } }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              {/* Bare rows, no card — tasks are transient and glanceable,
                  the opposite of the artifacts a swipe above. */}
              <div className="flex w-full max-w-[330px] flex-col gap-0.5 px-6">
                {tasks.map((t, i) => (
                  <motion.button
                    key={t.id}
                    type="button"
                    onTap={() => onTaskTap(t)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: 0.08 + i * 0.045, duration: 0.38, ease: EASE },
                    }}
                    exit={{ opacity: 0, y: 20, transition: { duration: 0.18 } }}
                    className="flex w-full items-center gap-3.5 rounded-[18px] px-3 py-3 text-left outline-none transition-colors duration-150 active:bg-white/50"
                  >
                    <StatusRing state={t.state} />
                    <span
                      className={`min-w-0 flex-1 truncate text-[14.5px] tracking-[-0.01em] ${
                        t.state === 'done' ? 'text-ink-tertiary line-through' : 'text-ink'
                      }`}
                    >
                      {t.label}
                    </span>
                    {/* Trailing edge tells you where the door leads. */}
                    {t.state === 'done' && t.provider ? (
                      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
                        <img
                          src={t.provider.icon}
                          alt={t.provider.name}
                          draggable={false}
                          className="size-6 object-contain"
                        />
                      </span>
                    ) : t.state === 'active' ? (
                      <span className="shrink-0 text-[11px] font-medium text-ink-tertiary">
                        In thread
                      </span>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <path
                          d="M7 2.5v9M2.5 7h9"
                          stroke="rgba(23,23,23,0.4)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Focused label + pagination — the fan's caption slot; the tasks deck
          carries its meaning in the rows themselves. When a ticket expands,
          the slot hands over to its meta line and action chips. */}
      <AnimatePresence initial={false}>
        {deck === 'receipts' && (
          <motion.div
            key="caption"
            className="pointer-events-none absolute inset-x-0 bottom-[19%] flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: dealtRef.current ? 0.15 : 0.32, duration: 0.45, ease: EASE },
            }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.2, ease: 'easeIn' } }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {expanded ? (
                <motion.div
                  key={`actions-${RECEIPTS[focused].id}`}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.26, ease: EASE }}
                  className="pointer-events-auto flex flex-col items-center gap-3.5"
                >
                  <p className="text-[12px] font-medium tracking-[0.02em] text-ink-secondary">
                    {RECEIPTS[focused].meta}
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Provider actions — what the artifact can do. */}
                    {RECEIPTS[focused].actions.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="flex h-9 items-center rounded-full bg-ink px-4 text-[12px] font-medium whitespace-nowrap text-white outline-none transition-transform duration-200 ease-out active:scale-[0.96]"
                      >
                        {a}
                      </button>
                    ))}
                    {/* The agent action — the door back to the turn that
                        produced this receipt. */}
                    <button
                      type="button"
                      onClick={() => onViewInThread?.(RECEIPTS[focused].id)}
                      className="flex h-9 items-center rounded-full border border-black/10 bg-white/70 px-4 text-[12px] font-medium whitespace-nowrap text-ink backdrop-blur-[8px] outline-none transition-transform duration-200 ease-out active:scale-[0.96]"
                    >
                      View in thread
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`label-${RECEIPTS[focused].id}`}
                  initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="flex flex-col items-center gap-3"
                >
                  <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">
                    {RECEIPTS[focused].label}
                  </p>
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
            )}
          </AnimatePresence>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Level three — the sheet grows out of the zoomed ticket and covers
          the file; the dock's X (above) still closes everything. */}
      <AnimatePresence>
        {sheet && (
          <ReceiptSheet
            key={sheet.id}
            id={sheet.id}
            origin={sheet.origin}
            onDismiss={() => setSheet(null)}
            onViewInThread={() => onViewInThread?.(sheet.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
