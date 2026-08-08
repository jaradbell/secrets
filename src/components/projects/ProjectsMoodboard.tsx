/**
 * 5A — Projects as a moodboard. Instead of rows in a list, each active
 * project is a loose collage cluster on one scrolling board: tilted photo
 * snapshots, a white title bubble, provider stickers, a date chip — and a
 * tinted sticky note that carries the work. The note is the accountable
 * artifact: a black badge counts the open tasks at a glance, the top 2–3
 * tasks read inside it, and anything past that folds into "+N more" (a
 * project can hold an unbounded task list without the board caring).
 *
 * Every artifact is draggable — pick it up, it snaps home — and the whole
 * board breathes with a slow idle drift, so it reads as a pinboard of
 * living work rather than a table of records.
 */
import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ReceiptObject, type ReceiptContent } from '../transaction/ReceiptCard'

const EASE = [0.32, 0.72, 0, 1] as const

/** The board's top of stack — every tap or drag claims the next slot,
    so "last touched" is always the piece on top, in the order you
    touched them. Starts above the tallest seeded z (title bubbles, 30). */
let TOP_Z = 40
const nextTopZ = () => ++TOP_Z

/** Broadcast to every artifact when the board is being put away — flipping
    it plays the unpin: pins pop in reading order and the pieces drop off
    the board with their tilt exaggerated. */
const UnpinContext = createContext(false)

/* ── Focus — lift any artifact off the board ──────────────────────────── */

/** Where the tapped artifact was sitting (frame coordinates, unrotated
    box) — the pose the focus clone lifts from and returns to. */
type FromRect = { x: number; y: number; w: number; h: number; rotate: number }

/** What got lifted. Enough to redraw the artifact large — the task note
    and the photo roll carry ids because their content is live state. */
type FocusPayload =
  | { kind: 'tasks'; projectId: string }
  // A tapped photo opens the whole project roll, starting on that shot.
  | { kind: 'gallery'; projectId: string; src: string }
  | { kind: 'title'; text: string }
  | { kind: 'chip'; text: string; color: string }
  // A provider mark is a booking — tapping it produces the receipt.
  | { kind: 'receipt'; icon: string; receipt: ReceiptContent }

type Focus = {
  id: string
  payload: FocusPayload
  from: FromRect
  frame: { w: number; h: number }
}

/** Artifacts report taps up; the board hides whichever one is lifted
    (its clone is standing in on the focus layer). */
const FocusContext = createContext<{
  hiddenId: string | null
  open: (id: string, payload: FocusPayload, from: FromRect) => void
}>({ hiddenId: null, open: () => {} })

/** The live task state — the small notes, the focused note, and the
    badge counts all read one truth, and checking off anywhere updates
    everywhere. Carries the merged project list too (seed + fresh pins)
    so the focused note can find tints for projects born after mount. */
const TasksContext = createContext<{
  projects: BoardProject[]
  tasksById: Record<string, BoardTask[]>
  toggle: (projectId: string, taskId: string) => void
  add: (projectId: string, label: string) => void
}>({ projects: [], tasksById: {}, toggle: () => {}, add: () => {} })

/* ── Data ─────────────────────────────────────────────────────────────── */

type BoardTask = { id: string; label: string; done: boolean }

/** One shot in a project's photo roll. Place-sourced shots arrive with
    their meta derived from the booking or destination; user uploads
    start blank and take a hand-typed note. */
type BoardPhoto = {
  src: string
  /** Caption under the shot — derived from the place, or typed. */
  title: string
  /** Provenance — the booking behind the shot (place · dates · provider),
      or "Added by you" on uploads. */
  source: string
  /** The provider the shot rode in on — its mark leads the source line. */
  provider?: { name: string; icon: string }
  /** Uploads only: the caption stays editable in the roll. */
  editable?: boolean
}

/** A provider mark and the booking behind it — the sticker is just the
    receipt's face on the board. */
type BoardSticker = { icon: string; receipt: ReceiptContent }

type BoardProject = {
  id: string
  title: string
  /** The little context chip pinned near the photos — dates, status. */
  chip: string
  /** Sticky-note tint. */
  noteColor: string
  /** Chip tint (white reads as paper, colors as tape). */
  chipColor: string
  /** Provider marks collected so far — the project's fingerprint. */
  stickers: BoardSticker[]
  /** Ordered by relevance: the first 2–3 are the note's visible tasks. */
  tasks: BoardTask[]
  /** The full photo roll — the cluster pins the first 2–3 as heroes,
      tapping any of them opens the whole thing. */
  gallery: BoardPhoto[]
}

/** Note tints for freshly pinned projects — cycled so back-to-back pins
    don't read as duplicates. */
const NEW_TINTS = ['#FBE3D4', '#F9D9EC', '#DDE9F8']

/** What the composer hands back when a new note pins — the host keeps
    these so fresh projects survive view round-trips. */
export type NewPin = { id: string; title: string; tasks: BoardTask[] }

/** A just-pinned project — the composer's title and first tasks, an
    empty fingerprint waiting for its first booking. */
const pinnedProject = (pin: NewPin, i: number): BoardProject => ({
  id: pin.id,
  title: pin.title,
  chip: 'Just pinned',
  noteColor: NEW_TINTS[i % NEW_TINTS.length],
  chipColor: '#ffffff',
  stickers: [],
  tasks: pin.tasks,
  gallery: [],
})

const BOARD: BoardProject[] = [
  {
    id: 'sisters',
    title: 'Sisters Birthday Weekend',
    chip: 'Jul 25 – 27',
    noteColor: '#F4E465',
    chipColor: '#F9D9EC',
    stickers: [
      {
        icon: '/providers/united.png',
        receipt: {
          provider: { name: 'United', icon: '/providers/united.png' },
          code: '#UA-58204',
          title: 'Flights to SFO',
          meta: ['Fri, Jul 25 · 9:40 AM · 2 travelers'],
          progress: 0.32,
          status: 'Confirmed',
          next: 'Check-in opens Jul 24',
          accent: '#60a5fa',
        },
      },
      {
        icon: '/providers/expedia.png',
        receipt: {
          provider: { name: 'Expedia', icon: '/providers/expedia.png' },
          code: '#EXP-77132',
          title: 'Hotel Healdsburg',
          meta: ['Jul 25 – 27 · 1 room · 2 guests'],
          progress: 0.45,
          status: 'Booked',
          next: 'Check-in Jul 25 · 3:00 PM',
          accent: '#fbbf24',
        },
      },
      {
        icon: '/providers/opentable.svg',
        receipt: {
          provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
          code: '#VLT-8127',
          title: 'Valette',
          meta: ['Sat, Jul 26 · 7:30 PM · 2 guests'],
          progress: 0.24,
          status: 'Confirmed',
          next: 'Table at 7:30 PM · free to cancel until 5',
        },
      },
    ],
    tasks: [
      { id: 'cake', label: 'Order the birthday cake', done: false },
      { id: 'split', label: 'Split the hotel with Anna', done: false },
      { id: 'dinner', label: 'Dinner at Valette · 7:30', done: true },
      { id: 'flights', label: 'Book flights to SFO', done: true },
      { id: 'hotel', label: 'Book Hotel Healdsburg', done: true },
      { id: 'playlist', label: 'Make the drive playlist', done: false },
    ],
    gallery: [
      {
        src: '/receipts/photos/hotel-pool.jpg',
        title: 'The pool',
        source: 'Hotel Healdsburg · Jul 25 – 27 · booked on Expedia',
        provider: { name: 'Expedia', icon: '/providers/expedia.png' },
      },
      {
        src: '/places/valette.jpg',
        title: 'Valette',
        source: 'Dinner Sat, Jul 26 · 7:30 PM · via OpenTable',
        provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
      },
      {
        src: '/receipts/photos/hotel-room.jpg',
        title: 'King room',
        source: 'Hotel Healdsburg · Jul 25 – 27 · booked on Expedia',
        provider: { name: 'Expedia', icon: '/providers/expedia.png' },
      },
      {
        src: '/receipts/photos/hotel-deck.jpg',
        title: 'The garden deck',
        source: 'Hotel Healdsburg · Jul 25 – 27 · booked on Expedia',
        provider: { name: 'Expedia', icon: '/providers/expedia.png' },
      },
    ],
  },
  {
    id: 'investors',
    title: 'Dinner with investors',
    chip: 'Thursday · 7:00 PM',
    noteColor: '#E3DCF8',
    chipColor: '#ffffff',
    stickers: [
      {
        icon: '/providers/opentable.svg',
        receipt: {
          provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
          code: '#BD-2210',
          title: 'Barndiva · Private room',
          meta: ['Thursday · 7:00 PM · 6 guests'],
          progress: 0.18,
          status: 'Confirmed',
          next: 'Room holds until 7:15 PM',
        },
      },
    ],
    tasks: [
      { id: 'holds', label: 'Send calendar holds', done: false },
      { id: 'wine', label: 'Pick the wine list', done: false },
      { id: 'room', label: 'Book the private room', done: true },
    ],
    gallery: [
      {
        src: '/places/barndiva.jpg',
        title: 'Barndiva',
        source: 'Private room · Thursday 7:00 PM · via OpenTable',
        provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
      },
      {
        src: '/receipts/photos/menu-spread.jpg',
        title: 'The tasting menu',
        source: 'Barndiva · Thursday 7:00 PM · via OpenTable',
        provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
      },
      {
        src: '/receipts/photos/menu-plate.jpg',
        title: 'First course',
        source: 'Barndiva · Thursday 7:00 PM · via OpenTable',
        provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
      },
    ],
  },
  {
    id: 'kyoto',
    title: 'Kyoto in the fall',
    chip: 'Planning · November',
    noteColor: '#DCEBDA',
    chipColor: '#ffffff',
    stickers: [],
    gallery: [
      {
        src: '/domains/travel.jpg',
        title: 'Kyoto in November',
        source: 'Saved while researching',
      },
      { src: '/domains/food.jpg', title: 'Kaiseki', source: 'Saved while researching' },
      {
        src: '/domains/dining.jpg',
        title: 'Izakaya night',
        source: 'Saved while researching',
      },
    ],
    tasks: [
      { id: 'week', label: 'Pick the travel week', done: false },
      { id: 'ryokan', label: 'Shortlist ryokans in Gion', done: false },
      { id: 'fares', label: 'Watch fares SFO → KIX', done: false },
      { id: 'teamlab', label: 'Book teamLab tickets', done: false },
      { id: 'rail', label: 'Rail pass or flights?', done: false },
      { id: 'kaiseki', label: 'Reserve a kaiseki dinner', done: false },
      { id: 'passport', label: 'Renew passport', done: false },
      { id: 'pack', label: 'Draft the pack list', done: false },
    ],
  },
]

