/**
 * The returning-user home — what the resting screen holds once the user has
 * history. Three states stack on a vertical axis, cycled by swiping or by
 * the notch rail cut into the frame's right edge (the same control the trip
 * file's decks use):
 *
 *   Upcoming — the next 2–3 receipt objects in a loose snapshot stack,
 *   there for quick access without asking. Tap the stack to shuffle.
 *   Files — every project and loose thread, organized. Projects are files
 *   in the trip-file sense (receipts + tasks + threads under one name,
 *   fingerprinted by their provider marks); loose threads are
 *   conversations that never grew into one — history lives here, not in
 *   a separate tab. Rows are doorways when the host wires them (1C).
 *   Connect — the first-run connect-apps state, still reachable since
 *   there's always another app to wire in.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import {
  DiningTicket,
  FlightTicket,
  HotelTicket,
} from '../transaction/ReceiptGalleryTicket'
import { EmptyState } from './EmptyState'

const EASE = [0.32, 0.72, 0, 1] as const

/** Swipe distance / fling velocity that flips states. */
const FLIP_OFFSET = 60
const FLIP_VELOCITY = 500

const PAGES = ['upcoming', 'files', 'connect'] as const
type Page = (typeof PAGES)[number]

const PAGE_LABELS: Record<Page, string> = {
  upcoming: 'Upcoming',
  files: 'Files',
  connect: 'Connect apps',
}

/* ── Upcoming — the receipt snapshot stack ────────────────────────────── */

/** The next few bookings, front to back. Same 4E artifacts the trip file
    fans out — here they sit as a casual pile, like photos on a table. */
const UPCOMING = [
  {
    id: 'dining',
    title: 'Dinner at Valette',
    meta: 'Tonight · 7:30 PM · OpenTable',
    render: () => <DiningTicket index={-1} />,
  },
  {
    id: 'hotel',
    title: 'Hotel Healdsburg',
    meta: 'Jul 25 – 27 · Expedia',
    render: () => <HotelTicket index={-1} />,
  },
  {
    id: 'flight',
    title: 'SFO → EWR',
    meta: 'Sat · 6:10 AM · United',
    render: () => <FlightTicket index={-1} />,
  },
]

/** Depth poses for the pile — front sits square-ish, the rest peek out at
    lazy angles behind it (the snapshot-stack reference, not a neat fan). */
const PILE_POSES = [
  { x: 0, y: 0, rotate: -2, scale: 1, opacity: 1 },
  { x: 30, y: -26, rotate: 7, scale: 0.97, opacity: 0.95 },
  { x: -26, y: -44, rotate: -10, scale: 0.94, opacity: 0.9 },
]

/** Swipe distance / fling velocity that tosses the front ticket. */
const TOSS_OFFSET = 70
const TOSS_VELOCITY = 500

