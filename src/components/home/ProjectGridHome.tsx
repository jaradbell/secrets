/**
 * 5B — projects as a grid, and the full descent the grid opens:
 *
 *   Grid — every project as a card on one board, previewing its open
 *   loose ends. Every card is a doorway into its conversation at its
 *   latest state. New projects are born as conversations: the dashed
 *   tile makes an unnamed one, speaking from the grid makes a named one,
 *   and both drop the user into the fresh thread. Only named projects
 *   persist — an unnamed draft abandoned without a word evaporates.
 *   Thread — the 2D transaction conversation the project grew out of.
 *   The Sisters conversation's island opens its container (it's the
 *   thing that names the project and holds its receipts).
 *   Project — the container floor (ProjectHome): the card-grid log of
 *   what's done, open, and suggested. Receipts fan up from here.
 *
 * Back is history, not hierarchy. Navigation is a stack: every doorway
 * pushes a screen through the goo transition, every chevron pops one —
 * grid → conversation → project walks back project → conversation →
 * grid, never through a floor you didn't visit.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ambientBus } from '../shared/ambientBus'
import { frameCardBus, useFrameCard } from '../shared/frameCardBus'
import { BriefingHome } from './BriefingHome'
import { tripFileBus, useTripFileOpen } from '../shared/tripFileBus'
import { ConversationHeader } from '../transaction/ConversationHeader'
import {
  PROVIDERS,
  PROVIDER_RESULTS,
  type ProviderId,
  type RankedResult,
} from '../transaction/data'
import { PlaceCardStack } from '../transaction/PlaceCardStack'
import { ReservationProvider } from '../transaction/reservationFlow'
import { ProviderChips, TransactionView } from '../transaction/TransactionView'
import { TripFile, type TripTask } from '../transaction/TripFile'
import { GooTransition } from '../voice/GooTransition'
import { HomeStates } from '../voice/HomeStates'
import { LogoGoo } from '../voice/LogoGoo'
import { VoiceControl } from '../voice/VoiceControl'
import { ProjectHome } from './ProjectHome'
import { SearchDock } from './SearchDock'

const EASE = [0.32, 0.72, 0, 1] as const

/** Shared entrance — cards develop in staggered, same beat as ProjectHome. */
const develop = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.06, duration: 0.38, ease: EASE },
  },
})

const CARD =
  'w-full rounded-[24px] border border-white/70 bg-white/60 shadow-[0_2px_20px_rgba(0,0,0,0.05)] backdrop-blur-[10px]'

/** 5E's draft zoom, pose by phase: 'out' clears the current screen along
    the camera's axis, 'in' settles the next one from the opposite side of
    the lens. Keyframe arrays restart at their first value each phase, so
    the incoming screen never inherits the outgoing pose. */
const ZOOM_POSES = {
  idle: { scale: 1, opacity: 1, transition: { duration: 0.2, ease: EASE } },
  outFwd: { scale: 1.06, opacity: 0, transition: { duration: 0.19, ease: EASE } },
  inFwd: { scale: [0.94, 1], opacity: [0, 1], transition: { duration: 0.42, ease: EASE } },
  outBack: { scale: 0.94, opacity: 0, transition: { duration: 0.19, ease: EASE } },
  inBack: { scale: [1.06, 1], opacity: [0, 1], transition: { duration: 0.42, ease: EASE } },
}

/** The Sisters project's ledger — feeds its container floor and the
    receipts fan. (Inside the thread, TransactionView derives this from
    live flow state instead.) */
const SISTERS_TASKS: TripTask[] = [
  {
    id: 'flights',
    label: 'Book flights to SFO',
    state: 'done',
    receiptId: 'flight',
    provider: { name: 'United', icon: '/providers/united.png' },
  },
  {
    id: 'hotel',
    label: 'Reserve a hotel',
    state: 'done',
    receiptId: 'hotel',
    provider: { name: 'Expedia', icon: '/providers/expedia.png' },
  },
  {
    id: 'dinner',
    label: 'Book a dinner reservation',
    state: 'done',
    receiptId: 'dining',
    provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
  },
  { id: 'cake', label: 'Order a birthday cake', state: 'todo' },
]

function ProviderDisc({ icon }: { icon: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.14)] ring-1 ring-white">
      <img src={icon} alt="" draggable={false} className="size-6 object-contain" />
    </span>
  )
}

/** An ink provider disc for the white brand marks (goo-born projects) —
    the BrandGoo identity carried onto the card's fingerprint. */
function InkProviderDisc({ icon }: { icon: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#141118] shadow-[0_1px_4px_rgba(0,0,0,0.2)] ring-1 ring-white">
      <img src={icon} alt="" draggable={false} className="size-3.5 object-contain" />
    </span>
  )
}

/** One open loose end, previewed on its project's card — two doorways in
    one row: the circle checks it off right here, the label jumps to where
    the task lives in the conversation. */
function TaskPreviewRow({ label, onJump }: { label: string; onJump?: () => void }) {
  const [done, setDone] = useState(false)
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        aria-label={done ? `Reopen "${label}"` : `Mark "${label}" done`}
        onClick={() => setDone((d) => !d)}
        className="-m-1.5 flex size-[27px] shrink-0 items-center justify-center outline-none"
      >
        <motion.span
          className="flex size-[15px] items-center justify-center rounded-full border-[1.5px]"
          initial={false}
          animate={
            done
              ? { backgroundColor: '#171717', borderColor: '#171717', scale: 1 }
              : { backgroundColor: 'rgba(23,23,23,0)', borderColor: 'rgba(23,23,23,0.25)', scale: 1 }
          }
          whileTap={{ scale: 0.82 }}
          transition={{ duration: 0.16 }}
        >
          <motion.svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            initial={false}
            animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.4 }}
            transition={{ type: 'spring', stiffness: 480, damping: 22 }}
          >
            <path d="m5 12.5 5 5L19 7" />
          </motion.svg>
        </motion.span>
      </button>
      <button
        type="button"
        onClick={onJump}
        className={`min-w-0 flex-1 text-left text-[11.5px] leading-[15px] outline-none transition-colors duration-200 ${
          done ? 'text-ink-tertiary line-through decoration-ink/25' : 'text-ink'
        }`}
      >
        {label}
      </button>
    </span>
  )
}

/** What's still open, tucked under the lockup behind a soft hairline. */
function TaskPreview({ tasks, onJump }: { tasks: string[]; onJump?: () => void }) {
  return (
    <span className="flex flex-col gap-1.5 border-t border-ink/10 pt-2.5">
      {tasks.map((t) => (
        <TaskPreviewRow key={t} label={t} onJump={onJump} />
      ))}
    </span>
  )
}

/** A project with imagery worth leading with — the file's photo heads the
    card, provider marks fingerprint it, the lockup and open loose ends
    sit on the card body below. */
function ProjectHeroCard({
  image,
  title,
  meta,
  providers,
  openTasks,
  onOpen,
}: {
  image: string
  title: string
  meta: string
  providers: string[]
  openTasks: string[]
  onOpen?: () => void
}) {
  return (
    // The card is a room, not one button: the photo + lockup open the
    // conversation; the task rows below carry their own controls. The
    // press-scale rides the div — :active bubbles up from any child.
    <div
      className={`${CARD} flex flex-col overflow-hidden transition-transform duration-200 ease-out active:scale-[0.98]`}
    >
      <button type="button" onClick={onOpen} className="flex w-full flex-col text-left outline-none">
        <span className="relative block h-[118px] w-full shrink-0">
          <img
            src={image}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute top-2.5 right-2.5 flex -space-x-1.5">
            {providers.map((icon) => (
              <ProviderDisc key={icon} icon={icon} />
            ))}
          </span>
        </span>
        <span className="flex w-full flex-col gap-0.5 p-3.5">
          <span className="text-[14px] leading-[18px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </span>
          <span className="text-[11px] text-ink-secondary">{meta}</span>
        </span>
      </button>
      {openTasks.length > 0 && (
        <span className="-mt-1.5 block px-3.5 pb-3.5">
          <TaskPreview tasks={openTasks} onJump={onOpen} />
        </span>
      )}
    </div>
  )
}

/** A project without a photo — same room, text-first. Planning projects
    show a dashed empty disc where the provider marks will collect. */
function ProjectCard({
  title,
  meta,
  providers,
  inkProvider,
  openTasks,
  onOpen,
}: {
  title: string
  meta: string
  providers: string[]
  /** A white brand mark (BrandGoo's pool) rendered as an ink disc — the
      fingerprint a goo-born project starts with. */
  inkProvider?: string
  openTasks: string[]
  onOpen?: () => void
}) {
  return (
    // Same split as the hero card: lockup opens the conversation, task
    // rows keep their own controls, the press-scale rides the div.
    <div
      className={`${CARD} flex flex-col p-4 transition-transform duration-200 ease-out active:scale-[0.98]`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-3 text-left outline-none"
      >
        {providers.length > 0 ? (
          <span className="flex -space-x-1.5">
            {providers.map((icon) => (
              <ProviderDisc key={icon} icon={icon} />
            ))}
          </span>
        ) : inkProvider ? (
          <InkProviderDisc icon={inkProvider} />
        ) : (
          <span className="size-6 rounded-full border-[1.5px] border-dashed border-ink/25" />
        )}
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] leading-[18px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </span>
          <span className="text-[11px] text-ink-secondary">{meta}</span>
        </span>
      </button>
      {openTasks.length > 0 && (
        <span className="mt-2 block">
          <TaskPreview tasks={openTasks} onJump={onOpen} />
        </span>
      )}
    </div>
  )
}

/** The dashed tile — where the next project starts. Tapping it (or just
    speaking from the grid) births the project and drops into its fresh
    conversation, because a project is born as a conversation. */
function NewProjectCard({ onCreate }: { onCreate?: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex w-full flex-col items-start gap-2 rounded-[24px] border-[1.5px] border-dashed border-ink/20 p-4 text-left outline-none transition-transform duration-200 ease-out active:scale-[0.98]"
    >
      <span className="flex size-[22px] items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 4v16M4 12h16"
            stroke="rgba(23,23,23,0.55)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-[13px] leading-[17px] font-medium text-ink">New project</span>
      <span className="text-[11px] leading-[15px] text-ink-secondary">
        Any conversation can grow into one.
      </span>
    </button>
  )
}

/** A loose thread — a conversation that never grew into a project. Bare
    row on the ambient, same language as the Files state's thread list:
    glyph, title, timestamp on the trailing edge. */
function ThreadRow({
  title,
  time,
  onOpen,
}: {
  title: string
  time: string
  onOpen?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3.5 rounded-[18px] px-3 py-3 text-left outline-none transition-colors duration-150 active:bg-white/50"
    >
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
      <span className="min-w-0 flex-1 truncate text-[14px] tracking-[-0.01em] text-ink">
        {title}
      </span>
      <span className="shrink-0 text-[11px] text-ink-secondary">{time}</span>
    </button>
  )
}

/** The board's sort — active projects, loose-thread conversations, and
    the archive (finished projects, retired threads). */
type Tab = 'active' | 'conversations' | 'archive'

const TABS: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'archive', label: 'Archive' },
]