/* ── Artifact — the board's shared physics ────────────────────────────── */

/**
 * One pinned thing on the board. Three layers, outermost first:
 * drag (free, snaps home) → entrance (staggered pop onto the board) →
 * idle drift (slow breathing loop). Base rotation lives on the content so
 * the drift oscillates around the artifact's settled tilt.
 */
function Artifact({
  x,
  y,
  w,
  rotate = 0,
  z = 10,
  delay = 0,
  drift = 1,
  focusId,
  focusPayload,
  children,
}: {
  x: number
  y: number
  /** Fixed width; height comes from content unless the child sets it. */
  w?: number
  rotate?: number
  z?: number
  delay?: number
  /** Direction/amplitude seed for the idle drift, ±. */
  drift?: number
  /** Tap-to-isolate: a stable id plus what to redraw large. Omit both
      and the artifact stays drag-only (the empty sticker slot). */
  focusId?: string
  focusPayload?: FocusPayload
  children: ReactNode
}) {
  const unpinning = useContext(UnpinContext)
  const focusCtx = useContext(FocusContext)
  const rootRef = useRef<HTMLDivElement>(null)
  // A flick shouldn't also count as a tap — same guard as the card stack.
  const dragging = useRef(false)
  const lifted = focusId != null && focusCtx.hiddenId === focusId
  // A touched piece rides on top for the whole interaction — the clone
  // flies above the board, so if the original sat under a neighbor at
  // landing, the touchdown would read as a z-jump. But the collage is
  // a curated composition: after a beat of rest the piece *tucks* back
  // to its seeded depth with a small press-down dip, and the re-layer
  // happens at the trough where the motion carries it.
  const [raised, setRaised] = useState<number | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [tucking, setTucking] = useState(false)
  useEffect(() => {
    if (raised == null || lifted || dragActive) return
    const start = window.setTimeout(() => setTucking(true), 620)
    const flip = window.setTimeout(() => setRaised(null), 830)
    const end = window.setTimeout(() => setTucking(false), 1040)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(flip)
      window.clearTimeout(end)
    }
  }, [raised, lifted, dragActive])

  const lift = () => {
    if (dragging.current || !focusId || !focusPayload) return
    setTucking(false)
    setRaised(nextTopZ())
    const el = rootRef.current
    const vp = document.getElementById('app-viewport')
    if (!el || !vp) return
    // The bounding rect is the rotated AABB — recover the unrotated box
    // from its center plus the element's layout size.
    const r = el.getBoundingClientRect()
    const vr = vp.getBoundingClientRect()
    focusCtx.open(focusId, focusPayload, {
      x: r.left + r.width / 2 - vr.left - el.offsetWidth / 2,
      y: r.top + r.height / 2 - vr.top - el.offsetHeight / 2,
      w: el.offsetWidth,
      h: el.offsetHeight,
      rotate,
    })
  }

  return (
    <motion.div
      ref={rootRef}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{
        left: x,
        top: y,
        width: w,
        zIndex: raised ?? z,
        touchAction: 'none',
        // While lifted, the clone on the focus layer is this artifact.
        // The swap is instant both ways — the clone's dissolve layer
        // sits pixel-aligned over this footprint at takeoff and landing,
        // so any fade here would only read as a blink.
        opacity: lifted ? 0 : 1,
      }}
      drag
      dragSnapToOrigin
      dragElastic={0.5}
      dragMomentum={false}
      // zIndex stays out of whileDrag — once Framer owns a value it
      // stops honoring style updates, which kept the landed note from
      // rising above the title. `raised` covers dragging too.
      whileDrag={{ scale: 1.06 }}
      onDragStart={() => {
        dragging.current = true
        setTucking(false)
        setDragActive(true)
        setRaised(nextTopZ())
      }}
      onDragEnd={() => {
        setDragActive(false)
        requestAnimationFrame(() => {
          dragging.current = false
        })
      }}
      onTap={lift}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 22, rotate: rotate * 3 }}
        animate={
          unpinning
            ? // The unpin — the piece tears off and falls past its own
              // tilt, in the same reading order the entrance staggered
              // (compressed, so the whole board clears in under half a
              // second). Gravity ease: slow release, fast fall.
              { opacity: 0, scale: 0.62, y: 120, rotate: rotate * 4 + drift * 14 }
            : tucking
              ? // The tuck — a soft press into the pile; the z restore
                // fires at the trough, hidden inside the dip.
                { opacity: 1, scale: [1, 0.955, 1], y: 0, rotate }
              : { opacity: 1, scale: 1, y: 0, rotate }
        }
        transition={
          unpinning
            ? { delay: delay * 0.22, duration: 0.34, ease: [0.5, 0, 0.85, 0.4] }
            : tucking
              ? { duration: 0.42, ease: 'easeInOut', times: [0, 0.5, 1] }
              : { delay, type: 'spring', stiffness: 220, damping: 20 }
        }
      >
        <motion.div
          animate={{ y: [0, drift * -4, 0], rotate: [0, drift * 1.2, 0] }}
          transition={{
            duration: 5.4 + Math.abs(drift) * 1.6,
            delay: delay + 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/* ── The board's vocabulary ───────────────────────────────────────────── */

function Photo({ src, h }: { src: string; h: number }) {
  return (
    <div
      className="w-full overflow-hidden rounded-[20px] shadow-[0_14px_34px_-12px_rgba(20,16,28,0.4)]"
      style={{ height: h }}
    >
      <img src={src} alt="" draggable={false} className="size-full object-cover" />
    </div>
  )
}

/** The project's name — a white bubble floating over its collage, the same
    move as a caption pinned to a photo wall. */
function TitleBubble({ children }: { children: string }) {
  return (
    <span className="inline-block rounded-full bg-white px-4 py-2.5 text-[13px] font-medium whitespace-nowrap tracking-[-0.01em] text-ink shadow-[0_10px_28px_-10px_rgba(20,16,28,0.35)]">
      {children}
    </span>
  )
}

function MetaChip({ children, color }: { children: string; color: string }) {
  return (
    <span
      className="inline-block rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-ink/80 shadow-[0_8px_20px_-8px_rgba(20,16,28,0.3)]"
      style={{ background: color }}
    >
      {children}
    </span>
  )
}

/** Round provider sticker — the marks a project collects as it books. */
function Sticker({ icon }: { icon: string }) {
  return (
    <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_8px_22px_-8px_rgba(20,16,28,0.38)] ring-2 ring-white">
      <img src={icon} alt="" draggable={false} className="size-11 object-contain" />
    </span>
  )
}

/** A project with no bookings yet — the sticker slot waits, dashed. */
function EmptySticker() {
  return (
    <span className="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-ink/25 bg-white/40">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 2v10M2 7h10" stroke="rgba(23,23,23,0.4)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function TaskCheck({ done }: { done: boolean }) {
  return done ? (
    <span className="mt-[2px] flex size-[15px] shrink-0 items-center justify-center rounded-full bg-ink">
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path
          d="M1.5 5.5 4 8l4.5-6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ) : (
    <span className="mt-[2px] size-[15px] shrink-0 rounded-full border-[1.5px] border-ink/30" />
  )
}

/** How many of the note's tasks read in full before folding into "+N more". */
const NOTE_VISIBLE = 3

/** The sticky note — where the project's work is legible. Badge counts the
    open tasks; the top few read inline; the rest fold away. */
function TaskNote({ project, badge = true }: { project: BoardProject; badge?: boolean }) {
  // Live state, not the seed — a check-off in the focused note has to
  // read back here the moment the note returns to the board.
  const { tasksById } = useContext(TasksContext)
  const tasks = tasksById[project.id] ?? project.tasks
  const open = tasks.filter((t) => !t.done).length
  const done = tasks.length - open
  const visible = tasks.slice(0, NOTE_VISIBLE)
  const hidden = tasks.length - visible.length
  return (
    <div
      className="relative rounded-[22px] px-4 pt-3.5 pb-4 shadow-[0_16px_38px_-14px_rgba(20,16,28,0.42)]"
      style={{ background: project.noteColor }}
    >
      {/* Open-task count — the one number the board must surface. Off
          when this render is the focus flight's dissolve layer (it gets
          clipped there; the clone carries a free-floating copy). */}
      {badge && (
        <span
          aria-label={`${open} open tasks`}
          className="absolute -top-2.5 -right-2.5 flex size-8 rotate-6 items-center justify-center rounded-full bg-[#131117] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(20,16,28,0.5)]"
        >
          {open}
        </span>
      )}

      <div className="flex items-baseline gap-1.5 pb-2">
        <p className="text-[10px] font-semibold tracking-[0.09em] text-ink/55 uppercase">Tasks</p>
        <p className="text-[10px] font-medium text-ink/40">
          {done}/{tasks.length}
        </p>
      </div>

      <div className="flex flex-col gap-[7px]">
        {visible.map((t) => (
          <div key={t.id} className="flex items-start gap-2">
            <TaskCheck done={t.done} />
            <span
              className={`text-[12px] leading-[1.3] tracking-[-0.01em] ${
                t.done ? 'text-ink/40 line-through decoration-ink/30' : 'text-ink/90'
              }`}
            >
              {t.label}
            </span>
          </div>
        ))}
      </div>

      {hidden > 0 && (
        <p className="pt-2.5 text-right text-[11px] font-medium text-ink/45">+{hidden} more</p>
      )}
    </div>
  )
}

/* ── Clusters — one hand-placed collage per project ───────────────────── */

/** Entrance stagger: clusters land in reading order, artifacts within a
    cluster a beat apart. */
const at = (cluster: number, item: number) => 0.1 + cluster * 0.16 + item * 0.055

function SistersCluster({ p }: { p: BoardProject }) {
  return (
    <div className="relative" style={{ height: 332 }}>
      <Artifact
        x={46}
        y={40}
        w={158}
        rotate={7}
        z={5}
        delay={at(0, 1)}
        drift={-1}
        focusId={`${p.id}-photo-1`}
        focusPayload={{ kind: 'gallery', projectId: p.id, src: '/places/valette.jpg' }}
      >
        <Photo src="/places/valette.jpg" h={188} />
      </Artifact>
      <Artifact
        x={8}
        y={16}
        w={170}
        rotate={-5}
        z={10}
        delay={at(0, 0)}
        drift={1}
        focusId={`${p.id}-photo-0`}
        focusPayload={{
          kind: 'gallery',
          projectId: p.id,
          src: '/receipts/photos/hotel-pool.jpg',
        }}
      >
        <Photo src="/receipts/photos/hotel-pool.jpg" h={205} />
      </Artifact>
      <Artifact
        x={24}
        y={198}
        rotate={-3}
        z={30}
        delay={at(0, 3)}
        drift={0.8}
        focusId={`${p.id}-title`}
        focusPayload={{ kind: 'title', text: p.title }}
      >
        <TitleBubble>{p.title}</TitleBubble>
      </Artifact>
      <Artifact
        x={126}
        y={-4}
        rotate={4}
        z={20}
        delay={at(0, 4)}
        drift={-0.7}
        focusId={`${p.id}-chip`}
        focusPayload={{ kind: 'chip', text: p.chip, color: p.chipColor }}
      >
        <MetaChip color={p.chipColor}>{p.chip}</MetaChip>
      </Artifact>
      <Artifact
        x={162}
        y={62}
        w={158}
        rotate={3}
        z={15}
        delay={at(0, 2)}
        drift={-0.9}
        focusId={`${p.id}-tasks`}
        focusPayload={{ kind: 'tasks', projectId: p.id }}
      >
        <TaskNote project={p} />
      </Artifact>
      <Artifact
        x={160}
        y={236}
        rotate={-8}
        z={25}
        delay={at(0, 5)}
        drift={1.1}
        focusId={`${p.id}-sticker-0`}
        focusPayload={{ kind: 'receipt', ...p.stickers[0] }}
      >
        <Sticker icon={p.stickers[0].icon} />
      </Artifact>
      <Artifact
        x={272}
        y={-2}
        rotate={10}
        z={12}
        delay={at(0, 6)}
        drift={-1.2}
        focusId={`${p.id}-sticker-1`}
        focusPayload={{ kind: 'receipt', ...p.stickers[1] }}
      >
        <Sticker icon={p.stickers[1].icon} />
      </Artifact>
      <Artifact
        x={272}
        y={252}
        rotate={-6}
        z={25}
        delay={at(0, 7)}
        drift={0.9}
        focusId={`${p.id}-sticker-2`}
        focusPayload={{ kind: 'receipt', ...p.stickers[2] }}
      >
        <Sticker icon={p.stickers[2].icon} />
      </Artifact>
    </div>
  )
}

function InvestorsCluster({ p }: { p: BoardProject }) {
  return (
    <div className="relative" style={{ height: 292 }}>
      <Artifact
        x={148}
        y={50}
        w={144}
        rotate={-7}
        z={5}
        delay={at(1, 1)}
        drift={1}
        focusId={`${p.id}-photo-1`}
        focusPayload={{
          kind: 'gallery',
          projectId: p.id,
          src: '/receipts/photos/menu-spread.jpg',
        }}
      >
        <Photo src="/receipts/photos/menu-spread.jpg" h={172} />
      </Artifact>
      <Artifact
        x={168}
        y={16}
        w={150}
        rotate={5}
        z={10}
        delay={at(1, 0)}
        drift={-1}
        focusId={`${p.id}-photo-0`}
        focusPayload={{ kind: 'gallery', projectId: p.id, src: '/places/barndiva.jpg' }}
      >
        <Photo src="/places/barndiva.jpg" h={190} />
      </Artifact>
      <Artifact
        x={140}
        y={196}
        rotate={2}
        z={30}
        delay={at(1, 3)}
        drift={-0.8}
        focusId={`${p.id}-title`}
        focusPayload={{ kind: 'title', text: p.title }}
      >
        <TitleBubble>{p.title}</TitleBubble>
      </Artifact>
      <Artifact
        x={40}
        y={-2}
        rotate={-4}
        z={20}
        delay={at(1, 4)}
        drift={0.7}
        focusId={`${p.id}-chip`}
        focusPayload={{ kind: 'chip', text: p.chip, color: p.chipColor }}
      >
        <MetaChip color={p.chipColor}>{p.chip}</MetaChip>
      </Artifact>
      <Artifact
        x={10}
        y={52}
        w={162}
        rotate={-3}
        z={15}
        delay={at(1, 2)}
        drift={0.9}
        focusId={`${p.id}-tasks`}
        focusPayload={{ kind: 'tasks', projectId: p.id }}
      >
        <TaskNote project={p} />
      </Artifact>
      <Artifact
        x={224}
        y={-8}
        rotate={-10}
        z={25}
        delay={at(1, 5)}
        drift={-1.1}
        focusId={`${p.id}-sticker-0`}
        focusPayload={{ kind: 'receipt', ...p.stickers[0] }}
      >
        <Sticker icon={p.stickers[0].icon} />
      </Artifact>
    </div>
  )
}

function KyotoCluster({ p }: { p: BoardProject }) {
  return (
    <div className="relative" style={{ height: 318 }}>
      <Artifact
        x={34}
        y={54}
        w={152}
        rotate={-8}
        z={5}
        delay={at(2, 1)}
        drift={-1}
        focusId={`${p.id}-photo-1`}
        focusPayload={{ kind: 'gallery', projectId: p.id, src: '/domains/food.jpg' }}
      >
        <Photo src="/domains/food.jpg" h={178} />
      </Artifact>
      <Artifact
        x={6}
        y={22}
        w={164}
        rotate={6}
        z={10}
        delay={at(2, 0)}
        drift={1}
        focusId={`${p.id}-photo-0`}
        focusPayload={{ kind: 'gallery', projectId: p.id, src: '/domains/travel.jpg' }}
      >
        <Photo src="/domains/travel.jpg" h={196} />
      </Artifact>
      <Artifact
        x={30}
        y={206}
        rotate={-2}
        z={30}
        delay={at(2, 3)}
        drift={0.8}
        focusId={`${p.id}-title`}
        focusPayload={{ kind: 'title', text: p.title }}
      >
        <TitleBubble>{p.title}</TitleBubble>
      </Artifact>
      <Artifact
        x={118}
        y={0}
        rotate={3}
        z={20}
        delay={at(2, 4)}
        drift={-0.7}
        focusId={`${p.id}-chip`}
        focusPayload={{ kind: 'chip', text: p.chip, color: p.chipColor }}
      >
        <MetaChip color={p.chipColor}>{p.chip}</MetaChip>
      </Artifact>
      <Artifact
        x={164}
        y={58}
        w={158}
        rotate={-4}
        z={15}
        delay={at(2, 2)}
        drift={-0.9}
        focusId={`${p.id}-tasks`}
        focusPayload={{ kind: 'tasks', projectId: p.id }}
      >
        <TaskNote project={p} />
      </Artifact>
      {/* No bookings yet — the fingerprint slot sits empty, waiting.
          Nothing to isolate either, so it stays drag-only. */}
      <Artifact x={176} y={252} rotate={5} z={25} delay={at(2, 5)} drift={1.1}>
        <EmptySticker />
      </Artifact>
    </div>
  )
}

/** A cluster for a just-pinned project: no photos yet — a blank note, a
    "Just pinned" chip, an empty sticker slot. Mounts after the board's
    entrance, so its own stagger starts near zero. */
function NewCluster({ p }: { p: BoardProject }) {
  return (
    <div className="relative" style={{ height: 236 }}>
      <Artifact
        x={22}
        y={22}
        w={172}
        rotate={-4}
        z={15}
        delay={0.05}
        drift={0.9}
        focusId={`${p.id}-tasks`}
        focusPayload={{ kind: 'tasks', projectId: p.id }}
      >
        <TaskNote project={p} />
      </Artifact>
      <Artifact
        x={196}
        y={10}
        rotate={4}
        z={20}
        delay={0.16}
        drift={-0.7}
        focusId={`${p.id}-chip`}
        focusPayload={{ kind: 'chip', text: p.chip, color: p.chipColor }}
      >
        <MetaChip color={p.chipColor}>{p.chip}</MetaChip>
      </Artifact>
      <Artifact
        x={36}
        y={148}
        rotate={-2}
        z={30}
        delay={0.11}
        drift={0.8}
        focusId={`${p.id}-title`}
        focusPayload={{ kind: 'title', text: p.title }}
      >
        <TitleBubble>{p.title}</TitleBubble>
      </Artifact>
      {/* Nothing booked yet — the fingerprint slot waits, dashed. */}
      <Artifact x={232} y={124} rotate={7} z={25} delay={0.22} drift={1.1}>
        <EmptySticker />
      </Artifact>
    </div>
  )
}

/* ── The focus layer — one artifact lifted off the board ──────────────── */

/** The agent-is-thinking beat inside the prompt bubble. */
function PromptDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-white/60"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

/** The task note at focus size — the whole list legible, and the work
    is workable: circles check off in place, labels raise the assistant
    ("want me to handle it?"), and the foot of the note takes new tasks.
    `clipFrom` is the container-transform's other half: the card starts
    clipped to the small note's proportional height and unfolds to its
    full self in step with the clone's scale, so the paper grows as one
    surface instead of gaining a tail at takeoff. `dissolve` renders
    inside that clip, above the card — the small note's likeness,
    cropped by the same morphing bounds so it can never overhang. */
function FocusedTaskNote({
  projectId,
  clipFrom,
  dissolve,
}: {
  projectId: string
  clipFrom?: number
  dissolve?: ReactNode
}) {
  const { projects, tasksById, toggle, add } = useContext(TasksContext)
  const project = projects.find((p) => p.id === projectId)
  const tasks = tasksById[projectId] ?? []
  const open = tasks.filter((t) => !t.done).length
  const done = tasks.length - open

  // The assistant offer — raised by tapping a task's words (the circle
  // is the manual path; the words are the "do it for me" path).
  const [ask, setAsk] = useState<BoardTask | null>(null)
  const [working, setWorking] = useState(false)
  const handle = () => {
    if (!ask || working) return
    setWorking(true)
    window.setTimeout(() => {
      toggle(projectId, ask.id)
      setWorking(false)
      setAsk(null)
    }, 1200)
  }

  // Adding — the affordance becomes an input in place.
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const commit = () => {
    const label = draft.trim()
    if (label) add(projectId, label)
    setDraft('')
    setAdding(false)
  }

  // The unfold tweens toward a *measured number*, never 'auto' —
  // Framer resolves 'auto' through the ancestor's scale mid-flight,
  // so the clip would glide to a transform-shrunken height and snap
  // open at the end. offsetHeight is transform-immune; the observer
  // keeps the number honest when content grows later (new tasks,
  // the add-input).
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (clipFrom == null) return
    const el = cardRef.current
    if (!el) return
    setCardH(el.offsetHeight)
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [clipFrom])

  if (!project) return null
  return (
    <div className="relative flex flex-col gap-3">
      {/* Badge rides outside the clip — it hangs over the corner. */}
      <span
        aria-label={`${open} open tasks`}
        className="absolute -top-3 -right-3 z-10 flex size-9 rotate-6 items-center justify-center rounded-full bg-[#131117] text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(20,16,28,0.5)]"
      >
        {open}
      </span>
      <motion.div
        data-focus-clip
        className="relative overflow-hidden rounded-[26px] shadow-[0_24px_60px_-18px_rgba(20,16,28,0.5)]"
        initial={clipFrom != null ? { height: clipFrom } : false}
        animate={clipFrom != null ? { height: cardH ?? clipFrom } : undefined}
        // Both legs mirror the clone wrapper's tweens exactly, so height
        // and scale move as one surface and land on the same frame.
        exit={
          clipFrom != null
            ? { height: clipFrom, transition: { duration: 0.3, ease: EASE } }
            : undefined
        }
        transition={{ duration: 0.45, ease: EASE }}
      >
      <div ref={cardRef} className="px-5 pt-4 pb-4" style={{ background: project.noteColor }}>
        <div className="flex items-baseline gap-1.5 pb-2.5">
          <p className="text-[10.5px] font-semibold tracking-[0.09em] text-ink/55 uppercase">
            Tasks
          </p>
          <p className="text-[10.5px] font-medium text-ink/40">
            {done}/{tasks.length}
          </p>
        </div>

        <div className="flex flex-col">
          {/* No entrance stagger on the rows — the note is one piece of
              paper in flight, and content popping mid-glide reads as
              jitter, not development. */}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-start gap-2.5 py-[5px]">
              {/* The manual path — check it off yourself. */}
              <button
                type="button"
                aria-label={t.done ? `Reopen “${t.label}”` : `Mark “${t.label}” done`}
                onClick={() => toggle(projectId, t.id)}
                // flex, so the check span is a flex item — as a plain
                // inline child its 15px size would collapse to a sliver.
                className="-m-1 flex p-1 outline-none transition-transform duration-150 ease-out active:scale-90"
              >
                <TaskCheck done={t.done} />
              </button>
              {/* The delegated path — the words raise the assistant. */}
              <button
                type="button"
                onClick={() => {
                  if (t.done) return
                  setAsk(t)
                }}
                className={`text-left text-[13.5px] leading-[1.35] tracking-[-0.01em] outline-none ${
                  t.done ? 'text-ink/40 line-through decoration-ink/30' : 'text-ink/90'
                }`}
              >
                {t.label}
              </button>
            </div>
          ))}
        </div>

        {/* New work lands at the foot of the note. */}
        <div className="mt-2 border-t border-ink/10 pt-2.5">
          {adding ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') {
                  setDraft('')
                  setAdding(false)
                }
              }}
              onBlur={commit}
              placeholder="New task"
              className="w-full rounded-[12px] bg-white/55 px-3 py-2 text-[13px] tracking-[-0.01em] text-ink placeholder:text-ink/35 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 py-1 text-[12.5px] font-medium text-ink/55 outline-none transition-colors duration-150 active:text-ink/80"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Add a task
            </button>
          )}
        </div>
      </div>
      {dissolve}
      </motion.div>

      {/* The assistant's offer — tap a task's words and it leans in. */}
      <AnimatePresence>
        {ask && (
          <motion.div
            key={ask.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="rounded-[22px] bg-[#131117] p-4 shadow-[0_20px_50px_-16px_rgba(20,16,28,0.55)]"
          >
            {working ? (
              <div className="flex items-center gap-2.5 py-1">
                <PromptDots />
                <p className="text-[12.5px] tracking-[-0.01em] text-white/80">
                  On it — lining this up…
                </p>
              </div>
            ) : (
              <>
                <p className="text-[12.5px] leading-[1.45] tracking-[-0.01em] text-white/85">
                  Want me to take care of &ldquo;{ask.label}&rdquo;?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handle}
                    className="rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-ink outline-none transition-transform duration-150 ease-out active:scale-95"
                  >
                    Do it
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsk(null)}
                    className="rounded-full bg-white/12 px-4 py-2 text-[12px] font-medium text-white/85 outline-none transition-transform duration-150 ease-out active:scale-95"
                  >
                    Not now
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The lifted artifact itself — a clone that flies from where it sat to
    its focus pose and back. Photos and the task note grow (width/height
    animate, content reflows); the small paper pieces scale up whole. */
function FocusClone({ focus }: { focus: Focus }) {
  const { payload, from, frame } = focus
  const { projects, tasksById } = useContext(TasksContext)

  let target: Record<string, number>
  let content: ReactNode
  let fixedWidth: number | undefined
  if (payload.kind === 'tasks') {
    // A true container transform — every part sworn to opacity 1 on the
    // container: the wrapper *scales* from the note's footprint
    // (animating width would re-wrap every label mid-flight), the
    // focused card unfolds its height in step, and a pixel-aligned
    // likeness of the small note dissolves on top, cropped inside the
    // same morphing bounds so it can never overhang. The takeoff and
    // landing swaps happen under that likeness, invisible.
    const W = Math.min(310, frame.w - 48)
    fixedWidth = W
    // The dissolve layer's constant enlargement: small-note layout
    // blown up to the focus width, so it tracks the wrapper's scale.
    const K = W / from.w
    const project = projects.find((p) => p.id === payload.projectId)
    const openCount = (tasksById[payload.projectId] ?? []).filter((t) => !t.done).length
    // One fade for the likeness and its badge: out early on the way up,
    // back in fully before touchdown.
    const dissolveAnim = {
      initial: { opacity: 1 },
      animate: { opacity: 0, transition: { duration: 0.24, ease: 'easeOut' as const } },
      exit: {
        opacity: 1,
        transition: { duration: 0.16, ease: 'easeOut' as const, delay: 0.1 },
      },
    }
    target = {
      x: (frame.w - W) / 2,
      y: Math.max(84, frame.h * 0.12),
      scale: 1,
      rotate: 0,
    }
    content = project && (
      <>
        <FocusedTaskNote
          projectId={payload.projectId}
          clipFrom={from.h * K}
          dissolve={
            <motion.div
              {...dissolveAnim}
              className="pointer-events-none absolute top-0 left-0"
              style={{ width: from.w, transformOrigin: 'top left', scale: K }}
            >
              <TaskNote project={project} badge={false} />
            </motion.div>
          }
        />
        {/* The small note's badge hangs past the card's corner, so its
            likeness rides outside the clip — same fade as the rest. */}
        <motion.div
          {...dissolveAnim}
          className="pointer-events-none absolute top-0 left-0 z-20"
          style={{
            width: from.w,
            height: from.h,
            transformOrigin: 'top left',
            scale: K,
          }}
        >
          <span className="absolute -top-2.5 -right-2.5 flex size-8 rotate-6 items-center justify-center rounded-full bg-[#131117] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(20,16,28,0.5)]">
            {openCount}
          </span>
        </motion.div>
      </>
    )
  } else {
    // The small paper pieces — title, chip, provider mark — scale up
    // whole. A mark flies to a higher seat: it's the face of a booking,
    // and its receipt needs the room beneath.
    const S = payload.kind === 'receipt' ? 1.9 : 1.5
    target = {
      x: (frame.w - from.w * S) / 2,
      y: (payload.kind === 'receipt' ? frame.h * 0.14 : frame.h * 0.4) - (from.h * S) / 2,
      scale: S,
      rotate: -2,
    }
    content =
      payload.kind === 'title' ? (
        <TitleBubble>{payload.text}</TitleBubble>
      ) : payload.kind === 'chip' ? (
        <MetaChip color={payload.color}>{payload.text}</MetaChip>
      ) : payload.kind === 'receipt' ? (
        <Sticker icon={payload.icon} />
      ) : null
  }

  const fromPose: Record<string, number> = { x: from.x, y: from.y, rotate: from.rotate }
  if (payload.kind === 'tasks') {
    // Scaled down to the small note's width — never any opacity on the
    // clone itself, the dissolve layer inside handles the content.
    fromPose.scale = from.w / (fixedWidth ?? from.w)
  } else {
    fromPose.scale = 1
  }

  return (
    <>
      <motion.div
        data-focus-clone
        className="absolute top-0 left-0 z-10"
        style={{ transformOrigin: 'top left', width: fixedWidth }}
        initial={fromPose}
        animate={{
          ...target,
          // A tween, not a spring — the card's height unfold uses the
          // same curve and duration, and the two must never drift apart.
          transition: { duration: 0.45, ease: EASE },
        }}
        exit={{ ...fromPose, transition: { duration: 0.3, ease: EASE } }}
      >
        {content}
      </motion.div>

      {/* The mark's booking, unfurled beneath it — the receipt object the
          rest of the app already trades in. It develops in once the mark
          has climbed, and slips away first on the flight home. */}
      {payload.kind === 'receipt' && (
        <motion.div
          className="absolute inset-x-0 z-10 flex justify-center px-7"
          style={{ top: frame.h * 0.14 + (from.h * 1.9) / 2 + 24 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.32, ease: EASE } }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.16, ease: 'easeIn' } }}
        >
          <div className="w-full max-w-[330px]">
            <ReceiptObject content={payload.receipt} />
          </div>
        </motion.div>
      )}
    </>
  )
}

