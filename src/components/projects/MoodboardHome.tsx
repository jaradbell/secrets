/**
 * 5A's root — the Assistant home and the moodboard as two faces of one
 * place, named by a segmented control riding the island slot. "Board" is
 * the second face's name: the moodboard is a pinboard, so the label keeps
 * the metaphor ("Projects" reads like a database; Pins/Board read like the
 * thing on screen — Board won for naming the *place*, not the items).
 *
 * The swap is never a slide. Each face leaves in its own material:
 *   Board out — every artifact unpins and drops off in reading order
 *   (the entrance stagger run backwards through gravity).
 *   Assistant out — the sheet lifts off the board toward the viewer,
 *   blurring as it goes, like a page picked up to see what's under it.
 * The incoming face then plays its natural entrance (the board's pop-on
 * stagger, the home's develop-in) — arrival is always a fresh pin-up.
 */
import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { SearchDock } from '../home/SearchDock'
import { HomeStates } from '../voice/HomeStates'
import { VoiceControl } from '../voice/VoiceControl'
import { ProjectsMoodboard, type NewPin, type SpokenLine } from './ProjectsMoodboard'

const EASE = [0.32, 0.72, 0, 1] as const

type View = 'assistant' | 'board'

const SEGMENTS: { id: View; label: string }[] = [
  { id: 'assistant', label: 'Assistant' },
  { id: 'board', label: 'Board' },
]

/** How long each face needs to clear before the swap commits. The board's
    unpin staggers in reading order (~0.18s of delays + 0.34s fall); the
    assistant's lift is one motion. */
const BOARD_OUT_MS = 500
const ASSISTANT_OUT_MS = 320

/** The view switch — a white bubble in the board's own vocabulary (same
    paper as the title bubbles), with an ink thumb that springs between
    the two names, overshooting just enough to feel hand-flicked. */
