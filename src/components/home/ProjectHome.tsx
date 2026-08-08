/**
 * ProjectHome — the project container, the middle floor of the altitude
 * model (home → project → thread). A conversation that grows into a project
 * gets this room: a card grid that reads as the project's visual log —
 * what's done, what's open, and what the assistant suggests next.
 *
 * Card taxonomy:
 *   Task card    — date stamp, progress counter, checklist (done rows flip
 *                  to their receipts, open rows descend into the thread).
 *   Hero cards   — receipts with imagery worth leading with (the hotel,
 *                  the dinner); tap opens the receipts fan.
 *   Receipt card — text-first artifacts (the flight) in the same material.
 *   Thread card  — the conversation doorway; the chevron climbs back out
 *                  of the thread to this floor.
 *   Suggestion   — the assistant's nudge, visually quieter (dashed, no
 *                  fill) so done / open / suggested read at a glance.
 */
import { motion } from 'framer-motion'
import type { TripTask } from '../transaction/TripFile'

const EASE = [0.32, 0.72, 0, 1] as const

/** Shared entrance — cards develop in staggered, same beat as Files rows. */
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

function ProviderDisc({ icon }: { icon: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.14)] ring-1 ring-white">
      <img src={icon} alt="" draggable={false} className="size-6 object-contain" />
    </span>
  )
}

function CheckCircle({ done }: { done: boolean }) {
  return done ? (
    <span className="flex size-[19px] shrink-0 items-center justify-center rounded-full bg-ink">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 12.5 5 5L19 7" />
      </svg>
    </span>
  ) : (
    <span className="size-[19px] shrink-0 rounded-full border-[1.5px] border-ink/25" />
  )
}

/** The checklist card — the project's ledger at a glance (reference: the
    task deck card). Done rows open the receipts fan; open rows descend
    into the thread where the loose end lives. */
function TaskCard({
  date,
  tasks,
  onOpenReceipts,
  onOpenThread,
}: {
  date: string
  tasks: TripTask[]
  onOpenReceipts?: () => void
  onOpenThread?: () => void
}) {
  const done = tasks.filter((t) => t.state === 'done').length
  return (
    <div className={`${CARD} flex flex-col gap-3 p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-tertiary">{date}</p>
        <span className="flex h-[22px] items-center rounded-full bg-ink px-2.5 text-[11px] font-semibold text-white">
          {done}/{tasks.length}
        </span>
      </div>
      <div className="flex flex-col">
        {tasks.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={t.state === 'done' ? onOpenReceipts : onOpenThread}
            className="-mx-1.5 flex items-center gap-2.5 rounded-[12px] px-1.5 py-[7px] text-left outline-none transition-colors duration-150 active:bg-black/[0.04]"
          >
            <CheckCircle done={t.state === 'done'} />
            <span
              className={`min-w-0 flex-1 text-[12.5px] leading-[16px] ${
                t.state === 'done' ? 'text-ink-tertiary line-through decoration-ink/25' : 'text-ink'
              }`}
            >
              {t.label}
            </span>
            {t.provider && <ProviderDisc icon={t.provider.icon} />}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Receipt with imagery worth leading with — label over a scrimmed photo. */
function HeroCard({
  image,
  label,
  meta,
  provider,
  height,
  onOpen,
}: {
  image: string
  label: string
  meta: string
  provider: string
  height: number
  onOpen?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-full overflow-hidden rounded-[24px] text-left shadow-[0_2px_20px_rgba(0,0,0,0.08)] outline-none transition-transform duration-200 ease-out active:scale-[0.98]"
      style={{ height }}
    >
      <img
        src={image}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(10,8,12,0.62) 0%, rgba(10,8,12,0) 55%)',
        }}
      />
      <span className="absolute top-3 right-3">
        <ProviderDisc icon={provider} />
      </span>
      <span className="absolute inset-x-3.5 bottom-3 flex flex-col gap-0.5">
        <span className="text-[13.5px] leading-[17px] font-semibold text-white">{label}</span>
        <span className="text-[11px] text-white/75">{meta}</span>
      </span>
    </button>
  )
}

/** Text-first receipt — same room, no photo. */
function ReceiptCard({
  title,
  meta,
  provider,
  onOpen,
}: {
  title: string
  meta: string
  provider: string
  onOpen?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${CARD} flex flex-col gap-2.5 p-4 text-left outline-none transition-transform duration-200 ease-out active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</span>
        <ProviderDisc icon={provider} />
      </div>
      <span className="text-[11px] text-ink-secondary">{meta}</span>
    </button>
  )
}

/** The conversation doorway — the thread this project grew out of. */
function ThreadCard({ excerpt, onOpen }: { excerpt: string; onOpen?: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${CARD} flex flex-col gap-2.5 p-4 text-left outline-none transition-transform duration-200 ease-out active:scale-[0.98]`}
    >
      <span className="flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-ink/25">
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
      <span className="text-[12.5px] leading-[17px] text-ink">{excerpt}</span>
      <span className="text-[11px] font-medium text-ink-tertiary">Open conversation</span>
    </button>
  )
}