/* ── The gallery — a project's photo roll, flattened ──────────────────── */

/** The roll's side gutters — slides run near full bleed. */
const ROLL_GUTTER = 24
/** Fixed meta strip under each shot — constant row math is what lets the
    flight land exactly on the tapped shot's seat in the roll. */
const META_H = 54
const ROLL_GAP = 26

/**
 * The tapped photo flies off the board and lands in its seat in a flat
 * vertical roll — no stack at focus altitude. Portrait, near-full-bleed
 * shots read top to bottom like a lookbook; under each one a meta strip:
 * a note (editable in place) and its provenance — the booking or place
 * it came from, or "Added by you". The roll's open end takes more photos
 * from disk. It lives *under* the dock, so the voice orb stays present
 * and live the whole time.
 */
function GalleryFocus({
  focus,
  pool,
  onCaption,
  onAddPhotos,
  onClose,
}: {
  focus: Focus
  pool: BoardPhoto[]
  onCaption: (index: number, text: string) => void
  onAddPhotos: (srcs: string[]) => void
  onClose: () => void
}) {
  const { payload, from, frame } = focus
  const src = payload.kind === 'gallery' ? payload.src : ''
  const slideW = frame.w - ROLL_GUTTER * 2
  // Portrait — the shots read as a lookbook, not thumbnails.
  const slideH = Math.round(slideW * 1.25)
  const rowH = slideH + META_H + ROLL_GAP
  const padTop = Math.max(76, Math.round(frame.h * 0.1))
  const startIdx = Math.max(
    0,
    pool.findIndex((ph) => ph.src === src),
  )

  // The flight lands, then the roll takes over — the tapped shot sits
  // exactly where the clone stopped, so the handoff is invisible.
  const [landed, setLanded] = useState(false)

  // Pre-seat the roll on the tapped shot before it's ever visible. The
  // scroll can clamp near the roll's end, so the flight aims at where
  // the shot *actually* sits, not where the math wishes it did.
  const [landY, setLandY] = useState(padTop)
  const scrollerRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = startIdx * rowH
    setLandY(padTop + startIdx * rowH - el.scrollTop)
    // Seat once at mount — later scrolls belong to the user's thumb.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Uploads land at the roll's open end — glide the first new one in.
  const fileRef = useRef<HTMLInputElement>(null)
  const prevLen = useRef(pool.length)
  useEffect(() => {
    if (pool.length > prevLen.current) {
      scrollerRef.current?.scrollTo({ top: prevLen.current * rowH, behavior: 'smooth' })
    }
    prevLen.current = pool.length
  }, [pool.length, rowH])

  // The way home mirrors the way in: on close, the tapped shot lifts
  // out of its seat (wherever the scroll has carried it) and flies
  // back to its board footprint while the roll melts away — the layer
  // only unmounts once the shot has touched down. `closing` holds the
  // seat's current y so the flight starts from the truth.
  const [closing, setClosing] = useState<{ y: number } | null>(null)
  const close = () => {
    if (closing) return
    // Mid-entrance there's no seated shot to fly home yet — just let
    // the layer fade the old way.
    if (!landed) {
      onClose()
      return
    }
    setClosing({ y: padTop + startIdx * rowH - (scrollerRef.current?.scrollTop ?? 0) })
  }

  // Background taps dismiss (padding and row gaps only — never a photo
  // or an input); the close chip is the always-there way out.
  const closeOnSelf = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close()
  }

  return (
    <div className="absolute inset-0 z-[35]">
      <motion.div
        className="absolute inset-0 bg-[rgba(250,250,250,0.9)] backdrop-blur-[10px]"
        initial={{ opacity: 0 }}
        // easeIn on the way out — the veil stays heavy while the shot
        // is still large and only clears as it touches down.
        animate={
          closing
            ? { opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } }
            : { opacity: 1, transition: { duration: 0.3, ease: EASE } }
        }
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        onClick={close}
      />

      {/* The return flight — the tapped shot lifts out of its seat and
          shrinks back onto its board footprint, radius morphing to the
          board print's. Touchdown is what unmounts the layer. */}
      {closing && (
        <motion.div
          className="pointer-events-none absolute top-0 left-0 z-10"
          initial={{
            x: ROLL_GUTTER,
            y: closing.y,
            width: slideW,
            height: slideH,
            rotate: 0,
            borderRadius: 24,
          }}
          animate={{
            x: from.x,
            y: from.y,
            width: from.w,
            height: from.h,
            rotate: from.rotate,
            borderRadius: 20,
            transition: { duration: 0.4, ease: EASE },
          }}
          onAnimationComplete={onClose}
          style={{
            overflow: 'hidden',
            boxShadow: '0 30px 70px -20px rgba(20,16,28,0.45)',
          }}
        >
          <img
            src={pool[startIdx]?.src ?? src}
            alt=""
            draggable={false}
            className="size-full object-cover"
          />
        </motion.div>
      )}

      {/* The flight — the board print grows into its seat in the roll. */}
      {!landed && (
        <motion.div
          className="absolute top-0 left-0 z-10"
          initial={{ x: from.x, y: from.y, width: from.w, height: from.h, rotate: from.rotate }}
          animate={{
            x: ROLL_GUTTER,
            y: landY,
            width: slideW,
            height: slideH,
            rotate: 0,
            transition: { duration: 0.45, ease: EASE },
          }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          onAnimationComplete={() => setLanded(true)}
        >
          <div className="size-full overflow-hidden rounded-[24px] shadow-[0_30px_70px_-20px_rgba(20,16,28,0.55)]">
            <img src={src} alt="" draggable={false} className="size-full object-cover" />
          </div>
        </motion.div>
      )}

      {/* The roll — hidden under the flight, revealed at touchdown. */}
      <motion.div
        ref={scrollerRef}
        className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingTop: padTop,
          paddingBottom: 200,
          paddingLeft: ROLL_GUTTER,
          paddingRight: ROLL_GUTTER,
          pointerEvents: closing ? 'none' : undefined,
        }}
        initial={false}
        // On close the roll drops fast — the flying shot is the story,
        // and its seat-mates shouldn't linger around an empty seat.
        animate={{ opacity: landed && !closing ? 1 : 0 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ duration: closing ? 0.2 : 0.18, ease: EASE }}
        onClick={closeOnSelf}
      >
        <div className="flex flex-col" style={{ gap: ROLL_GAP }} onClick={closeOnSelf}>
          {pool.map((ph, i) => (
            <figure key={`${ph.src}-${i}`} className="m-0" style={{ height: slideH + META_H }}>
              <div
                className="overflow-hidden rounded-[24px] shadow-[0_30px_70px_-20px_rgba(20,16,28,0.45)]"
                style={{ height: slideH }}
              >
                <img src={ph.src} alt="" draggable={false} className="size-full object-cover" />
              </div>
              {/* Every note edits in place — derived meta is just the
                  starting text. The provenance line stays the record:
                  the provider's mark plus place · dates · provider. */}
              <figcaption className="mt-2.5 px-1.5">
                <input
                  value={ph.title}
                  onChange={(e) => onCaption(i, e.target.value)}
                  placeholder="Add a note…"
                  aria-label="Photo note"
                  className="w-full bg-transparent text-[13.5px] font-medium tracking-[-0.01em] text-ink outline-none placeholder:text-ink/35"
                />
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink/45">
                  {ph.provider && (
                    <img
                      src={ph.provider.icon}
                      alt={ph.provider.name}
                      draggable={false}
                      className="size-[15px] shrink-0 rounded-full bg-white object-contain ring-1 ring-black/8"
                    />
                  )}
                  <span className="truncate">{ph.source}</span>
                </p>
              </figcaption>
            </figure>
          ))}

          {/* The open end — more photos, from disk, for real. */}
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2.5 rounded-[24px] border-2 border-dashed border-ink/20 bg-white/45 outline-none transition-colors duration-150 active:bg-white/70"
              style={{ height: Math.round(slideH * 0.45) }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="text-ink/50"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[13px] font-medium text-ink/60">Add photos</span>
            </button>
            <p className="mt-2.5 px-1.5 text-[11.5px] text-ink/45">From your library</p>
          </div>
        </div>
      </motion.div>

      {/* Soft veils at both ends — the dock and orb need a wash to read
          over full-bleed photos, and rows leaving the top shouldn't run
          into the close chip at full strength. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[104px]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(250,250,250,0.96) 0%, rgba(250,250,250,0.7) 55%, rgba(250,250,250,0) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: landed ? 1 : 0 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        transition={{ duration: 0.25, ease: EASE }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[220px]"
        style={{
          background:
            'linear-gradient(to top, rgba(250,250,250,0.96) 0%, rgba(250,250,250,0.85) 40%, rgba(250,250,250,0) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: landed ? 1 : 0 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        transition={{ duration: 0.25, ease: EASE }}
      />

      {/* The way out — the roll fills the frame, so the exit rides on
          top instead of hiding in scrim gutters. */}
      <motion.button
        type="button"
        aria-label="Close gallery"
        onClick={onClose}
        className="absolute right-5 z-20 flex size-9 items-center justify-center rounded-full bg-[#131117] text-white shadow-[0_10px_26px_-8px_rgba(20,16,28,0.5)] outline-none transition-transform duration-150 ease-out active:scale-90"
        style={{ top: 'max(var(--safe-top), 18px)' }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.35, duration: 0.25, ease: EASE } }}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </motion.button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onAddPhotos(files.map((f) => URL.createObjectURL(f)))
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** Scrim + clone, portaled over the whole frame (above the dock). The
    board keeps breathing beneath, dimmed to background. The gallery is
    the exception — it rides its own screen-layer portal so the dock
    stays on top. */