/** The board itself — its name rides the island slot (same placement as
    a conversation's), search and sort chips below, then the two-column
    grid of whichever shelf is up. Every card is a doorway into its
    conversation; the project container opens from inside (the island). */
function ProjectGrid({
  drafts,
  island = true,
  query = '',
  tab: controlledTab,
  onTab,
  chips = true,
  toolsRow,
  islandContent,
  menuDots = true,
  sort = 'recent',
  filter = 'all',
  view = 'grid',
  onOpenThread,
  onOpenDraft,
  onCreate,
}: {
  /** Whether the board draws its own ⋯ in the top-right. 5E's host owns
      that corner (the dots ↔ X morph), so the board yields the slot. */
  menuDots?: boolean
  /** Named projects born this session — planning cards over the tile.
      (Unnamed drafts aren't real yet, so they never reach the board.) */
  drafts: Draft[]
  /** Whether the board announces itself with the "Projects" pill. 5C's
      host names the place with its segmented pill instead, so the board
      keeps just its menu. */
  island?: boolean
  /** The live filter — typed at the dock's search chip (the host owns the
      field; the board just answers to it). */
  query?: string
  /** Lift the shelf choice to the host (5E: the drawer's rows open this
      board to a shelf, so the menu and the board have to agree). Omit
      both and the board owns it. */
  tab?: Tab
  onTab?: (t: Tab) => void
  /** Whether the board draws its own sort chips. 5E hides them — its
      shelves are reached through the drawer and the island's toggle. */
  chips?: boolean
  /** Host chrome in the tab row's slot when the chips stand down — 5C
      seats its board-options chip here, left-aligned like the tabs were. */
  toolsRow?: ReactNode
  /** Replaces the island's default "Projects" text — 5E puts the
      Active/Archived toggle chip (or a page title) in the slot. */
  islandContent?: ReactNode
  /** The chip's lenses (5E): reorder, narrow to a facet, and re-shape
      the board. Defaults leave the board exactly as 5B knows it. */
  sort?: BoardSort
  filter?: BoardFilter
  view?: BoardView
  onOpenThread?: (title: string) => void
  onOpenDraft?: (id: string) => void
  onCreate?: () => void
}) {
  const [ownTab, setOwnTab] = useState<Tab>('active')
  const tab = controlledTab ?? ownTab
  const setTab = onTab ?? setOwnTab

  // Each shelf is data: id + searchable title + how to draw it. Projects
  // are cards on the two-column grid; loose threads are list rows
  // (kind: 'row'), matching the Files state's thread list. `weight` is a
  // rough card height so the masonry can drop each card into the shorter
  // column instead of alternating blindly (which strands holes).
  const items: {
    id: string
    title: string
    kind?: 'card' | 'row'
    weight?: number
    /** One-line status, reused as the row's timestamp in the list view. */
    meta?: string
    /** Facets the filter lens can narrow to. */
    hasTasks?: boolean
    hasReservation?: boolean
    /** Data-level doorway — the list view can't reach into render(). */
    open?: () => void
    render: () => ReactNode
  }[] =
    tab === 'active'
      ? [
          {
            id: 'sisters',
            title: 'Sisters Birthday Weekend',
            weight: 232,
            meta: 'Jul 25 – 27 · 3 of 4 done',
            hasTasks: true,
            hasReservation: true,
            open: () => onOpenThread?.('Sisters Birthday Weekend'),
            render: () => (
              <ProjectHeroCard
                image="/receipts/photos/hotel-pool.jpg"
                title="Sisters Birthday Weekend"
                meta="Jul 25 – 27 · 3 of 4 done"
                providers={[
                  '/providers/united.png',
                  '/providers/expedia.png',
                  '/providers/opentable.svg',
                ]}
                openTasks={['Order a birthday cake']}
                onOpen={() => onOpenThread?.('Sisters Birthday Weekend')}
              />
            ),
          },
          {
            id: 'investors',
            title: 'Dinner with investors',
            weight: 118,
            meta: '1 reservation · Thursday',
            hasReservation: true,
            open: () => onOpenThread?.('Dinner with investors'),
            render: () => (
              <ProjectCard
                title="Dinner with investors"
                meta="1 reservation · Thursday"
                providers={['/providers/opentable.svg']}
                openTasks={[]}
                onOpen={() => onOpenThread?.('Dinner with investors')}
              />
            ),
          },
          {
            id: 'kyoto',
            title: 'Kyoto in the fall',
            weight: 170,
            meta: 'Planning · 2 tasks open',
            hasTasks: true,
            open: () => onOpenThread?.('Kyoto in the fall'),
            render: () => (
              <ProjectCard
                title="Kyoto in the fall"
                meta="Planning · 2 tasks open"
                providers={[]}
                openTasks={['Pick travel dates', 'Shortlist ryokans']}
                onOpen={() => onOpenThread?.('Kyoto in the fall')}
              />
            ),
          },
          // Session-born projects collect ahead of the tile that spawned them.
          ...drafts.map((d) => ({
            id: d.id,
            title: d.title,
            weight: 118,
            meta: 'Planning · just started',
            open: () => onOpenDraft?.(d.id),
            render: () => (
              <ProjectCard
                title={d.title}
                meta="Planning · just started"
                providers={[]}
                inkProvider={d.brandLogo}
                openTasks={[]}
                onOpen={() => onOpenDraft?.(d.id)}
              />
            ),
          })),
          {
            id: 'new-project',
            title: 'New project',
            weight: 150,
            render: () => <NewProjectCard onCreate={onCreate} />,
          },
        ]
      : tab === 'conversations'
        ? [
            {
              id: 'gift',
              title: 'Gift ideas for Mom',
              kind: 'row' as const,
              render: () => (
                <ThreadRow
                  title="Gift ideas for Mom"
                  time="Tuesday"
                  onOpen={() => onOpenThread?.('Gift ideas for Mom')}
                />
              ),
            },
            {
              id: 'espresso',
              title: 'Best espresso near the office',
              kind: 'row' as const,
              render: () => (
                <ThreadRow
                  title="Best espresso near the office"
                  time="Jul 30"
                  onOpen={() => onOpenThread?.('Best espresso near the office')}
                />
              ),
            },
          ]
        : [
            {
              id: 'tahoe',
              title: 'Tahoe ski trip',
              meta: 'Completed · Feb 12 – 15',
              hasReservation: true,
              open: () => onOpenThread?.('Tahoe ski trip'),
              render: () => (
                <ProjectCard
                  title="Tahoe ski trip"
                  meta="Completed · Feb 12 – 15"
                  providers={['/providers/united.png', '/providers/expedia.png']}
                  openTasks={[]}
                  onOpen={() => onOpenThread?.('Tahoe ski trip')}
                />
              ),
            },
            {
              id: 'anniversary',
              title: 'Anniversary dinner',
              meta: 'Completed · Mar 3',
              hasReservation: true,
              open: () => onOpenThread?.('Anniversary dinner'),
              render: () => (
                <ProjectCard
                  title="Anniversary dinner"
                  meta="Completed · Mar 3"
                  providers={['/providers/opentable.svg']}
                  openTasks={[]}
                  onOpen={() => onOpenThread?.('Anniversary dinner')}
                />
              ),
            },
            {
              id: 'marathon',
              title: 'Marathon training plan',
              kind: 'row' as const,
              render: () => (
                <ThreadRow
                  title="Marathon training plan"
                  time="Archived · May"
                  onOpen={() => onOpenThread?.('Marathon training plan')}
                />
              ),
            },
          ]

  const q = query.trim().toLowerCase()
  const searched = q ? items.filter((it) => it.title.toLowerCase().includes(q)) : items
  // The chip's lenses. Filter narrows to a facet — but the New project
  // tile is a door, not content, so it never filters away. Sort reorders
  // everything except that same tile, which stays the shelf's last word.
  const faceted = searched.filter((it) => {
    if (it.id === 'new-project') return true
    if (filter === 'tasks') return !!it.hasTasks
    if (filter === 'reservations') return !!it.hasReservation
    return true
  })
  const visible =
    sort === 'alpha'
      ? [...faceted].sort(
          (a, b) =>
            Number(a.id === 'new-project') - Number(b.id === 'new-project') ||
            a.title.localeCompare(b.title),
        )
      : faceted
  // Cards interleave into two loose columns; rows stack in one list below.
  const cards = visible.filter((it) => it.kind !== 'row')
  const rows = visible.filter((it) => it.kind === 'row')
  // The list view flattens everything to rows — projects become thread
  // rows carrying their status line. The create tile has no row form
  // (a dashed door makes no sense in a list), so it sits this view out.
  const listItems = visible.filter((it) => it.id !== 'new-project')
  // Masonry: each card lands in whichever column runs shorter, so the
  // board packs tight (a new card fills the hole beside a tall one
  // instead of stacking under it).
  const cols: { id: string; i: number; render: () => ReactNode }[][] = [[], []]
  const colHeights = [0, 0]
  cards.forEach((it, i) => {
    const c = colHeights[0] <= colHeights[1] ? 0 : 1
    cols[c].push({ id: it.id, i, render: it.render })
    colHeights[c] += it.weight ?? 120
  })

  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{
        scrollbarWidth: 'none',
        paddingTop: 'calc(var(--safe-top) + 6px)',
        // Dissolve the board at the slot's bottom edge (the moodboard's
        // treatment) — cards fade into the mesh band instead of
        // hard-cutting against the dock.
        maskImage:
          'linear-gradient(to bottom, black 0%, black calc(100% - 72px), transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, black 0%, black calc(100% - 72px), transparent 100%)',
      }}
    >
      {/* Chrome — the board's name rides the island slot (same placement
          as a conversation's), menu on the right for symmetry. The host
          (VoiceControl) already provides the frame's 16px gutter, so no
          horizontal padding of our own anywhere on this floor. */}
      <div className="relative flex items-center justify-between">
        <span aria-hidden="true" className="size-11" />
        {island &&
          (islandContent ?? (
            // Bare text, no chip — the board announces itself weightlessly,
            // same grammar as the floating glyph chrome.
            <motion.span
              {...develop(0)}
              className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-[-0.01em] text-ink"
            >
              Projects
            </motion.span>
          ))}
        {menuDots ? (
          <button
            type="button"
            aria-label="Menu"
            className="flex size-11 items-center justify-center outline-none transition-transform duration-200 ease-out active:scale-90"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="#171717" aria-hidden="true">
              <circle cx="4" cy="10" r="1.7" />
              <circle cx="10" cy="10" r="1.7" />
              <circle cx="16" cy="10" r="1.7" />
            </svg>
          </button>
        ) : (
          <span aria-hidden="true" className="size-11" />
        )}
      </div>

      {/* Sort chips — active work, loose threads, and what's been put away.
          (Search lives at the thumb now — the dock's floating chip.) */}
      {!chips && toolsRow && (
        // The host's chrome takes the tabs' slot — relative so the chip's
        // absolute anchor resolves here, z-raised so its open panel rides
        // over the shelf below.
        <div className="relative z-40 mt-3 h-9">{toolsRow}</div>
      )}
      {chips && (
        <motion.div {...develop(1)} className="mt-3 flex gap-1.5 px-1">
          {TABS.map((t) => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex h-9 items-center rounded-full px-4 text-[12.5px] font-medium tracking-[-0.01em] outline-none transition-colors duration-200 ${
                  isActive
                    ? 'bg-ink text-white'
                    : 'border border-white/70 bg-white/50 text-ink-secondary'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </motion.div>
      )}

      {/* The shelf — swapped whole when the tab or any chip lens changes
          (each change replays the board's entrance), filtered live while
          typing (keys hold steady, so no re-entrance per keystroke). */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${tab}·${view}·${sort}·${filter}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="mt-4 pb-[200px]"
        >
          {visible.length === 0 ? (
            <p className="pt-12 text-center text-[12.5px] text-ink-tertiary">
              {q ? (
                <>Nothing here matches &ldquo;{query.trim()}&rdquo;</>
              ) : filter !== 'all' ? (
                <>Nothing matches this filter</>
              ) : (
                <>Nothing here yet</>
              )}
            </p>
          ) : view === 'list' ? (
            // Everything as rows — projects flattened to their title +
            // status, loose threads exactly as they already render.
            <div className="flex flex-col gap-0.5">
              {listItems.map((it, i) => (
                <motion.div key={it.id} {...develop(i + 1)}>
                  {it.kind === 'row' ? (
                    it.render()
                  ) : (
                    <ThreadRow title={it.title} time={it.meta ?? ''} onOpen={it.open} />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <>
              {cards.length > 0 &&
                (view === 'stacked' ? (
                  // One column, full-width cards — the board as a feed.
                  <div className="flex flex-col gap-2.5">
                    {cards.map((it, i) => (
                      <motion.div key={it.id} {...develop(i + 1)}>
                        {it.render()}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    {cols.map((col, c) => (
                      <div key={c} className="flex min-w-0 flex-1 flex-col gap-2.5">
                        {col.map((it) => (
                          <motion.div key={it.id} {...develop(it.i + 1)}>
                            {it.render()}
                          </motion.div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              {rows.length > 0 && (
                <div className={`flex flex-col gap-0.5 ${cards.length > 0 ? 'mt-3' : ''}`}>
                  {rows.map((it, i) => (
                    <motion.div key={it.id} {...develop(cards.length + i + 1)}>
                      {it.render()}
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── The root's places ────────────────────────────────────────────────── */

/** The app's top-level places. Assistant is the conversational home
    (upcoming receipts, connect); Projects is the board. Everything else
    — threads, containers, drafts — is pushed on top of whichever place
    you're standing in. */
type Place = 'assistant' | 'projects' | 'decide'

/** 5C's three rooms, named for what the user does in them: Todo is the
    board (what's being kept alive), Do is the Assistant conversation
    (the implicit home, seated center), Decide is the space where open
    calls gather. */
const TRIO_SEGMENTS: { id: Place; label: string }[] = [
  { id: 'projects', label: 'Todo' },
  { id: 'assistant', label: 'Do' },
  { id: 'decide', label: 'Decide' },
]

/** The drawer's handle — three bars, drawn 1:1 for crisp strokes. */
function MenuGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 5.5h16" />
      <path d="M3 11h16" />
      <path d="M3 16.5h16" />
    </svg>
  )
}

/** 5C's top chrome — one frosted pill that is both the wayfinding and
    the conversation's name, depending on the altitude. At the root it
    holds the three room segments (Todo · Do · Decide) with a white thumb
    sliding between them; the moment a conversation starts it *morphs* —
    same pill, same material, width reflowing on a spring — into the
    context chip carrying the conversation's name and its ticket badge.
    Nothing pages: the one object the user was just touching becomes the
    label of where they've landed. */
function TrioChrome({
  mode,
  place,
  title,
  onSwitch,
}: {
  /** segments at the root, chip inside a conversation, hidden elsewhere
      (threads carry their own header). */
  mode: 'segments' | 'chip' | 'hidden'
  place: Place
  /** The conversation's name once it has one ("New project" until). */
  title?: string
  onSwitch: (p: Place) => void
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
      style={{ paddingTop: 'calc(var(--safe-top) + 14px)' }}
    >
      <AnimatePresence>
        {mode !== 'hidden' && (
          <motion.div
            key="trio-pill"
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15, ease: EASE } }}
            transition={{
              duration: 0.3,
              ease: EASE,
              layout: { type: 'spring', stiffness: 380, damping: 32 },
            }}
            className="pointer-events-auto flex items-center rounded-[24px] border border-white bg-[rgba(250,250,250,0.7)] p-1 shadow-[0px_2px_40px_0px_rgba(0,0,0,0.1)] backdrop-blur-[12px]"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === 'segments' ? (
                <motion.div
                  key="segments"
                  className="flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: EASE }}
                >
                  {TRIO_SEGMENTS.map((seg) => {
                    const isActive = seg.id === place
                    // Equal-width segments: label-fit widths would seat the
                    // middle room off the pill's true center.
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        aria-label={seg.label}
                        aria-pressed={isActive}
                        onClick={() => onSwitch(seg.id)}
                        className="relative flex h-[34px] w-[76px] items-center justify-center outline-none transition-transform duration-200 ease-out active:scale-95"
                      >
                        {/* The thumb — solid black so the active room's
                            name reads in reversed white ink. */}
                        {isActive && (
                          <motion.span
                            layoutId="trio-thumb"
                            className="absolute inset-0 rounded-full bg-ink shadow-[0_1px_6px_rgba(0,0,0,0.16)]"
                            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                          />
                        )}
                        <span
                          className={`relative text-[13px] leading-none font-medium tracking-[-0.01em] transition-colors duration-200 ${
                            isActive ? 'text-white' : 'text-[#a3a3a3]'
                          }`}
                        >
                          {seg.label}
                        </span>
                      </button>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="chip"
                  className="flex h-[34px] items-center gap-0.5 pr-1 pl-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: EASE }}
                >
                  <span className="max-w-[176px] overflow-hidden text-[13px] font-medium tracking-[-0.01em] text-ellipsis whitespace-nowrap text-ink">
                    {title}
                  </span>
                  {/* The ticket badge — the conversation's receipts will
                      collect here, same as every thread's island. */}
                  <span className="flex items-center rounded-[30px] border border-[#ececec] bg-[#f5f5f5] p-[3px]">
                    <span className="flex size-[18px] items-center justify-center">
                      <img
                        src="/nav/ticket.svg"
                        alt=""
                        draggable={false}
                        className="h-[9px] w-auto"
                      />
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Decide, while it's still quiet — the room where open calls will
    gather (a date to lock, a place to pick between). Until one exists,
    it says so plainly, centered on the full mesh like the Assistant's
    own empty states. */
function DecideFloor() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-8 pb-24 text-center">
      <motion.p
        {...develop(0)}
        className="text-[17px] font-semibold tracking-[-0.01em] text-ink"
      >
        Nothing to decide
      </motion.p>
      <motion.p
        {...develop(1)}
        className="mt-2 max-w-[250px] text-[13px] leading-[1.5] text-ink/50"
      >
        When a plan needs your call — a date to lock, a place to pick — it
        lands here.
      </motion.p>
    </div>
  )
}

/** The Projects ingress (5E's home shortcut) — four points holding a
    rectangle's corners, generously spaced: the board reduced to its
    gravity, not a tab. */
function DotGridGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="1.9" />
      <circle cx="16.5" cy="5.5" r="1.9" />
      <circle cx="5.5" cy="16.5" r="1.9" />
      <circle cx="16.5" cy="16.5" r="1.9" />
    </svg>
  )
}

/* ── The menu — one root, places behind a drawer (5E) ─────────────────── */

/** Where a menu row can point: the Assistant home, or the board opened
    to one of its shelves. */
type MenuDest = 'assistant' | Tab

/* ── 5E's board options — the chip that expands (Photos-style) ────────── */

type BoardSort = 'recent' | 'alpha'
type BoardFilter = 'all' | 'tasks' | 'reservations'
type BoardView = 'grid' | 'stacked' | 'list'

/** One pick — leading check slot (iOS grammar: the mark rides the left
    edge), optional glyph, label. */
function PickRow({
  label,
  picked,
  glyph,
  onPick,
}: {
  label: string
  picked: boolean
  glyph?: ReactNode
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex h-10 w-full items-center gap-2.5 px-4 text-left outline-none transition-colors duration-150 active:bg-black/[0.04]"
    >
      <span className="flex w-4 shrink-0 items-center justify-center">
        {picked && (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#171717"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m4 12.5 5.5 5.5L20 6.5" />
          </svg>
        )}
      </span>
      {glyph && (
        <span className="flex shrink-0 items-center justify-center text-ink-secondary">
          {glyph}
        </span>
      )}
      <span className="text-[13.5px] font-medium tracking-[-0.01em] text-ink">{label}</span>
    </button>
  )
}

/** A section row — a door, not a fold: tapping it swaps the panel for
    that section's own popover. */
function SectionRow({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-10 w-full items-center justify-between px-4 text-left outline-none transition-colors duration-150 active:bg-black/[0.04]"
    >
      <span className="text-[13.5px] font-medium tracking-[-0.01em] text-ink">{label}</span>
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9a9a9a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </button>
  )
}

/** The section popover's header — the way back to the root menu, and the
    section's name so the panel introduces itself. */
function SubmenuHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Back to board options`}
      onClick={onBack}
      className="flex h-10 w-full items-center gap-1.5 px-3 text-left outline-none transition-colors duration-150 active:bg-black/[0.04]"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9a9a9a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m15 5-7 7 7 7" />
      </svg>
      <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">{label}</span>
    </button>
  )
}

/** 5E's board title chip, grown up: it still names the shelf you're on,
    but tapping it *morphs* it — same pill, same material, width and
    height reflowing on a spring — into a Photos-style options panel:
    shelf picks up top, then Sort / Filter / View doors. Each door swaps
    the panel for that section's own popover (a back header returns).
    Every option is live: they reorder, narrow, and re-shape the board. */
function BoardOptionsChip({
  shelf,
  onShelf,
  sort,
  onSort,
  filter,
  onFilter,
  view,
  onView,
  withConversations = false,
  align = 'center',
  bare = false,
}: {
  shelf: Tab
  onShelf: (s: Tab) => void
  sort: BoardSort
  onSort: (s: BoardSort) => void
  filter: BoardFilter
  onFilter: (f: BoardFilter) => void
  view: BoardView
  onView: (v: BoardView) => void
  /** Offer the Conversations shelf inside the chip — for hosts (5C) with
      no other doorway to loose threads. 5E reaches them via the drawer. */
  withConversations?: boolean
  /** 5E centers the chip in the island slot; 5C seats it at the board's
      left edge, where the tab row used to start. */
  align?: 'center' | 'left'
  /** Closed, just the words — no pill around the label (5C's board is
      already full of containers). The panel's surface still arrives with
      the morph; the material *is* the open state. */
  bare?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<'sort' | 'filter' | 'view' | null>(null)
  const close = () => {
    setOpen(false)
    setSection(null)
  }
  // Apply a pick and let the panel go — the board answering is the
  // feedback, the menu has said its piece.
  const pick = (apply: () => void) => {
    apply()
    close()
  }

  // The swap between chip / root menu / section popover crossfades while
  // the shared container does the size morph. Each face carries `layout`
  // so it joins the projection tree and gets counter-scaled — without it
  // the container's mid-morph scale lands raw on the incoming face (the
  // chip's label ballooning while the panel shrinks around it).
  const swap = {
    layout: true,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.14, ease: EASE },
  }

  const shelfLabel =
    shelf === 'active' ? 'Active' : shelf === 'conversations' ? 'Conversations' : 'Archived'

  return (
    // Anchored to the row's top (not centered): the open panel is far
    // taller than the row, and a centered static position would shove
    // half of it above the frame. 3px optically seats the closed chip
    // where items-center used to.
    <div
      className={`absolute top-[3px] z-40 ${
        align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-1'
      }`}
    >
      {/* Invisible catch-all — a tap anywhere else lets the panel go.
          Fixed resolves against the shell's transformed screen layer,
          so this spans exactly the frame. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="options-scrim"
            className="fixed inset-0 z-[-1]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* One object at every altitude: the chip IS the popover, caught
          mid-morph. Material deepens as it grows (more fill, more
          shadow) so the panel reads as a surface, not a label. */}
      <motion.div
        {...develop(0)}
        layout
        style={{ borderRadius: 26 }}
        transition={{ layout: { type: 'spring', stiffness: 440, damping: 36 } }}
        // Border stays (transparent when bare-closed) so the box never
        // changes size when the surface arrives — only paint transitions.
        className={`overflow-hidden border transition-[background-color,box-shadow,border-color] duration-200 ${
          open
            ? 'border-white bg-[rgba(250,250,250,0.94)] shadow-[0px_12px_60px_rgba(0,0,0,0.18)] backdrop-blur-[24px]'
            : bare
              ? 'border-transparent'
              : 'border-white bg-[rgba(250,250,250,0.7)] shadow-[0px_2px_40px_0px_rgba(0,0,0,0.1)] backdrop-blur-[12px]'
        }`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!open ? (
            <motion.button
              key="chip"
              {...swap}
              type="button"
              aria-label={`Showing ${shelfLabel.toLowerCase()} — tap for options`}
              aria-expanded={open}
              onClick={() => setOpen(true)}
              // Press-scale through framer, not CSS: the chip is a layout
              // node now, and a CSS transform transition would smooth (lag)
              // the per-frame counter-scale it receives during the morph.
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-1.5 py-[9px] outline-none ${
                bare ? 'pr-2 pl-1' : 'pr-4 pl-5'
              }`}
            >
              <span className="relative flex h-[17px] items-center overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={shelf}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.16, ease: EASE }}
                    className="text-[13.5px] font-medium tracking-[-0.01em] text-ink"
                  >
                    {shelfLabel}
                  </motion.span>
                </AnimatePresence>
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9a9a9a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </motion.button>
          ) : section === null ? (
            <motion.div
              key="root"
              {...swap}
              role="menu"
              aria-label="Board options"
              className="w-[248px] py-2"
            >
              {/* The shelves — where the chip's own name comes from. */}
              <PickRow
                label="Active"
                picked={shelf === 'active'}
                onPick={() => pick(() => onShelf('active'))}
              />
              {withConversations && (
                <PickRow
                  label="Conversations"
                  picked={shelf === 'conversations'}
                  onPick={() => pick(() => onShelf('conversations'))}
                />
              )}
              <PickRow
                label="Archived"
                picked={shelf === 'archive'}
                onPick={() => pick(() => onShelf('archive'))}
              />

              <div className="mx-4 my-1.5 border-t border-ink/10" />

              <SectionRow label="Sort" onOpen={() => setSection('sort')} />
              <SectionRow label="Filter" onOpen={() => setSection('filter')} />
              <SectionRow label="View" onOpen={() => setSection('view')} />
            </motion.div>
          ) : section === 'sort' ? (
            <motion.div
              key="sort"
              {...swap}
              role="menu"
              aria-label="Sort options"
              className="w-[248px] py-2"
            >
              <SubmenuHeader label="Sort" onBack={() => setSection(null)} />
              <PickRow
                label="Recent activity"
                picked={sort === 'recent'}
                onPick={() => pick(() => onSort('recent'))}
              />
              <PickRow
                label="A to Z"
                picked={sort === 'alpha'}
                onPick={() => pick(() => onSort('alpha'))}
              />
            </motion.div>
          ) : section === 'filter' ? (
            <motion.div
              key="filter"
              {...swap}
              role="menu"
              aria-label="Filter options"
              className="w-[248px] py-2"
            >
              <SubmenuHeader label="Filter" onBack={() => setSection(null)} />
              <PickRow
                label="All items"
                picked={filter === 'all'}
                glyph={
                  <svg width="14" height="14" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
                    <circle cx="5.5" cy="5.5" r="1.9" />
                    <circle cx="16.5" cy="5.5" r="1.9" />
                    <circle cx="5.5" cy="16.5" r="1.9" />
                    <circle cx="16.5" cy="16.5" r="1.9" />
                  </svg>
                }
                onPick={() => pick(() => onFilter('all'))}
              />
              <PickRow
                label="Open tasks"
                picked={filter === 'tasks'}
                glyph={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="m8.5 12 2.5 2.5 5-5" />
                  </svg>
                }
                onPick={() => pick(() => onFilter('tasks'))}
              />
              <PickRow
                label="Reservations"
                picked={filter === 'reservations'}
                glyph={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-6Z" />
                    <path d="M14 5v14" strokeDasharray="2.5 2.5" />
                  </svg>
                }
                onPick={() => pick(() => onFilter('reservations'))}
              />
            </motion.div>
          ) : (
            <motion.div
              key="view"
              {...swap}
              role="menu"
              aria-label="View options"
              className="w-[248px] py-2"
            >
              <SubmenuHeader label="View" onBack={() => setSection(null)} />
              <PickRow
                label="Grid"
                picked={view === 'grid'}
                glyph={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                  </svg>
                }
                onPick={() => pick(() => onView('grid'))}
              />
              <PickRow
                label="Stacked"
                picked={view === 'stacked'}
                glyph={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3.5" y="3.5" width="17" height="7" rx="1.5" />
                    <rect x="3.5" y="13.5" width="17" height="7" rx="1.5" />
                  </svg>
                }
                onPick={() => pick(() => onView('stacked'))}
              />
              <PickRow
                label="List"
                picked={view === 'list'}
                glyph={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                  </svg>
                }
                onPick={() => pick(() => onView('list'))}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/** The system rows the drawer holds — account cargo, not wayfinding
    (the corner glyphs already move between places). */
const MENU_NAV = ['Apps', 'Wallet / Receipts', 'Purchases', 'Preferences', 'Support']

/** The loose threads the drawer lists — conversations that never grew
    into projects (the same inventory as the board's Conversations shelf). */
const MENU_THREADS = [
  { title: 'Gift ideas for Mom', time: 'Tuesday' },
  { title: 'Best espresso near the office', time: 'Jul 30' },
  { title: 'Marathon training plan', time: 'May' },
]

/** 5E's menu — not a panel over the app but a floor beneath it (the
    Timepage move): the whole running app pulls away to the right and
    parks as a floating card (the shell owns that transform, driven by
    the frameCardBus), and this dark surface is what it reveals. System
    rows up top, then every loose conversation. Tapping the card closes;
    tapping a thread sails straight into it. */
function SideMenu({
  open,
  onOpenThread,
  onApps,
}: {
  open: boolean
  onOpenThread: (title: string) => void
  /** The Apps row is a real doorway — it opens the home's connect face. */
  onApps?: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu-floor"
          role="dialog"
          aria-label="Menu"
          className="absolute inset-0 z-0 flex flex-col overflow-y-auto bg-[#131117] pl-7"
          style={{
            paddingTop: 'calc(var(--safe-top) + 22px)',
            paddingBottom: 'calc(var(--safe-bottom) + 24px)',
            scrollbarWidth: 'none',
          }}
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.42, ease: EASE } }}
          // The card slides back over it — just settle, don't race it.
          exit={{ opacity: 0, transition: { duration: 0.28, ease: EASE, delay: 0.12 } }}
        >
          {/* Content lives in the left ~60% — the card parks over the rest. */}
          <div className="flex w-[62%] min-w-0 flex-col">
            <motion.p
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.35, ease: EASE } }}
              className="text-[21px] font-semibold tracking-[0.14em] text-white"
            >
              SECRETS
            </motion.p>

            {/* System cargo — account things, deliberately not places. */}
            <nav className="mt-7 flex flex-col">
              {MENU_NAV.map((label, i) => (
                <motion.button
                  key={label}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: 0.12 + i * 0.04, duration: 0.32, ease: EASE },
                  }}
                  type="button"
                  onClick={label === 'Apps' ? onApps : undefined}
                  className="flex h-11 items-center text-left text-[16px] font-medium tracking-[-0.01em] text-white/90 outline-none transition-colors duration-150 active:text-white"
                >
                  {label}
                </motion.button>
              ))}
            </nav>

            {/* Loose threads — history that never grew into a project. */}
            <motion.p
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.34, duration: 0.32, ease: EASE } }}
              className="mt-8 text-[12px] font-medium tracking-[-0.01em] text-white/40"
            >
              Conversations
            </motion.p>
            <div className="mt-2 flex flex-col">
              {MENU_THREADS.map((t, i) => (
                <motion.button
                  key={t.title}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: 0.38 + i * 0.04, duration: 0.32, ease: EASE },
                  }}
                  type="button"
                  onClick={() => onOpenThread(t.title)}
                  className="flex h-10 items-center gap-2.5 text-left outline-none transition-colors duration-150"
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] tracking-[-0.01em] text-white/80">
                    {t.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-white/30">{t.time}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── New projects — born as conversations ─────────────────────────────── */

/** A project created this session. `named` flips once the user has said
    what it's about — until then the draft floor asks for it. `ask` keeps
    the words that named it (they become the first message of its
    conversation). A project born through a brand's lens keeps that mark
    as its first fingerprint. */
type Draft = {
  id: string
  title: string
  named: boolean
  ask?: string
  brandLogo?: string
}

/** Shape an utterance into a card title: drop conversational lead-ins,
    cap the length, and capitalize like the seeded projects. */
function toTitle(utterance: string) {
  const bare = utterance
    .replace(/^\s*(help me|let'?s|i want to|i need to|can you|please|new project[:,]?)\s+/i, '')
    .trim()
  const cut = bare.length > 42 ? `${bare.slice(0, 42).trimEnd()}…` : bare
  return cut.charAt(0).toUpperCase() + cut.slice(1)
}

/** Ready-made first moves for an unnamed project — one from each family
    (trip / occasion / purchase), so the examples teach the range of what
    a project can hold. Tapping one is the same as saying it. */
const DRAFT_SEEDS = [
  'Plan a weekend away',
  'Organize a birthday dinner',
  'Research a big purchase',
]

/** How the draft floor guides: 'templates' fans the template deck behind
    the composer (5B); 'ask' centers the classic empty-state goo with the
    prompts exposed at the compose zone (5C). */
export type DraftVariant = 'templates' | 'ask'

function SeedChip({
  children,
  delay = 0,
  onPick,
}: {
  children: string
  delay?: number
  onPick?: () => void
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { delay, duration: 0.35, ease: EASE } }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.18, ease: EASE } }}
      type="button"
      onClick={onPick}
      className="rounded-full border border-white/70 bg-white/60 px-4.5 py-2.5 text-[13px] tracking-[-0.01em] text-ink shadow-[0_2px_20px_rgba(0,0,0,0.05)] backdrop-blur-[10px] outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
    >
      {children}
    </motion.button>
  )
}

/** Small agent-is-typing beat, same grammar as the transaction thread's. */
function DraftTypingDots() {
  return (
    <div className="flex h-8 w-fit items-center gap-1 rounded-full bg-black/[0.06] px-3.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink/40"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/** Generic first moves for a project that didn't come from a template. */
const GENERIC_MOVES = ['Set the dates', 'Start a task list', 'Book something']

/** Past the end of a script, every further pick gets the workhorse ack. */
const TERMINAL_ACK = 'On it — I\u2019ll line that up and file it here.'

/** The established 2D pick module, dropped into the draft conversation:
    provider attribution pills (for restaurant results), the stacked
    place cards, and the compare affordance. Tapping the front card is
    the user's answer. */
function PlacesTurn({
  places,
  answered,
  onPick,
}: {
  places: 'restaurants' | RankedResult[]
  answered: boolean
  onPick: (text: string) => void
}) {
  const restaurants = places === 'restaurants'
  const [provider, setProvider] = useState<ProviderId>('yelp')
  const results = restaurants ? PROVIDER_RESULTS[provider] : places
  const starColor = restaurants
    ? (PROVIDERS.find((p) => p.id === provider)?.starColor ?? '#D32323')
    : '#FBBC04'
  return (
    <div className="mt-3.5 flex flex-col gap-3.5">
      {restaurants && <ProviderChips active={provider} onSelect={setProvider} />}
      <div className="mt-1">
        <PlaceCardStack
          key={restaurants ? provider : 'fixed'}
          results={results}
          starColor={starColor}
          ambient={false}
          onSelect={(r) => {
            if (!answered)
              onPick(`Let\u2019s go with ${r.place.name.replace(/ Restaurant$/, '')}`)
          }}
        />
      </div>
      <button
        type="button"
        className="mx-auto flex items-center gap-1.5 rounded-full bg-black/[0.05] px-4 py-2.5 text-[12px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
      >
        {restaurants ? 'Compare restaurants' : 'Compare options'}
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9a9a9a"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

/** The named state — no fresh empty room, the same screen becomes the
    conversation. Whatever named the project (a tapped template card
    morphs here, an utterance just lands) is the first message, and the
    agent drives its script from there: clarifying questions, then real
    recommendations, then the wrap-up — every exchange in place. */
function ConversationFloor({ draft }: { draft: Draft }) {
  const template = TEMPLATES.find((t) => t.title === draft.title)
  const ask = template?.ask ?? draft.ask ?? draft.title
  const script: ScriptStep[] = template?.script ?? [
    {
      reply: `Done — this is \u201C${draft.title}\u201D now. What\u2019s the first move? Bookings, tasks, and receipts will file themselves here.`,
      suggestions: GENERIC_MOVES,
    },
  ]

  // The exchange so far: the user's picks, and how many agent turns have
  // landed (the agent owes turns.length + 1 — one per answer plus the
  // opening). The gap between the two is the typing beat.
  const [turns, setTurns] = useState<string[]>([])
  const [agentCount, setAgentCount] = useState(0)
  useEffect(() => {
    const t = window.setTimeout(() => setAgentCount(1), 1000)
    return () => clearTimeout(t)
  }, [])
  const pick = (text: string) => {
    setTurns((s) => [...s, text])
    window.setTimeout(() => setAgentCount((n) => n + 1), 950)
  }

  // Keep the newest exchange on screen as the thread grows.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [agentCount, turns.length])

  return (
    <div
      ref={scrollRef}
      // 2D's thread geometry: the host slot already carries the frame's
      // 16px gutter (no padding of our own) and sits below safe-top, so
      // the same flat 84px clears the portaled header.
      className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-[84px] pb-28"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* The user's opening turn — the template card lands here (shared
          layoutId), or the spoken words develop in on their own. */}
      <div className="flex flex-col items-end">
        <motion.div
          layoutId="draft-seed"
          // Opacity stays framer's: the shared-element crossfade carries
          // the card → bubble handoff (explicit opacity would override it
          // and leave a dead frame between the two).
          transition={{ layout: { type: 'spring', stiffness: 340, damping: 30 } }}
          className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white"
        >
          {ask}
        </motion.div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>

      {/* The exchange — agent turn k answers the user's k-th message.
          Past the script's end the agent just acks and keeps working. */}
      {Array.from({ length: agentCount }).map((_, k) => {
        const step = script[k] as ScriptStep | undefined
        const isLatest = k === agentCount - 1
        const answered = turns[k] !== undefined
        const suggestions = step?.suggestions?.filter((s) => !turns.includes(s)) ?? []
        return (
          <div key={k} className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mt-2.5"
            >
              <p className="text-[14px] leading-relaxed text-ink">{step?.reply ?? TERMINAL_ACK}</p>

              {/* Concrete picks — the same module 2D established: pills,
                  the card stack, compare. It stays in the thread once
                  surfaced (content, not chrome). */}
              {step?.places && (
                <PlacesTurn places={step.places} answered={answered} onPick={pick} />
              )}

              {/* Quick answers ride only the live turn — once answered,
                  the chosen words live in the user's bubble instead. */}
              {isLatest && !answered && suggestions.length > 0 && (
                <div className="mt-3.5 flex flex-col items-start gap-2">
                  <AnimatePresence initial={false}>
                    {suggestions.map((s, i) => (
                      <SeedChip key={s} delay={0.12 + 0.07 * i} onPick={() => pick(s)}>
                        {s}
                      </SeedChip>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* The user's answer to this turn. */}
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: EASE }}
                className="mt-4 self-end rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white"
              >
                {turns[k]}
              </motion.div>
            )}
          </div>
        )
      })}

      {/* The agent owes a turn — typing. */}
      {agentCount < turns.length + 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.35 } }}
          className="mt-2.5"
        >
          <DraftTypingDots />
        </motion.div>
      )}
    </div>
  )
}

/** The template deck 5B fans behind the composer — each card a ready-made
    project shape, previewing the moves it opens with and the providers
    standing by to run them. Picking one is the same as saying its title. */
/** One agent turn in a draft's scripted conversation: what it says, and
    how the user can answer — quick-reply chips, or the established 2D
    pick module (provider pills + stacked place cards + compare).
    `places: 'restaurants'` runs the full provider-switchable restaurant
    results; a custom list runs the same stack over other inventory
    (hotels, venues). */
type ScriptStep = {
  reply: string
  suggestions?: string[]
  places?: 'restaurants' | RankedResult[]
}

const TEMPLATES: {
  id: string
  title: string
  /** The natural-language message the tapped card becomes — the user
      telling the agent to open this project. */
  ask: string
  /** The conversation the agent drives from there: clarifying questions
      first (who / when / where), then real recommendations, then the
      wrap-up. Each user answer advances one step. */
  script: ScriptStep[]
  prompts: string[]
  providers: string[]
}[] = [
  {
    id: 'birthday',
    title: 'Plan a birthday weekend',
    ask: 'Create a project to plan a birthday weekend.',
    script: [
      {
        reply: 'Fun — whose birthday, and which weekend are we aiming for?',
        suggestions: [
          'My sister\u2019s — the weekend of Jul 25',
          'My dad\u2019s — mid-August',
          'Mine — end of the month',
        ],
      },
      {
        reply: 'Love it. Where\u2019s the party happening?',
        suggestions: ['Healdsburg — wine country', 'Here in San Francisco', 'Still deciding'],
      },
      {
        reply:
          'Perfect. For the birthday dinner, Valette is my pick — special without being stuffy. Take it, or compare the others:',
        places: 'restaurants',
      },
      {
        reply:
          'Done — the table\u2019s requested and the confirmation will file here. Want me to line up the rest?',
        suggestions: ['Book flights for four', 'Order the cake', 'Find a place to stay'],
      },
    ],
    prompts: ['Book flights for four', 'Reserve the dinner', 'Order the cake'],
    providers: ['/providers/united.png', '/providers/expedia.png', '/providers/opentable.svg'],
  },
  {
    id: 'vacation',
    title: 'Family vacation',
    ask: 'Start a project for a family vacation.',
    script: [
      {
        reply: 'Nice. Where are you dreaming of, and roughly when?',
        suggestions: ['Maui in June', 'Japan over spring break', 'Somewhere warm — flexible'],
      },
      {
        reply: 'Great call. I\u2019ll start watching fares — and here\u2019s where I\u2019d stay:',
        places: [
          {
            place: {
              id: 'wailea',
              name: 'Grand Wailea',
              cuisine: 'Resort \u2022 Wailea Beach',
              price: '$$$$',
              image: '/receipts/photos/hotel-pool.jpg',
            },
            rating: 4.6,
            reviews: 3241,
          },
          {
            place: {
              id: 'andaz',
              name: 'Andaz Maui',
              cuisine: 'Resort \u2022 Quieter beach',
              price: '$$$$',
              image: '/receipts/photos/hotel-deck.jpg',
            },
            rating: 4.5,
            reviews: 2114,
          },
          {
            place: {
              id: 'villa',
              name: 'Villa on Keawakapu',
              cuisine: 'Airbnb \u2022 3BR \u2022 Full kitchen',
              price: '$$$',
              image: '/receipts/photos/hotel-room.jpg',
            },
            rating: 4.9,
            reviews: 187,
          },
        ],
      },
      {
        reply: 'Held it — details will file here as they land. Next I\u2019d line up:',
        suggestions: ['Watch fares for four', 'Plan the park days', 'Arrange the rental car'],
      },
    ],
    prompts: ['Watch fares to Maui', 'Find a family suite', 'Plan the park days'],
    providers: ['/providers/united.png', '/providers/expedia.png', '/providers/googlemaps.svg'],
  },
  {
    id: 'offsite',
    title: 'Team offsite',
    ask: 'Set up a project for our team offsite.',
    script: [
      {
        reply: 'Got it. How many people, and which dates?',
        suggestions: ['12 of us — mid-September', 'About 30 — early October', 'Small crew — next month'],
      },
      {
        reply: 'That works. Venues I\u2019d shortlist for that size:',
        places: [
          {
            place: {
              id: 'cavallo',
              name: 'Cavallo Point',
              cuisine: 'Sausalito \u2022 Meetings + trails',
              price: '$$$$',
              image: '/receipts/photos/hotel-deck.jpg',
            },
            rating: 4.7,
            reviews: 892,
          },
          {
            place: {
              id: 'sonoma-lodge',
              name: 'The Lodge at Sonoma',
              cuisine: 'Wine country \u2022 Group dining',
              price: '$$$',
              image: '/receipts/photos/hotel-pool.jpg',
            },
            rating: 4.5,
            reviews: 1203,
          },
          {
            place: {
              id: 'timber-cove',
              name: 'Timber Cove',
              cuisine: 'Sonoma coast \u2022 Full buyout',
              price: '$$$',
              image: '/receipts/photos/hotel-room.jpg',
            },
            rating: 4.6,
            reviews: 764,
          },
        ],
      },
      {
        reply: 'Held — the contract files here when it\u2019s countersigned. Keep going?',
        suggestions: ['Arrange group travel', 'Plan the dinner night', 'Draft the agenda'],
      },
    ],
    prompts: ['Book the venue', 'Arrange group travel', 'Plan the dinner night'],
    providers: ['/providers/expedia.png', '/providers/uber.png', '/providers/opentable.svg'],
  },
  {
    id: 'night-out',
    title: 'Big night out',
    ask: 'Start a project for a big night out.',
    script: [
      {
        reply: 'Great. Which night, and how many are coming?',
        suggestions: ['Saturday — six of us', 'Friday — just the two of us', 'Next weekend — TBD'],
      },
      {
        reply:
          'Tickets are still open at The Fillmore — grabbing those. For dinner before the show, here\u2019s where I\u2019d book:',
        places: 'restaurants',
      },
      {
        reply: 'Locked. Tickets and the table will file here. Anything else?',
        suggestions: ['Line up the ride', 'Add it to the group chat', 'Set a reminder'],
      },
    ],
    prompts: ['Score show tickets', 'Book dinner before', 'Line up the ride'],
    providers: ['/providers/ticketmaster.png', '/providers/opentable.svg', '/providers/uber.png'],
  },
]

/** Fan poses by depth — front card square to the thumb, the rest peeking
    out behind it, fading with distance like the ticket stack. */
const FAN_POSES = [
  // Solid cards — the front fully present, the sides stepped back but
  // clearly readable. The dissolve into the mesh is the mask's job.
  { x: 0, y: 0, rotate: -2, scale: 1, opacity: 1 },
  { x: 92, y: 12, rotate: 9, scale: 0.93, opacity: 0.55 },
  { x: -92, y: 14, rotate: -10, scale: 0.93, opacity: 0.55 },
  { x: 0, y: 24, rotate: 3, scale: 0.88, opacity: 0.35 },
]

/** 5B's template stack — cards fanned behind the composer orb, half
    dissolved into the mesh glow. Swipe the front card aside to browse
    (it swims to the back), tap a card to start the project from it. */
function TemplateFan({ onPick }: { onPick?: (seed: string) => void }) {
  // The fan is a cycle: order[0] is the front card.
  const [order, setOrder] = useState(() => TEMPLATES.map((_, i) => i))
  const cycle = () => setOrder((o) => [...o.slice(1), o[0]])
  // A swipe must never read as a pick — framer fires onTap after a drag
  // too, so the drag flags itself and the tap stands down.
  const draggingRef = useRef(false)

  return (
    <motion.div
      {...develop(3)}
      // Reaches past the content slot's bottom edge into the dock zone so
      // the cards genuinely sit behind the orb (dock rides z-40 above).
      // The mask melts their lower halves into the ambient mesh.
      className="pointer-events-none absolute inset-x-0 -bottom-20 flex justify-center"
      style={{
        maskImage:
          'linear-gradient(to bottom, black 0%, black 52%, rgba(0,0,0,0.4) 78%, transparent 98%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, black 0%, black 52%, rgba(0,0,0,0.4) 78%, transparent 98%)',
      }}
    >
      <div className="relative h-[320px] w-[264px]">
        {TEMPLATES.map((t, i) => {
          const depth = order.indexOf(i)
          const pose = FAN_POSES[Math.min(depth, FAN_POSES.length - 1)]
          const isFront = depth === 0
          return (
            <motion.div
              key={t.id}
              // The front card is the seed of the conversation: picking it
              // morphs this very card into the user's first chat bubble.
              layoutId={isFront ? 'draft-seed' : undefined}
              role="button"
              tabIndex={0}
              aria-label={`Start from template: ${t.title}`}
              className="pointer-events-auto absolute inset-x-0 top-0 mx-auto flex h-[300px] w-[228px] cursor-grab flex-col rounded-[26px] border border-white bg-[#fdfdfd] p-5 text-left shadow-[0_16px_44px_-20px_rgba(0,0,0,0.25)] active:cursor-grabbing"
              style={{ zIndex: TEMPLATES.length - depth }}
              initial={false}
              animate={{
                ...pose,
                transition: { type: 'spring', stiffness: 300, damping: 30 },
              }}
              drag={isFront ? 'x' : false}
              dragSnapToOrigin
              dragElastic={0.55}
              onDragStart={() => {
                draggingRef.current = true
              }}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 70 || Math.abs(info.velocity.x) > 500) cycle()
                requestAnimationFrame(() => {
                  draggingRef.current = false
                })
              }}
              // Tap the front card to start from it; tap a peeking card to
              // swim it forward for a look first.
              onTap={() => {
                if (draggingRef.current) return
                if (isFront) onPick?.(t.title)
                else setOrder((o) => [i, ...o.filter((x) => x !== i)])
              }}
            >
              {/* Content rides the card's top — the readable part peeks
                  above the composer while the blank lower part melts
                  behind the orb. */}
              <span className="text-[15px] leading-[19px] font-semibold tracking-[-0.01em] text-ink">
                {t.title}
              </span>
              {/* The providers standing by to run this kind of project. */}
              <span className="mt-2.5 flex -space-x-1">
                {t.providers.map((icon) => (
                  <span
                    key={icon}
                    className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] ring-1 ring-white"
                  >
                    <img src={icon} alt="" draggable={false} className="size-5 object-contain" />
                  </span>
                ))}
              </span>
              {/* Example first moves — the tasks this template opens with. */}
              <span className="mt-3.5 flex flex-col gap-2 border-t border-ink/10 pt-3">
                {t.prompts.map((p) => (
                  <span key={p} className="flex items-center gap-2">
                    <span className="size-3 shrink-0 rounded-full border-[1.2px] border-dashed border-ink/30" />
                    <span className="text-[11.5px] leading-[14px] text-ink-secondary">{p}</span>
                  </span>
                ))}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

/** 5B's unnamed floor: the classic empty-state goo centered with "ask
    anything" copy, and the template deck fanned behind the composer —
    faded into the mesh, swipeable like the ticket stack. */
function TemplatesFloor({ onSeed }: { onSeed?: (seed: string, brandLogo?: string) => void }) {
  return (
    <>
      {/* Bottom-padded so the goo holds the optical center above the fan. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 pb-24 text-center">
        <motion.div {...develop(0)}>
          <LogoGoo />
        </motion.div>
        <motion.p
          {...develop(1)}
          className="mt-7 text-[19px] leading-snug font-medium tracking-[-0.01em] text-ink"
        >
          Ask anything.
        </motion.p>
        <motion.p {...develop(2)} className="mt-2 max-w-60 text-[13px] leading-snug text-ink-secondary">
          Say it and a project takes shape — or start from a card below.
        </motion.p>
      </div>
      <TemplateFan onPick={(seed) => onSeed?.(seed)} />
    </>
  )
}

/** 5C's unnamed floor: the classic empty-state goo centered with "ask
    anything" copy, and the seed prompts exposed at the bottom of the
    compose zone — suggestions where the thumb already is. */
function AskFloor({ onSeed }: { onSeed?: (seed: string, brandLogo?: string) => void }) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.div {...develop(0)}>
          <LogoGoo />
        </motion.div>
        <motion.p
          {...develop(1)}
          className="mt-7 text-[19px] leading-snug font-medium tracking-[-0.01em] text-ink"
        >
          Ask anything.
        </motion.p>
        <motion.p {...develop(2)} className="mt-2 max-w-60 text-[13px] leading-snug text-ink-secondary">
          Trips, dinners, gifts — say it and this project takes shape around it.
        </motion.p>
      </div>
      {/* Suggestions exposed at the compose zone, stacked like a reply. */}
      <div className="flex flex-col items-start gap-2 px-1 pb-3">
        {DRAFT_SEEDS.map((seed, i) => (
          <SeedChip key={seed} delay={0.3 + 0.07 * i} onPick={() => onSeed?.(seed)}>
            {seed}
          </SeedChip>
        ))}
      </div>
    </>
  )
}

/** The floor a brand-new project opens onto — a guide, not a blank page.
    Naming it never changes the page: the empty state dissolves and the
    conversation takes over the same screen (the tapped card morphing
    into the first message via the shared layoutId). */
function DraftFloor({
  draft,
  variant = 'templates',
  onSeed,
}: {
  draft: Draft
  variant?: DraftVariant
  onSeed?: (seed: string, brandLogo?: string) => void
}) {
  return (
    <div className="relative flex h-full w-full flex-col">
      <AnimatePresence initial={false}>
        {draft.named ? (
          <motion.div
            key="conversation"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <ConversationFloor draft={draft} />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.24, ease: EASE } }}
          >
            {variant === 'templates' ? (
              <TemplatesFloor onSeed={onSeed} />
            ) : (
              <AskFloor onSeed={onSeed} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── The host — a navigation stack under the goo ──────────────────────── */

type Screen =
  | { kind: 'grid' }
  | { kind: 'project' }
  | { kind: 'thread'; title: string }
  | { kind: 'draft'; id: string }

export function ProjectGridHome({
  draftVariant = 'templates',
  chrome = 'island',
}: {
  /** Which empty state a new project's floor guides with (5B vs 5C). */
  draftVariant?: DraftVariant
  /** How the root's places are reached. 'island' is the "Projects" pill
      over the grid alone (5B); 'menu' hangs the Assistant/Projects places
      behind a slide-out drawer off a top-left handle (5E); 'trio' seats
      three rooms under one segmented pill — Todo (the board), Do (the
      Assistant, home) and Decide — and morphs that pill into the
      conversation's context chip the moment one starts (5C). */
  chrome?: 'island' | 'menu' | 'trio'
} = {}) {
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  // The screen's own portal target — overlays that must sit *under* the
  // dock's chrome (the trip file, so the orb's X stays live) land here
  // instead of on the viewport, which always paints over the app.
  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
    setScreenEl(document.getElementById('app-screen'))
  }, [])

  // The stack is the history: doorways push, chevrons pop. The top of the
  // stack is the visible screen.
  const [stack, setStack] = useState<Screen[]>([{ kind: 'grid' }])
  const screen = stack[stack.length - 1]

  // 5C and 5E share a multi-place root; they differ only in the doorway
  // (segmented pill vs drawer). Switching is a sibling move (no goo —
  // the goo marks altitude changes): the old place clears, and the new
  // one's elements develop in place — no page-swipe slide.
  const hasPlaces = chrome !== 'island'
  const [place, setPlace] = useState<Place>('assistant')
  const switchPlace = (p: Place) => {
    if (p !== place) setPlace(p)
  }

  // 5E: the menu. Its open state lives on the frameCardBus because the
  // *shell* owns the reveal — the whole app pulls right into a floating
  // card and the dark menu floor shows beneath. The shell also closes it
  // (tapping the card anywhere), so the bus is the one truth.
  const menuOpen = useFrameCard()
  const setMenuOpen = (v: boolean) => frameCardBus.set(v)
  useEffect(() => () => frameCardBus.set(false), [])
  const [menuView, setMenuView] = useState<'board' | 'conversations'>('board')
  const [shelf, setShelf] = useState<Tab>('active')
  // 5E's home shows one state at a time (no notch): the assistant's
  // briefing by default, or the connect-apps face when the drawer's
  // Apps row is the way in. New users would simply land on connect.
  const [homeFace, setHomeFace] = useState<'briefing' | 'connect'>('briefing')
  // Which artifact a briefing stub asked for — the receipts cycler
  // (on the trip-file channel) enters zoomed to that card.
  const [homeReceipt, setHomeReceipt] = useState<string | null>(null)
  // The board chip's lenses (5E) — how the shelf is ordered, narrowed,
  // and shaped. Owned here beside the shelf so the chip and the board
  // read one truth.
  const [boardSort, setBoardSort] = useState<BoardSort>('recent')
  const [boardFilter, setBoardFilter] = useState<BoardFilter>('all')
  const [boardView, setBoardView] = useState<BoardView>('grid')
  const selectFromMenu = (dest: MenuDest) => {
    setMenuOpen(false)
    if (dest === 'assistant') {
      setHomeFace('briefing')
      switchPlace('assistant')
      return
    }
    if (dest === 'conversations') {
      setMenuView('conversations')
    } else {
      setMenuView('board')
      setShelf(dest)
    }
    switchPlace('projects')
  }

  // Ambient by altitude — the grid sits on white canvas with the mesh
  // pushed down to a glow at the base (the moodboard's treatment, so the
  // cards carry the color); the project floor keeps the full mesh; a
  // thread drops back to the composer band. 5E keeps the mesh poured at
  // the base of the frame everywhere — the drawer's world stays on white
  // canvas with the glow along the bottom. 5C's Do room reads its spoken
  // briefing on the same white canvas; only Decide floods the mesh.
  useEffect(() => {
    ambientBus.set(
      chrome === 'menu'
        ? 'composer'
        : screen.kind === 'project' ||
            (chrome === 'trio' && screen.kind === 'grid' && place === 'decide')
          ? 'full'
          : 'composer',
    )
  }, [screen.kind, place, chrome])
  useEffect(() => () => ambientBus.set(null), [])

  // The receipts fan on the project floor rides the trip-file channel
  // (dock orb morphs to X). Never leak it across screens or unmount.
  const receiptsOpen = useTripFileOpen()
  useEffect(() => () => tripFileBus.close(), [])

  // Screen changes pass through the goo: the next stack commits mid-veil
  // via onSwap, so the swap is never seen raw.
  const [pending, setPending] = useState<Screen[] | null>(null)
  const navigate = (next: Screen[]) => {
    if (pending || zoomBusy.current) return
    tripFileBus.close()
    setPending(next)
  }

  // 5E's door into a fresh draft skips the goo — nothing is loading (the
  // floor is empty), so the camera just pushes in: the current screen
  // grows past the frame while the draft settles in from slightly small.
  // Backing out of a draft reverses the move.
  const [zoomPose, setZoomPose] = useState<keyof typeof ZOOM_POSES>('idle')
  const zoomBusy = useRef(false)
  const zoomNavigate = (next: Screen[], dir: 'fwd' | 'back') => {
    if (pending || zoomBusy.current) return
    zoomBusy.current = true
    tripFileBus.close()
    setZoomPose(dir === 'fwd' ? 'outFwd' : 'outBack')
    window.setTimeout(() => {
      setStack(next)
      // Same pruning as the goo's mid-veil swap: an unnamed draft that's
      // being left didn't happen.
      setDrafts((ds) =>
        ds.filter((d) => d.named || next.some((s) => s.kind === 'draft' && s.id === d.id)),
      )
      setZoomPose(dir === 'fwd' ? 'inFwd' : 'inBack')
      window.setTimeout(() => {
        setZoomPose('idle')
        zoomBusy.current = false
      }, 420)
    }, 190)
  }

  // 5C's conversations arrive without the goo: the segmented pill is
  // morphing into the context chip at that very moment, and a veil would
  // hide the one continuity the transition is built on. The stack just
  // swaps; the floor's own entrance grammar carries the rest.
  const trioNavigate = (next: Screen[]) => {
    if (pending || zoomBusy.current) return
    tripFileBus.close()
    setStack(next)
    setDrafts((ds) =>
      ds.filter((d) => d.named || next.some((s) => s.kind === 'draft' && s.id === d.id)),
    )
  }

  const push = (s: Screen) => {
    // Conversations in 5C morph open in place (see trioNavigate).
    if (chrome === 'trio' && s.kind === 'draft') trioNavigate([...stack, s])
    else navigate([...stack, s])
  }
  const pop = () => {
    if (stack.length <= 1) return
    // 5E's drafts arrived on the zoom — they leave the same way. 5C's
    // arrived on the morph — same. Everything else rides the goo.
    if (chrome === 'menu' && screen.kind === 'draft') {
      zoomNavigate(stack.slice(0, -1), 'back')
    } else if (chrome === 'trio' && screen.kind === 'draft') {
      trioNavigate(stack.slice(0, -1))
    } else {
      navigate(stack.slice(0, -1))
    }
  }

  // Projects born this session. Both doors lead to the same place: the
  // dashed tile makes an unnamed draft, an utterance on the grid makes a
  // named one — either way the user lands in its fresh conversation. But
  // only a *named* project is real: it earns its island and its grid card.
  // An unnamed draft that's abandoned simply evaporates — no husk saved.
  const [drafts, setDrafts] = useState<Draft[]>([])
  const createProject = (utterance?: string) => {
    const id = `draft-${Date.now()}`
    setDrafts((d) => [
      ...d,
      utterance
        ? { id, title: toTitle(utterance), named: true, ask: utterance }
        : { id, title: 'New project', named: false },
    ])
    if (chrome === 'menu') zoomNavigate([...stack, { kind: 'draft', id }], 'fwd')
    else push({ kind: 'draft', id })
  }
  // An unnamed draft takes its name from the first thing said inside it —
  // and keeps the brand mark, if the seed came through one's lens.
  const nameDraft = (id: string, utterance: string, brandLogo?: string) =>
    setDrafts((ds) =>
      ds.map((d) =>
        d.id === id && !d.named
          ? { ...d, title: toTitle(utterance), named: true, ask: utterance, brandLogo }
          : d,
      ),
    )

  const activeDraft =
    screen.kind === 'draft' ? drafts.find((d) => d.id === screen.id) : undefined

  // The board's filter — typed at the dock's floating search chip, answered
  // by the grid live behind the keyboard. Only the island grid (5B/5C)
  // carries it: 5E's drawer carries the wayfinding.
  const [query, setQuery] = useState('')
  const searchChip =
    chrome === 'island' ? <SearchDock query={query} onQuery={setQuery} /> : undefined

  return (
    <>
      {/* The zoom shell — inert at idle; 5E's draft door drives it through
          its out/in poses around the stack swap. */}
      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={false}
        animate={ZOOM_POSES[zoomPose]}
      >
      {screen.kind === 'grid' ? (
        <VoiceControl
          key="grid"
          dockHint={searchChip}
          dockAux={chrome === 'menu' || chrome === 'trio'}
          idleContent={
            hasPlaces ? (
              // Two places under one root: the Assistant home (upcoming +
              // connect — Files is redundant when Projects is a place of
              // its own) and the board. No page-swipe slide between them —
              // the old place clears with a fast fade, then the new one's
              // elements develop in place on their own staggered rises
              // (each page's entrance grammar), overlapping the mesh pour.
              <div className="relative h-full w-full">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    // In menu mode the board and the Conversations page are
                    // separate destinations — moving between them crossfades
                    // like a place switch.
                    key={
                      chrome === 'menu'
                        ? place === 'projects'
                          ? `projects-${menuView}`
                          : `${place}-${homeFace}`
                        : place
                    }
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.15, ease: EASE } }}
                    exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE } }}
                  >
                    {place === 'assistant' ? (
                      chrome === 'menu' ? (
                        // 5E: one state at a time, no notch — the drawer
                        // carries the lateral moves (its Apps row opens
                        // the connect face). The default face is the
                        // assistant's spoken briefing, not 1B's card pile.
                        homeFace === 'connect' ? (
                          <HomeStates pages={['connect']} />
                        ) : (
                          <BriefingHome
                            onOpen={(title) => push({ kind: 'thread', title })}
                            onOpenReceipt={(id) => {
                              setHomeReceipt(id)
                              tripFileBus.open()
                            }}
                          />
                        )
                      ) : (
                        // 5C's Do room — the assistant's spoken briefing,
                        // no notch: the trio pill is the only wayfinding.
                        <BriefingHome onOpen={(title) => push({ kind: 'thread', title })} />
                      )
                    ) : place === 'decide' ? (
                      // 5C's third room — open calls gather here; quiet
                      // until one exists.
                      <DecideFloor />
                    ) : chrome === 'trio' ? (
                      // 5C's Todo room is the board itself — the pill
                      // above already names the place, so no island, no ⋯.
                      // The tab row condenses into the one options chip
                      // (shelves + sort / filter / view), 5E's grammar.
                      <ProjectGrid
                        island={false}
                        chips={false}
                        menuDots={false}
                        tab={shelf}
                        sort={boardSort}
                        filter={boardFilter}
                        view={boardView}
                        toolsRow={
                          <BoardOptionsChip
                            align="left"
                            bare
                            withConversations
                            shelf={shelf}
                            // A shelf switch is a fresh context — carrying
                            // a facet filter across would land on a bare
                            // "nothing here" for no visible reason.
                            onShelf={(s) => {
                              setShelf(s)
                              setBoardFilter('all')
                            }}
                            sort={boardSort}
                            onSort={setBoardSort}
                            filter={boardFilter}
                            onFilter={setBoardFilter}
                            view={boardView}
                            onView={setBoardView}
                          />
                        }
                        drafts={drafts.filter((d) => d.named)}
                        query={query}
                        onOpenThread={(title) => push({ kind: 'thread', title })}
                        onOpenDraft={(id) => push({ kind: 'draft', id })}
                        onCreate={() => createProject()}
                      />
                    ) : (
                      // 5E: no sort chips — the drawer does the wayfinding.
                      // The board titles itself with the shelf toggle chip;
                      // the Conversations page announces itself as bare text.
                      <ProjectGrid
                        island
                        chips={false}
                        menuDots={false}
                        tab={menuView === 'conversations' ? 'conversations' : shelf}
                        sort={boardSort}
                        filter={boardFilter}
                        view={boardView}
                        islandContent={
                          menuView === 'conversations' ? (
                            <motion.span
                              {...develop(0)}
                              className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-[-0.01em] text-ink"
                            >
                              Conversations
                            </motion.span>
                          ) : (
                            <BoardOptionsChip
                              shelf={shelf}
                              // A shelf switch is a fresh context — carrying
                              // a facet filter across would land on a bare
                              // "nothing here" for no visible reason.
                              onShelf={(s) => {
                                setShelf(s)
                                setBoardFilter('all')
                              }}
                              sort={boardSort}
                              onSort={setBoardSort}
                              filter={boardFilter}
                              onFilter={setBoardFilter}
                              view={boardView}
                              onView={setBoardView}
                            />
                          )
                        }
                        drafts={drafts.filter((d) => d.named)}
                        query={query}
                        onOpenThread={(title) => push({ kind: 'thread', title })}
                        onOpenDraft={(id) => push({ kind: 'draft', id })}
                        onCreate={() => createProject()}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                {chrome === 'trio' ? null : ( // 5C's pill lives on the frame (portaled) so it can morph across screens.
                  // 5E's chrome — bare glyphs at the frame's corners: the
                  // drawer handle on the left, and on the right the four
                  // dots into Projects, which become the X back out — one
                  // button, both directions (the board yields its ⋯ for it).
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center justify-between"
                    style={{ top: 'calc(var(--safe-top) + 6px)' }}
                  >
                    <motion.button
                      {...develop(0)}
                      type="button"
                      aria-label="Open menu"
                      onClick={() => setMenuOpen(true)}
                      className="pointer-events-auto flex size-11 items-center justify-center text-ink outline-none transition-transform duration-200 ease-out active:scale-90"
                    >
                      <MenuGlyph />
                    </motion.button>
                    <motion.button
                      {...develop(0)}
                      type="button"
                      aria-label={place === 'projects' ? 'Back to Assistant' : 'Projects'}
                      onClick={() =>
                        place === 'projects'
                          ? selectFromMenu('assistant')
                          : selectFromMenu('active')
                      }
                      className="pointer-events-auto flex size-11 items-center justify-center text-ink outline-none transition-transform duration-200 ease-out active:scale-90"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={place === 'projects' ? 'close' : 'dots'}
                          className="flex items-center justify-center"
                          initial={{ opacity: 0, scale: 0.6, rotate: place === 'projects' ? -45 : 45 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.6, rotate: place === 'projects' ? 45 : -45 }}
                          transition={{ duration: 0.18, ease: EASE }}
                        >
                          {place === 'projects' ? (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                          ) : (
                            <DotGridGlyph />
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  </div>
                )}
              </div>
            ) : (
              <ProjectGrid
                drafts={drafts.filter((d) => d.named)}
                query={query}
                onOpenThread={(title) => push({ kind: 'thread', title })}
                onOpenDraft={(id) => push({ kind: 'draft', id })}
                onCreate={() => createProject()}
              />
            )
          }
          // Speaking from the root is the other door: the words become the
          // project, and the goo drops the user into its conversation.
          onUtterance={(t) => createProject(t)}
        />
      ) : screen.kind === 'draft' ? (
        activeDraft && (
          <VoiceControl
            key={activeDraft.id}
            dockAux={chrome === 'menu' || chrome === 'trio'}
            idleContent={
              <>
                {/* No island until the project has a name to carry — and
                    then one sized to the name, not the threads' fixed pill.
                    The scrim arrives with the conversation: the empty floor
                    has nothing to scroll (the band would just ghost), but
                    once named the thread scrolls under the chrome.
                    Portaled to the frame like every thread's header — inline
                    it would sit inside the slot's gutters and safe-top, and
                    its scrim would float as a visible rectangle. */}
                {viewport &&
                  createPortal(
                    <ConversationHeader
                      // 5C's name lives in the morphing pill (TrioChrome),
                      // not the header's own island — passing a title here
                      // would double it.
                      title={
                        chrome === 'trio'
                          ? undefined
                          : activeDraft.named
                            ? activeDraft.title
                            : undefined
                      }
                      fitIsland
                      scrim={activeDraft.named}
                      onCollapse={pop}
                    />,
                    viewport,
                  )}
                <DraftFloor
                  draft={activeDraft}
                  variant={draftVariant}
                  onSeed={(seed, brandLogo) => nameDraft(activeDraft.id, seed, brandLogo)}
                />
              </>
            }
            onUtterance={(t) => nameDraft(activeDraft.id, t)}
          />
        )
      ) : screen.kind === 'project' ? (
        <VoiceControl
          key="project"
          dockAux={chrome === 'menu' || chrome === 'trio'}
          idleContent={
            <ProjectHome
              title="Sisters Birthday Weekend"
              meta="Jul 25 – 27 · 4 receipts · 1 open task"
              tasks={SISTERS_TASKS}
              onCollapse={pop}
              onOpenThread={() => push({ kind: 'thread', title: 'Sisters Birthday Weekend' })}
              onOpenReceipts={() => tripFileBus.open()}
            />
          }
        />
      ) : (
        <ReservationProvider key="thread">
          <VoiceControl
            followUp="none"
            receipt={null}
            dockAux={chrome === 'menu' || chrome === 'trio'}
            idleContent={
              <TransactionView
                variant="2d"
                title={screen.title}
                onCollapse={pop}
                // The Sisters conversation grew into a project — its island
                // opens the container. Other threads keep the receipts fan.
                onIslandTap={
                  screen.title === 'Sisters Birthday Weekend'
                    ? () => push({ kind: 'project' })
                    : undefined
                }
              />
            }
          />
        </ReservationProvider>
      )}
      </motion.div>

      {/* 5C's pill — pinned to the frame, outliving every screen swap, so
          the segments and the context chip are one continuous object: the
          control the user was just touching *becomes* the conversation's
          name. Hidden past the draft (threads carry their own header). */}
      {viewport &&
        chrome === 'trio' &&
        createPortal(
          <TrioChrome
            mode={
              screen.kind === 'grid'
                ? 'segments'
                : screen.kind === 'draft'
                  ? 'chip'
                  : 'hidden'
            }
            place={place}
            title={
              activeDraft ? (activeDraft.named ? activeDraft.title : 'New project') : undefined
            }
            onSwitch={switchPlace}
          />,
          viewport,
        )}

      {/* The liquid pause between screens — the stack commits mid-veil. */}
      {viewport &&
        createPortal(
          pending && (
            <GooTransition
              onSwap={() => {
                setStack(pending)
                // A project that never got named didn't happen — leaving
                // its conversation discards the draft instead of saving it.
                setDrafts((ds) =>
                  ds.filter(
                    (d) =>
                      d.named ||
                      pending.some((s) => s.kind === 'draft' && s.id === d.id),
                  ),
                )
              }}
              onDone={() => setPending(null)}
            />
          ),
          viewport,
        )}

      {/* 5E's menu floor — portaled straight to the frame, *beneath* the
          shell's screen-card layer (z-0 under z-10): opening the menu
          pulls the whole app right into a card and this is what's under
          it. Root-only: the handle it slides from only exists there. */}
      {viewport &&
        chrome === 'menu' &&
        screen.kind === 'grid' &&
        createPortal(
          <SideMenu
            open={menuOpen}
            onOpenThread={(title) => {
              setMenuOpen(false)
              push({ kind: 'thread', title })
            }}
            onApps={() => {
              setMenuOpen(false)
              setHomeFace('connect')
              switchPlace('assistant')
            }}
          />,
          viewport,
        )}

      {/* The project floor's receipts fan, pulled up over its container. */}
      {screenEl &&
        screen.kind === 'project' &&
        createPortal(
          <AnimatePresence>
            {receiptsOpen && (
              <TripFile
                key="project-receipts"
                tasks={SISTERS_TASKS}
                onViewInThread={() =>
                  push({ kind: 'thread', title: 'Sisters Birthday Weekend' })
                }
                onJumpToThread={() =>
                  push({ kind: 'thread', title: 'Sisters Birthday Weekend' })
                }
                onClose={() => tripFileBus.close()}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}

      {/* 5E's home cycler — a briefing stub is a doorway to one receipt,
          but the receipt is never alone: the same trip-file deck rises,
          already zoomed to the asked-for card, swipe to cycle the rest. */}
      {screenEl &&
        chrome === 'menu' &&
        screen.kind === 'grid' &&
        place === 'assistant' &&
        createPortal(
          <AnimatePresence onExitComplete={() => setHomeReceipt(null)}>
            {receiptsOpen && (
              <TripFile
                key="home-receipts"
                tasks={SISTERS_TASKS}
                initialReceiptId={homeReceipt ?? undefined}
                onViewInThread={() =>
                  push({ kind: 'thread', title: 'Sisters Birthday Weekend' })
                }
                onJumpToThread={() =>
                  push({ kind: 'thread', title: 'Sisters Birthday Weekend' })
                }
                onStartThread={(task) =>
                  push({ kind: 'thread', title: task.seed ?? task.label })
                }
                onClose={() => tripFileBus.close()}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}
    </>
  )
}