/** The assistant's nudge — dashed and unfilled so it reads as "not yet". */
function SuggestionCard({
  label,
  reason,
  onStart,
}: {
  label: string
  reason: string
  onStart?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="flex w-full flex-col gap-2 rounded-[24px] border-[1.5px] border-dashed border-ink/20 p-4 text-left outline-none transition-colors duration-200 active:bg-white/50"
    >
      <span className="flex size-[22px] items-center justify-center">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.5c.5 3.9 2.4 6.6 8.5 8.5-6.1 1.9-8 4.6-8.5 8.5-.5-3.9-2.4-6.6-8.5-8.5 6.1-1.9 8-4.6 8.5-8.5Z"
            stroke="rgba(23,23,23,0.55)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[13px] leading-[17px] font-medium text-ink">{label}</span>
      <span className="text-[11px] leading-[15px] text-ink-secondary">{reason}</span>
    </button>
  )
}

export function ProjectHome({
  title,
  meta,
  tasks,
  onCollapse,
  onOpenThread,
  onOpenReceipts,
}: {
  title: string
  meta: string
  tasks: TripTask[]
  /** Chevron — plain back: return to wherever this floor was opened from. */
  onCollapse?: () => void
  /** Descend into the project's conversation. */
  onOpenThread?: () => void
  /** Quick-look: fan the project's receipts out (the trip file). */
  onOpenReceipts?: () => void
}) {
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ scrollbarWidth: 'none', paddingTop: 'calc(var(--safe-top) + 6px)' }}
    >
      {/* Chrome — collapse climbs to home; menu is symmetry for now. The
          host (VoiceControl) already provides the frame's 16px gutter, so
          no horizontal padding of our own anywhere on this floor. */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Back to home"
          onClick={onCollapse}
          className="flex size-11 items-center justify-center outline-none transition-transform duration-200 ease-out active:scale-90"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M6 7.5 10 3.5 14 7.5M6 12.5 10 16.5 14 12.5"
              stroke="#171717"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
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
      </div>

      {/* Title lockup — the project's name owns the room. */}
      <motion.div {...develop(0)} className="mt-2 flex flex-col gap-1 px-1">
        <h1 className="text-[24px] leading-[30px] font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        <p className="text-[12.5px] text-ink-secondary">{meta}</p>
      </motion.div>

      {/* The log — two loose columns, clearance for the dock below. */}
      <div className="mt-5 flex gap-2.5 pb-[200px]">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <motion.div {...develop(1)}>
            <TaskCard
              date="Jul 25 – 27"
              tasks={tasks}
              onOpenReceipts={onOpenReceipts}
              onOpenThread={onOpenThread}
            />
          </motion.div>
          <motion.div {...develop(3)}>
            <HeroCard
              image="/receipts/photos/hotel-pool.jpg"
              label="Hotel Healdsburg"
              meta="Jul 25 – 27 · Confirmed"
              provider="/providers/expedia.png"
              height={150}
              onOpen={onOpenReceipts}
            />
          </motion.div>
          <motion.div {...develop(5)}>
            <ThreadCard
              excerpt="Booked! Valette at 7:30 for 2 — the confirmation's in your file."
              onOpen={onOpenThread}
            />
          </motion.div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <motion.div {...develop(2)}>
            <HeroCard
              image="/places/valette.jpg"
              label="Dinner at Valette"
              meta="Sat · 7:30 PM · party of 2"
              provider="/providers/opentable.svg"
              height={172}
              onOpen={onOpenReceipts}
            />
          </motion.div>
          <motion.div {...develop(4)}>
            <ReceiptCard
              title="SFO → EWR"
              meta="United · UA 1128 · Jul 25"
              provider="/providers/united.png"
              onOpen={onOpenReceipts}
            />
          </motion.div>
          <motion.div {...develop(6)}>
            <SuggestionCard
              label="Order a birthday cake"
              reason="Suggested — bakeries near the hotel deliver Saturday morning."
              onStart={onOpenThread}
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