function UpcomingPage() {
  // Which booking leads the pile. Swipe (or tap) to send it to the back —
  // `toss` holds the fling direction for the beat the card is airborne.
  const [front, setFront] = useState(0)
  const [toss, setToss] = useState(0)

  const tossTo = (d: number) => {
    setToss(d)
    // Let the card clear the pile before it re-enters at the back.
    window.setTimeout(() => {
      setFront((f) => (f + 1) % UPCOMING.length)
      setToss(0)
    }, 160)
  }

  return (
    <div className="flex h-full flex-col items-center">
      {/* The pile — tickets share one origin and drift into depth poses. */}
      <div className="relative min-h-0 w-full flex-1">
        <div className="absolute top-1/2 left-1/2 h-0 w-[340px] -translate-x-1/2 scale-[0.52]">
          {UPCOMING.map((r, i) => {
            const depth = (i - front + UPCOMING.length) % UPCOMING.length
            const isFront = depth === 0
            return (
              <div
                key={r.id}
                className="absolute inset-x-0 top-0"
                style={{ zIndex: 10 - depth }}
              >
                <div className="-translate-y-1/2">
                  {/* Gesture layer — only the lead ticket is draggable. It
                      rides the finger, snaps home on a soft release, and
                      hands vertical pans up to the page swipe. */}
                  <motion.div
                    drag={isFront ? 'x' : false}
                    dragDirectionLock
                    dragPropagation
                    dragSnapToOrigin
                    dragElastic={0.7}
                    dragMomentum={false}
                    onDragEnd={(_, info) => {
                      if (!isFront || toss !== 0) return
                      if (
                        Math.abs(info.offset.x) > TOSS_OFFSET ||
                        Math.abs(info.velocity.x) > TOSS_VELOCITY
                      ) {
                        tossTo(Math.sign(info.offset.x || info.velocity.x))
                      }
                    }}
                  >
                    {/* Pose layer — depth poses, plus the airborne beat:
                        flung out in the swipe direction, then springing
                        around to the back slot. */}
                    <motion.div
                      onTap={() => {
                        if (isFront && toss === 0) tossTo(1)
                      }}
                      initial={false}
                      animate={
                        isFront && toss !== 0
                          ? { x: toss * 430, y: -24, rotate: toss * 18, scale: 1, opacity: 1 }
                          : PILE_POSES[depth]
                      }
                      transition={{ type: 'spring', stiffness: 230, damping: 22 }}
                      className="cursor-pointer"
                    >
                      {r.render()}
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            )
          })}
        </div>

        {/* The state's name hugs the pile — anchored just past the cards'
            lower edge (half a scaled ticket below their shared center). */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 mt-[148px] text-center">
          <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">Upcoming</p>
          <p className="mt-1 text-[12px] text-ink-secondary">
            {UPCOMING.length} reservations · this weekend
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Files — projects and loose threads ───────────────────────────────── */

const PROJECTS: {
  id: string
  title: string
  meta: string
  /** Provider marks collected so far — the file's fingerprint. */
  icons: string[]
}[] = [
  {
    id: 'sisters',
    title: 'Sisters Birthday Weekend',
    meta: '4 receipts · Jul 25 – 27',
    icons: ['/providers/united.png', '/providers/expedia.png', '/providers/opentable.svg'],
  },
  {
    id: 'investors',
    title: 'Dinner with investors',
    meta: '1 reservation · Thursday',
    icons: ['/providers/opentable.svg'],
  },
  {
    id: 'kyoto',
    title: 'Kyoto in the fall',
    meta: 'Planning · 2 tasks open',
    icons: [],
  },
]

/** Conversations that never grew into projects — history, not a tab. */
const THREADS = [
  { id: 'gift', title: 'Gift ideas for Mom', time: 'Tuesday' },
  { id: 'espresso', title: 'Best espresso near the office', time: 'Jul 30' },
]

function SectionLabel({ children }: { children: string }) {
  // Full ink — tertiary gray dissolved into the purple end of the mesh.
  return (
    <p className="px-3 pb-1.5 text-[12px] font-semibold tracking-[-0.01em] text-ink">
      {children}
    </p>
  )
}

function ThreadGlyph() {
  return (
    <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink/25">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 12a8.5 8.5 0 0 1-8.5 8.5 8.9 8.9 0 0 1-3.6-.75L3.5 21l1.35-4.6A8.2 8.2 0 0 1 3.5 12 8.5 8.5 0 0 1 12 3.5 8.5 8.5 0 0 1 21 12Z"
          stroke="rgba(23,23,23,0.6)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function FilesPage({
  onOpenProject,
  onOpenThread,
}: {
  onOpenProject?: (id: string) => void
  onOpenThread?: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
        {/* Bare rows on the ambient, same language as the trip file's task
            deck — each row is a doorway into its file. */}
        <div className="flex w-full max-w-[330px] flex-col px-4">
          <SectionLabel>Projects</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {PROJECTS.map((p, i) => (
              <motion.button
                key={p.id}
                type="button"
                onTap={() => onOpenProject?.(p.id)}
                initial={{ opacity: 0, y: 14 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.12 + i * 0.05, duration: 0.35, ease: EASE },
                }}
                className="flex w-full items-center gap-3.5 rounded-[18px] px-3 py-3.5 text-left outline-none transition-colors duration-150 active:bg-white/50"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14.5px] tracking-[-0.01em] text-ink">
                    {p.title}
                  </span>
                  <span className="text-[11.5px] text-ink-secondary">{p.meta}</span>
                </span>
                {p.icons.length > 0 ? (
                  <span className="flex shrink-0 -space-x-1.5">
                    {p.icons.map((icon) => (
                      <span
                        key={icon}
                        className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] ring-1 ring-white"
                      >
                        <img
                          src={icon}
                          alt=""
                          draggable={false}
                          className="size-6 object-contain"
                        />
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="size-6 shrink-0 rounded-full border-[1.5px] border-dashed border-ink/25" />
                )}
              </motion.button>
            ))}
          </div>

          <div className="pt-5">
            <SectionLabel>Loose threads</SectionLabel>
          </div>
          <div className="flex flex-col gap-0.5">
            {THREADS.map((t, i) => (
              <motion.button
                key={t.id}
                type="button"
                onTap={() => onOpenThread?.(t.id)}
                initial={{ opacity: 0, y: 14 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.3 + i * 0.05, duration: 0.35, ease: EASE },
                }}
                className="flex w-full items-center gap-3.5 rounded-[18px] px-3 py-3 text-left outline-none transition-colors duration-150 active:bg-white/50"
              >
                <ThreadGlyph />
                <span className="min-w-0 flex-1 truncate text-[14px] tracking-[-0.01em] text-ink">
                  {t.title}
                </span>
                <span className="shrink-0 text-[11px] text-ink-secondary">{t.time}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── The home ─────────────────────────────────────────────────────────── */

export function HomeStates({
  onOpenProject,
  onOpenThread,
}: {
  /** Makes the Files rows doorways — 1C opens a project's trip file or
      drops into a thread. Without them the rows are inert sketch (1B). */
  onOpenProject?: (id: string) => void
  onOpenThread?: (id: string) => void
} = {}) {
  const [page, setPage] = useState(0)
  // Travel direction feeds the slide variants: forward pages enter from
  // below, backward from above — the axis the swipe implies.
  const [dir, setDir] = useState(1)

  const goTo = (next: number) => {
    if (next === page || next < 0 || next >= PAGES.length) return
    setDir(next > page ? 1 : -1)
    setPage(next)
  }

  return (
    <motion.div
      className="relative h-full w-full"
      drag="y"
      dragDirectionLock
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (info.offset.y < -FLIP_OFFSET || info.velocity.y < -FLIP_VELOCITY) {
          goTo(page + 1)
        } else if (info.offset.y > FLIP_OFFSET || info.velocity.y > FLIP_VELOCITY) {
          goTo(page - 1)
        }
      }}
    >
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={PAGES[page]}
          className="absolute inset-0"
          custom={dir}
          variants={{
            enter: (d: number) => ({ opacity: 0, y: d * 180 }),
            center: { opacity: 1, y: 0 },
            exit: (d: number) => ({ opacity: 0, y: d * -170 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: EASE }}
        >
          {PAGES[page] === 'upcoming' ? (
            <UpcomingPage />
          ) : PAGES[page] === 'files' ? (
            <FilesPage onOpenProject={onOpenProject} onOpenThread={onOpenThread} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* State rail — the notch from the trip file, one dash per state,
          bled past the column's padding to sit in the frame's edge. */}
      <div className="absolute -right-4 top-1/2 z-10 h-[120px] w-[34px] -translate-y-1/2">
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
        <div className="absolute inset-y-0 right-0 left-1 flex flex-col items-center justify-center gap-1">
          {PAGES.map((p, i) => {
            const isActive = i === page
            return (
              <button
                key={p}
                type="button"
                aria-label={PAGE_LABELS[p]}
                onClick={() => goTo(i)}
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
      </div>
    </motion.div>
  )
}