function FocusLayer({
  focus,
  onClose,
  onGone,
}: {
  focus: Focus | null
  onClose: () => void
  /** Fires once the clone has landed back — the original re-appears. */
  onGone: () => void
}) {
  return (
    <AnimatePresence onExitComplete={onGone}>
      {focus && (
        <div key={focus.id} className="absolute inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-[rgba(250,250,250,0.82)] backdrop-blur-[10px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // easeIn over the full flight home — the veil stays heavy
            // while the note is still enlarged and only clears as it
            // touches down, so the board never sharpens around a
            // half-sized note.
            exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={onClose}
          />
          <FocusClone focus={focus} />
        </div>
      )}
    </AnimatePresence>
  )
}

/* ── The composer — a new note raised fresh off the notch ─────────────── */

/** A dictated line handed down from the host's voice orb — `seq` marks
    each utterance as new so the composer processes it exactly once. */
export type SpokenLine = { text: string; seq: number }

/** Shape an utterance into a note title — same grammar as the grid's
    drafts: drop conversational lead-ins, cap the length, capitalize. */
function shapeTitle(utterance: string) {
  const bare = utterance
    .replace(/^\s*(help me|let'?s|i want to|i need to|can you|please|new project[:,]?)\s+/i, '')
    .trim()
  const cut = bare.length > 42 ? `${bare.slice(0, 42).trimEnd()}…` : bare
  return cut.charAt(0).toUpperCase() + cut.slice(1)
}

/** The new-project experience: a blank sticky note scales up out of the
    composer zone and hangs just above it — name it at the head, stack
    the first tasks at the foot, and pin it. The scrim commits too
    (whatever's written sticks); a note with nothing on it simply doesn't
    pin — no husks. The voice orb stays live beneath: the first thing
    said names the note, and every utterance after lands as a task. */
function NoteComposer({
  tint,
  spoken,
  onDone,
}: {
  tint: string
  spoken?: SpokenLine | null
  onDone: (pin: NewPin | null) => void
}) {
  const [title, setTitle] = useState('')
  const [tasks, setTasks] = useState<BoardTask[]>([])
  const [draft, setDraft] = useState('')

  // Dictation — seeded with the current seq so an utterance spoken into
  // an earlier composer never replays into this one.
  const seenSeq = useRef(spoken?.seq ?? 0)
  useEffect(() => {
    if (!spoken || spoken.seq === seenSeq.current) return
    seenSeq.current = spoken.seq
    const text = spoken.text.trim()
    if (!text) return
    if (!title.trim()) {
      setTitle(shapeTitle(text))
    } else {
      setTasks((t) => [
        ...t,
        { id: `t-${Date.now()}`, label: text.charAt(0).toUpperCase() + text.slice(1), done: false },
      ])
    }
  }, [spoken, title])

  const pushDraft = () => {
    const label = draft.trim()
    if (!label) return
    setTasks((t) => [...t, { id: `t-${Date.now()}`, label, done: false }])
    setDraft('')
  }
  const commit = () => {
    // Half-typed task text counts — leaving mid-word shouldn't lose it.
    const label = draft.trim()
    const finalTasks = label
      ? [...tasks, { id: `t-${Date.now()}`, label, done: false }]
      : tasks
    const name = title.trim()
    if (!name && finalTasks.length === 0) {
      onDone(null)
      return
    }
    onDone({ id: `pin-${Date.now()}`, title: name || 'New project', tasks: finalTasks })
  }

  return (
    // z-[35]: under the dock (z-40) on purpose — the voice orb persists
    // through the composer, so the note can be dictated as well as typed.
    <div className="absolute inset-0 z-[35]">
      {/* Same veil as the focus layer — the board dims to background. */}
      <motion.div
        className="absolute inset-0 bg-[rgba(250,250,250,0.82)] backdrop-blur-[10px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.24, ease: EASE } }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={commit}
      />

      {/* The note scales up out of the composer zone — the same place the
          words would come from — and sits just above it, growing upward
          as tasks stack. Pinning sinks it back toward the dock. */}
      <motion.div
        className="absolute inset-x-6 bottom-[184px] mx-auto max-w-[310px]"
        style={{ transformOrigin: 'bottom center' }}
        initial={{ opacity: 0, y: 96, scale: 0.4 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: 'spring', stiffness: 300, damping: 30 },
        }}
        exit={{
          opacity: 0,
          y: 72,
          scale: 0.6,
          transition: { duration: 0.24, ease: EASE },
        }}
      >
        <div
          className="relative rounded-[26px] px-5 pt-4 pb-4 shadow-[0_24px_60px_-18px_rgba(20,16,28,0.5)]"
          style={{ background: tint }}
        >
          {/* The badge counts along as the first tasks stack up. */}
          <span
            aria-label={`${tasks.length} tasks`}
            className="absolute -top-3 -right-3 flex size-9 rotate-6 items-center justify-center rounded-full bg-[#131117] text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(20,16,28,0.5)]"
          >
            {tasks.length}
          </span>

          {/* The name, written straight onto the note. */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Project title"
            placeholder="Name the project"
            className="w-full bg-transparent pr-6 text-[17px] font-semibold tracking-[-0.01em] text-ink placeholder:text-ink/35 outline-none"
          />

          {tasks.length > 0 && (
            <div className="mt-2.5 flex flex-col">
              {tasks.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } }}
                  className="flex items-start gap-2.5 py-[5px]"
                >
                  <TaskCheck done={false} />
                  <span className="text-[13.5px] leading-[1.35] tracking-[-0.01em] text-ink/90">
                    {t.label}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* First tasks land at the foot, same spot they'll live on the
              focused note later. */}
          <div className="mt-3 border-t border-ink/10 pt-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') pushDraft()
              }}
              aria-label="Add a task"
              placeholder="Add a task"
              className="w-full rounded-[12px] bg-white/55 px-3 py-2 text-[13px] tracking-[-0.01em] text-ink placeholder:text-ink/35 outline-none"
            />
          </div>
        </div>

        <motion.button
          type="button"
          onClick={commit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.18, duration: 0.28, ease: EASE } }}
          className="mt-3 w-full rounded-full bg-ink py-3 text-[13px] font-semibold tracking-[-0.01em] text-white shadow-[0_14px_34px_-12px_rgba(20,16,28,0.5)] outline-none transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          {title.trim() || tasks.length > 0 || draft.trim() ? 'Pin to board' : 'Never mind'}
        </motion.button>
      </motion.div>
    </div>
  )
}