function ViewSwitch({
  view,
  onSwitch,
}: {
  view: View
  onSwitch: (v: View) => void
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
      style={{ top: 'calc(var(--safe-top) + 6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 24 }}
        className="pointer-events-auto flex items-center rounded-full border border-white bg-[rgba(252,252,252,0.85)] p-1 shadow-[0px_2px_40px_0px_rgba(0,0,0,0.1)] backdrop-blur-[12px]"
      >
        {SEGMENTS.map((seg) => {
          const isActive = seg.id === view
          return (
            <button
              key={seg.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSwitch(seg.id)}
              // Fixed height + flex centering: inline text would sit on its
              // baseline with descender room below, reading a hair low.
              className="relative flex h-[34px] items-center justify-center rounded-full px-4 outline-none transition-transform duration-200 ease-out active:scale-95"
            >
              {isActive && (
                <motion.span
                  layoutId="moodboard-view-thumb"
                  className="absolute inset-0 rounded-full bg-ink"
                  // Under-damped on purpose — the thumb lands with a
                  // little wobble, the board's playfulness in miniature.
                  transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                />
              )}
              <span
                className={`relative text-[13px] leading-none font-medium tracking-[-0.01em] transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-ink-secondary'
                }`}
              >
                {seg.label}
              </span>
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}

/** The board's tool notch — the same molded shape the Assistant's rail
    cuts into the frame's right edge, but on the pinboard its cargo is
    verbs, not a table of contents: pin a new project, search the board.
    The handle stays put across the view swap; only the furniture inside
    it changes. Capped at two tools so it stays a notch, not a drawer. */
function ToolNotch({
  out,
  tools,
}: {
  /** Leaves with the board — fades while the artifacts unpin. */
  out: boolean
  tools: { id: string; label: string; glyph: ReactNode; onTap: () => void }[]
}) {
  return (
    <motion.div
      className="absolute top-1/2 -right-4 z-10 h-[120px] w-[34px] -translate-y-1/2"
      initial={{ opacity: 0, x: 10 }}
      animate={out ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
      transition={
        out
          ? { duration: 0.2, ease: 'easeIn' }
          : { delay: 0.45, duration: 0.35, ease: EASE }
      }
    >
      <svg
        className="absolute inset-0"
        width="34"
        height="120"
        viewBox="0 0 34 120"
        fill="none"
        aria-hidden="true"
      >
        <path d="M34 0C34 13 4 15 4 30L4 90C4 105 34 107 34 120Z" fill="#131117" />
      </svg>
      <div className="absolute inset-y-0 right-0 left-1 flex flex-col items-center justify-center gap-1.5">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.label}
            onClick={t.onTap}
            className="flex size-6 items-center justify-center text-white outline-none transition-transform duration-200 ease-out active:scale-90"
          >
            {t.glyph}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export function MoodboardHome() {
  const [view, setView] = useState<View>('assistant')
  // The control answers the tap instantly; the faces take their time. So
  // the thumb rides `target` while the screen rides `view` — during the
  // exit choreography the two disagree, on purpose.
  const [target, setTarget] = useState<View>('assistant')
  // While leaving, the outgoing face stays mounted playing its exit; the
  // swap commits once it has cleared.
  const [leaving, setLeaving] = useState(false)

  // The notch's verbs. Search rides the dock's hint slot the moment the
  // notch is tapped, and only exists while the sheet is up or a filter
  // is applied — put the search away and the chip goes with it.
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  // The plus raises the note itself: the composer comes up in the focus
  // pose, takes a title and the first tasks, and pins on commit. A note
  // with nothing written on it doesn't pin — no husk cluster.
  const [composing, setComposing] = useState(false)
  const [added, setAdded] = useState<NewPin[]>([])
  // The orb stays live under the composer — utterances flow down to the
  // note (first one names it, the rest land as tasks).
  const [spoken, setSpoken] = useState<SpokenLine | null>(null)

  const switchView = (next: View) => {
    if (next === view || leaving) return
    // The filter belongs to the board — flipping to the Assistant puts
    // the search away with it.
    if (next !== 'board') closeSearch()
    setTarget(next)
    setLeaving(true)
    window.setTimeout(
      () => {
        setView(next)
        setLeaving(false)
      },
      view === 'board' ? BOARD_OUT_MS : ASSISTANT_OUT_MS,
    )
  }

  return (
    <VoiceControl
      key="root"
      onUtterance={(t) => {
        if (composing) setSpoken((s) => ({ text: t, seq: (s?.seq ?? 0) + 1 }))
      }}
      dockHint={
        view === 'board' && (searchOpen || query.trim()) ? (
          <SearchDock
            query={query}
            onQuery={setQuery}
            placeholder="Search the board"
            open={searchOpen}
            onOpenChange={setSearchOpen}
          />
        ) : undefined
      }
      idleContent={
        <div className="relative h-full w-full">
          {view === 'assistant' ? (
            <motion.div
              key="assistant"
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.97, filter: 'blur(5px)' }}
              animate={
                leaving
                  ? // The lift — up off the board toward the viewer, going
                    // soft, like a sheet picked up to see what's under it.
                    { opacity: 0, scale: 1.06, filter: 'blur(10px)' }
                  : { opacity: 1, scale: 1, filter: 'blur(0px)' }
              }
              transition={
                leaving ? { duration: 0.3, ease: 'easeIn' } : { duration: 0.45, ease: EASE }
              }
            >
              {/* All three states — Upcoming, Files (the priority projects and
                  loose threads), Connect — cycled by the notch rail. */}
              <HomeStates pages={['upcoming', 'files', 'connect']} />
            </motion.div>
          ) : (
            // No wrapper animation — the board mounts fresh and its artifacts
            // pop on staggered (the entrance it already owns), and leave by
            // unpinning when `out` flips.
            <div key="board" className="absolute inset-0">
              <ProjectsMoodboard
                out={leaving}
                added={added}
                query={query}
                composing={composing}
                spoken={spoken}
                onCompose={(pin) => {
                  if (pin) setAdded((a) => [...a, pin])
                  setComposing(false)
                }}
              />
            </div>
          )}

          {/* Assistant face: HomeStates' own rail is the table of contents.
              Board face: the same notch shape carries the board's verbs. */}
          {view === 'board' && (
            <ToolNotch
              out={leaving}
              tools={[
                {
                  id: 'new',
                  label: 'New project',
                  glyph: (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  ),
                  onTap: () => {
                    closeSearch()
                    setComposing(true)
                  },
                },
                {
                  id: 'search',
                  label: 'Search the board',
                  glyph: (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  ),
                  onTap: () => (searchOpen ? closeSearch() : setSearchOpen(true)),
                },
              ]}
            />
          )}

          <ViewSwitch view={target} onSwitch={switchView} />
        </div>
      }
    />
  )
}