/* ── The board ────────────────────────────────────────────────────────── */

export function ProjectsMoodboard({
  out = false,
  added = [],
  query = '',
  composing = false,
  onCompose,
  spoken,
}: {
  /** Flip true to play the unpin — every artifact tears off and drops.
      The host swaps views once the board has cleared (~480ms). */
  out?: boolean
  /** Fresh pins from the composer — one cluster each. */
  added?: NewPin[]
  /** The notch's search — non-matching clusters recede (dim + blur)
      rather than unmount: pins stay pinned, they just step back. */
  query?: string
  /** True while the notch's plus has the new-note composer up. */
  composing?: boolean
  /** The composer's verdict — a pin to keep, or null (nothing written). */
  onCompose?: (pin: NewPin | null) => void
  /** Dictation from the host's voice orb, for the composer. */
  spoken?: SpokenLine | null
} = {}) {
  const projects = [...BOARD, ...added.map((a, i) => pinnedProject(a, i))]

  // Task state lives at the board so every reader — small notes, badges,
  // the focused note — shares one truth. Keyed lazily so projects pinned
  // after mount just fall back to their (empty) seed until touched.
  const [tasksById, setTasksById] = useState<Record<string, BoardTask[]>>(() =>
    Object.fromEntries(BOARD.map((p) => [p.id, p.tasks])),
  )
  // Fresh pins arrive with their composer tasks — fold them in so the
  // focused note and check-offs see them (runs on mount too, seeding
  // pins that survived a view round-trip).
  useEffect(() => {
    if (added.length === 0) return
    setTasksById((s) => {
      const next = { ...s }
      for (const pin of added) if (!next[pin.id]) next[pin.id] = pin.tasks
      return next
    })
  }, [added])
  const toggle = (projectId: string, taskId: string) =>
    setTasksById((s) => ({
      ...s,
      [projectId]: (s[projectId] ?? []).map((t) =>
        t.id === taskId ? { ...t, done: !t.done } : t,
      ),
    }))
  const add = (projectId: string, label: string) =>
    setTasksById((s) => ({
      ...s,
      [projectId]: [...(s[projectId] ?? []), { id: `new-${Date.now()}`, label, done: false }],
    }))

  // The search verdict, per cluster — a project answers with its title
  // or any of its (live) tasks.
  const q = query.trim().toLowerCase()
  const recedes = (p: BoardProject) => {
    if (!q) return false
    const tasks = tasksById[p.id] ?? p.tasks
    return !(
      p.title.toLowerCase().includes(q) ||
      tasks.some((t) => t.label.toLowerCase().includes(q))
    )
  }

  // Photo rolls live at the board too — captions typed in the gallery
  // and uploads both have to survive closing it.
  const [galleryById, setGalleryById] = useState<Record<string, BoardPhoto[]>>(() =>
    Object.fromEntries(BOARD.map((p) => [p.id, p.gallery])),
  )
  const setCaption = (projectId: string, index: number, text: string) =>
    setGalleryById((s) => ({
      ...s,
      [projectId]: (s[projectId] ?? []).map((ph, i) =>
        i === index ? { ...ph, title: text } : ph,
      ),
    }))
  const addPhotos = (projectId: string, srcs: string[]) =>
    setGalleryById((s) => ({
      ...s,
      [projectId]: [
        ...(s[projectId] ?? []),
        ...srcs.map((src) => ({ src, title: '', source: 'Added by you', editable: true })),
      ],
    }))

  // The focus lift. `hiddenId` outlives `focus` by one beat — the
  // original stays invisible until the clone has flown back onto it.
  const [focus, setFocus] = useState<Focus | null>(null)
  const [hiddenId, setHiddenId] = useState<string | null>(null)
  const openFocus = (id: string, payload: FocusPayload, from: FromRect) => {
    const vp = document.getElementById('app-viewport')
    if (!vp) return
    setFocus({ id, payload, from, frame: { w: vp.clientWidth, h: vp.clientHeight } })
    setHiddenId(id)
  }
  // Gallery focuses split off to their own layer (under the dock);
  // everything else flies on the viewport focus layer above it.
  const galleryProjectId = focus?.payload.kind === 'gallery' ? focus.payload.projectId : null

  // Portal targets. The focus layer goes to the viewport — it covers the
  // whole frame, dock included. The composer goes to the screen layer
  // instead, whose stacking context lets it slide *under* the dock
  // (z-35 vs z-40) so the voice orb stays live while composing.
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  const [screenLayer, setScreenLayer] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
    setScreenLayer(document.getElementById('app-screen'))
  }, [])

  // A fresh pin lands at the board's foot — bring it into view.
  const scrollerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (added.length === 0) return
    const el = scrollerRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [added.length])

  return (
    <UnpinContext.Provider value={out}>
    <TasksContext.Provider value={{ projects, tasksById, toggle, add }}>
    <FocusContext.Provider value={{ hiddenId, open: openFocus }}>
      <div className="relative h-full w-full">
      {/* Scrolling canvas — the whole board lives on one surface; the only
          chrome is the host's view switch floating in the island slot. */}
      <div
        ref={scrollerRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // Dissolve the board at the slot's bottom edge (above the dock)
          // instead of hard-cutting artifacts mid-scroll.
          maskImage:
            'linear-gradient(to bottom, black 0%, black calc(100% - 72px), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black calc(100% - 72px), transparent 100%)',
        }}
      >
        {/* Headroom for the view switch riding the island slot above —
            generous, because the top cluster's chips overshoot upward
            (negative y + rotation) and would crowd the control. */}
        <div className="relative mx-auto flex w-full max-w-[393px] flex-col gap-4 px-4 pt-[calc(var(--safe-top)+106px)] pb-6">
          {projects.map((p) => {
            const away = recedes(p)
            return (
              <motion.div
                key={p.id}
                animate={{
                  opacity: away ? 0.14 : 1,
                  scale: away ? 0.98 : 1,
                  filter: away ? 'blur(2px)' : 'blur(0px)',
                }}
                transition={{ duration: 0.32, ease: EASE }}
                style={{ pointerEvents: away ? 'none' : 'auto' }}
              >
                {p.id === 'sisters' ? (
                  <SistersCluster p={p} />
                ) : p.id === 'investors' ? (
                  <InvestorsCluster p={p} />
                ) : p.id === 'kyoto' ? (
                  <KyotoCluster p={p} />
                ) : (
                  <NewCluster p={p} />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
      </div>

      {/* The focus layer — over everything, dock included. */}
      {viewport &&
        createPortal(
          <FocusLayer
            focus={galleryProjectId ? null : focus}
            onClose={() => setFocus(null)}
            onGone={() => setHiddenId(null)}
          />,
          viewport,
        )}

      {/* The gallery — on the screen layer, *under* the dock, so the
          voice orb stays present and live over the roll. */}
      {screenLayer &&
        createPortal(
          <AnimatePresence onExitComplete={() => setHiddenId(null)}>
            {focus && galleryProjectId && (
              <GalleryFocus
                key={focus.id}
                focus={focus}
                pool={galleryById[galleryProjectId] ?? []}
                onCaption={(i, text) => setCaption(galleryProjectId, i, text)}
                onAddPhotos={(srcs) => addPhotos(galleryProjectId, srcs)}
                onClose={() => setFocus(null)}
              />
            )}
          </AnimatePresence>,
          screenLayer,
        )}

      {/* The composer — the next pin's note, raised off the notch. */}
      {screenLayer &&
        createPortal(
          <AnimatePresence>
            {composing && (
              <NoteComposer
                key="note-composer"
                tint={NEW_TINTS[added.length % NEW_TINTS.length]}
                spoken={spoken}
                onDone={(pin) => onCompose?.(pin)}
              />
            )}
          </AnimatePresence>,
          screenLayer,
        )}
    </FocusContext.Provider>
    </TasksContext.Provider>
    </UnpinContext.Provider>
  )
}
