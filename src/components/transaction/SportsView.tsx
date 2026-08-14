/**
 * Sports list-result prototype (8C): one thread, three inquiries — the
 * suggested object changes shape with the question.
 *
 *   schedule  → the two-team fixture card (Figma 2279:78979) dealt as a
 *               swipeable deck of the upcoming slate: logos and records on
 *               the left, "Tomorrow / 7:30 PM" on the right.
 *   live game → the scoreboard card (Figma 2377:73529): big club logos,
 *               the Live pill over the score, period clock, and the series
 *               line under a perforation rule.
 *   rankings  → the standings row (Figma 2371:73391) dealt as a swipeable
 *               deck, one card per team, ranked 1–10 — the flight-deck
 *               grammar pointed at a table.
 *
 * League chips (NBA / ESPN) attribute whose feed the answer carries, same
 * grammar as the thread's provider chips. Each View More clip-morphs the
 * inquiry's full surface open (SportsListView) — the schedule slate or the
 * league standings.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConversationHeader } from './ConversationHeader'
import { SportsListView, type SportsListMode, type SportsListOrigin } from './SportsListView'
import {
  SCHEDULE,
  SportsChips,
  WEST_STANDINGS as STANDINGS,
  type ScheduleGame,
  type SportsProviderId,
  type TeamStanding,
} from './sportsData'

const EASE = [0.32, 0.72, 0, 1] as const

/** Family shadow — same as the flight ticket's, so the sports objects read
    as the same suggested-result class. */
const CARD_SHADOW = '0px 11px 20px rgba(0,0,0,0.1)'

/** The View More affordance under a result — the same pill the flights and
    places threads carry. The full surface clip-morphs open from its exact
    bounds. */
function ViewMorePill({ onOpen }: { onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mx-auto flex items-center gap-1.5 rounded-full bg-black/[0.05] px-4 py-2.5 text-[12px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
    >
      View More
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
  )
}

const SCHEDULE_H = 90

/** The Spurs' remaining slate — the fixture deck's cards. */
const SPURS_GAMES = SCHEDULE.flatMap((g) => g.games).filter((g) =>
  g.teams.some((t) => t.name === 'Spurs'),
)

/** Fixture card (Figma 2279:78979) — one upcoming game, dealt as a deck. */
function ScheduleCard({ game, muted = false }: { game: ScheduleGame; muted?: boolean }) {
  return (
    <div
      className="flex w-full items-center justify-between rounded-[32px] bg-white p-4"
      style={{
        height: SCHEDULE_H,
        boxShadow: muted
          ? '0px 6px 20px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)'
          : CARD_SHADOW,
      }}
    >
      <div
        className="flex w-full items-center justify-between transition-opacity duration-300"
        style={{ opacity: muted ? 0 : 1 }}
      >
        <div className="flex flex-col gap-3">
          {game.teams.map((t) => (
            <span key={t.name} className="flex items-center gap-[7px]">
              <span className="flex size-[23px] items-center justify-center">
                <img src={t.logo} alt="" draggable={false} className="size-5 object-contain" />
              </span>
              <p className="text-[14px] font-medium tracking-[-0.01em] text-[#110707]">
                {t.name} <span className="text-[rgba(17,7,7,0.4)]">{t.record}</span>
              </p>
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2 pr-1 text-right text-[12px] leading-none font-medium text-black">
          <p>{game.day}</p>
          <p>{game.time}</p>
        </div>
      </div>
    </div>
  )
}

/** One side of the scoreboard — club logo over name over record. */
function ClubColumn({ name, record, logo }: { name: string; record: string; logo: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <img src={logo} alt="" draggable={false} className="size-16 object-contain" />
      <p className="w-full text-[14px] leading-[1.5] font-semibold text-black">{name}</p>
      <p className="w-full text-[12px] leading-none font-medium text-black/40">{record}</p>
    </div>
  )
}

/** Scoreboard card (Figma 2377:73529) — the live-game answer. */
function LiveGameCard() {
  return (
    <div
      className="flex flex-col gap-4 rounded-[32px] bg-white px-4 py-8"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-start gap-5">
        <ClubColumn name="Spurs" record="2-3" logo="/sports/spurs.svg" />
        <div className="flex w-[120px] shrink-0 flex-col items-center gap-2">
          <span className="flex h-6 w-[53px] items-center justify-center rounded-full bg-[#b23030] text-[12px] font-medium tracking-[0.01em] text-white">
            Live
          </span>
          <div className="flex w-full items-center justify-between leading-[1.5] font-medium text-black">
            <p className="text-[32px]">56</p>
            <p className="text-[20px] tracking-[-0.02em]">:</p>
            <p className="text-[32px]">64</p>
          </div>
          <p className="text-[12px] leading-[1.5] font-medium whitespace-nowrap text-black/60">
            3rd 8:39
          </p>
        </div>
        <ClubColumn name="Thunder" record="3-2" logo="/sports/thunder.svg" />
      </div>
      {/* Perforation — the same tear line the flight ticket carries. */}
      <img
        src="/flights/divider.svg"
        alt=""
        draggable={false}
        className="h-px w-full"
        style={{ objectFit: 'fill' }}
      />
      <p className="text-center text-[12px] font-semibold tracking-[-0.02em] text-[#1a1c1e]">
        Conference Finals ·&ensp;Game 5 (OKC leads 3-2)
      </p>
    </div>
  )
}

const STANDING_H = 108

/** Standings card (Figma 2371:73391) — one team's row under the stat
    header. Each deck card carries a single standing so the swipe walks the
    table one rank at a time. */
function StandingCard({ team, muted = false }: { team: TeamStanding; muted?: boolean }) {
  return (
    <div
      className="flex w-full flex-col justify-between rounded-[32px] bg-white px-5 py-4"
      style={{
        height: STANDING_H,
        boxShadow: muted
          ? '0px 6px 20px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)'
          : CARD_SHADOW,
      }}
    >
      <div
        className="flex h-full flex-col justify-between transition-opacity duration-300"
        style={{ opacity: muted ? 0 : 1 }}
      >
        <div className="flex items-center justify-between text-[12px] leading-none font-medium text-black/50">
          <p className="w-[53px]">Team</p>
          <div className="flex w-[168px] items-center justify-between whitespace-nowrap">
            <span>W</span>
            <span>L</span>
            <span>PCT</span>
            <span>GB</span>
            <span>L10</span>
            <span>STRK</span>
          </div>
        </div>
        <div className="h-px w-full bg-black/[0.06]" />
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-[6.5px]">
            <span className="w-[9px] shrink-0 text-[12px] font-medium text-[#787a7d]">
              {team.rank}
            </span>
            <img src={team.logo} alt="" draggable={false} className="size-6 shrink-0 object-contain" />
            <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#1e1e1f]">
              {team.name}
            </p>
          </div>
          <div className="flex w-[160px] shrink-0 items-center justify-between text-[12px] leading-none font-medium whitespace-nowrap text-black/60">
            <span>{team.w}</span>
            <span>{team.l}</span>
            <span>{team.pct}</span>
            <span>{team.gb}</span>
            <span>{team.l10}</span>
            <span>{team.strk}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Downward recession per depth — the deck grammar shared with flights. */
const PEEK = [0, 16, 30]
const DEPTH = PEEK.length - 1

/** The swipeable deck both sports answers deal from — flick to page
    through the cards; tap advances. */
function Deck<T>({
  items,
  height,
  ariaLabel,
  keyOf,
  children,
}: {
  items: T[]
  height: number
  ariaLabel: string
  keyOf: (item: T) => string | number
  children: (item: T, muted: boolean) => React.ReactNode
}) {
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const n = items.length
  const draggingRef = useRef(false)

  const advance = () => setCurrent((c) => (c + 1) % n)
  const retreat = () => setCurrent((c) => (c - 1 + n) % n)

  return (
    <div
      className="relative w-full"
      style={{ height: height + PEEK[Math.min(DEPTH, n - 1)] }}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      {items.map((item, i) => {
        const depth = (i - current + n) % n
        if (depth > DEPTH) return null
        const isFront = depth === 0
        return (
          <motion.div
            key={keyOf(item)}
            className="absolute inset-x-0 top-0"
            style={{ zIndex: n - depth }}
            initial={reduced ? { opacity: 0 } : { y: -40, opacity: 0 }}
            animate={{
              y: reduced ? 0 : PEEK[depth],
              x: 0,
              scale: reduced || isFront ? 1 : 1 - depth * 0.045,
              opacity: 1 - depth * 0.06,
            }}
            transition={
              reduced ? { duration: 0.25 } : { type: 'spring', stiffness: 300, damping: 28 }
            }
            drag={isFront && !reduced ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragStart={() => {
              draggingRef.current = true
            }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40 || info.velocity.x < -380) advance()
              else if (info.offset.x > 40 || info.velocity.x > 380) retreat()
              requestAnimationFrame(() => {
                draggingRef.current = false
              })
            }}
            onTap={() => {
              if (!isFront || draggingRef.current) return
              advance()
            }}
          >
            <div
              className={isFront ? 'cursor-grab active:cursor-grabbing' : undefined}
              style={{
                filter: reduced || isFront ? 'none' : `blur(${Math.min(depth * 1.2, 3)}px)`,
                transition: 'filter 0.35s ease',
                touchAction: 'none',
              }}
            >
              {children(item, !isFront)}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/** The schedule answer: the Spurs' remaining games dealt as a deck. */
function ScheduleStack() {
  return (
    <Deck
      items={SPURS_GAMES}
      height={SCHEDULE_H}
      ariaLabel="Upcoming Spurs games"
      keyOf={(g) => g.id}
    >
      {(game, muted) => <ScheduleCard game={game} muted={muted} />}
    </Deck>
  )
}

/** The rankings answer: standings dealt as a deck, 1–10. */
function StandingsStack() {
  return (
    <Deck
      items={STANDINGS}
      height={STANDING_H}
      ariaLabel="Western Conference standings, ranks 1 through 10"
      keyOf={(t) => t.rank}
    >
      {(team, muted) => <StandingCard team={team} muted={muted} />}
    </Deck>
  )
}

/** One turn of the thread — the user's bubble, then the assistant's answer. */
function Exchange({
  question,
  delay,
  children,
}: {
  question: string
  delay: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: EASE }}
      className="flex flex-col"
    >
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
          {question}
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>
      <div className="mt-2.5 flex flex-col gap-3.5">{children}</div>
    </motion.div>
  )
}

export function SportsView({ title = 'Spurs Season' }: { title?: string }) {
  const [provider, setProvider] = useState<SportsProviderId>('espn')

  // The full results surface — which inquiry's list is open, and the pill
  // bounds it morphs from. Provider state is shared, so toggles carry
  // both ways.
  const [list, setList] = useState<{ mode: SportsListMode; origin: SportsListOrigin } | null>(
    null,
  )

  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setScreenEl(document.getElementById('app-screen'))
  }, [])

  // The list surface clip-morphs open from the tapped pill's exact bounds,
  // measured against the device frame.
  const openList = (mode: SportsListMode) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!screenEl) return
    const v = screenEl.getBoundingClientRect()
    const b = e.currentTarget.getBoundingClientRect()
    setList({
      mode,
      origin: {
        top: b.top - v.top,
        left: b.left - v.left,
        right: v.right - b.right,
        bottom: v.bottom - b.bottom,
      },
    })
  }

  return (
    <div
      className="-mx-4 -mb-[190px] flex min-h-0 flex-col gap-7 self-stretch justify-start overflow-x-hidden overflow-y-auto px-4 pt-[84px] pb-[220px]"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Schedule inquiry → the fixture card. */}
      <Exchange question="When do the Spurs play next?" delay={0}>
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">The Spurs play the Thunder tomorrow at 7:30 PM.</span>{' '}
          You can view more games, or I can help you set a reminder before tipoff.
        </p>
        <SportsChips active={provider} onSelect={setProvider} />
        <div className="mt-1">
          <ScheduleStack />
        </div>
        <ViewMorePill onOpen={openList('schedule')} />
      </Exchange>

      {/* Live-game inquiry → the scoreboard. */}
      <Exchange question="How's the Spurs game going?" delay={0.12}>
        <p className="text-[14px] leading-relaxed text-ink">
          It&rsquo;s close — the Spurs trail the Thunder{' '}
          <span className="font-semibold">56–64</span> with 8:39 left in the third. I can flag
          you if it comes down to the final minutes.
        </p>
        <SportsChips active={provider} onSelect={setProvider} />
        <div className="mt-1">
          <LiveGameCard />
        </div>
      </Exchange>

      {/* Rankings inquiry → the standings deck, 1–10. */}
      <Exchange question="Where are the Spurs in the standings?" delay={0.24}>
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">The Spurs hold the top seed in the West at 60–22.</span>{' '}
          Swipe through the top ten below.
        </p>
        <SportsChips active={provider} onSelect={setProvider} />
        <div className="mt-1">
          <StandingsStack />
        </div>
        <ViewMorePill onOpen={openList('standings')} />
      </Exchange>

      {screenEl && createPortal(<ConversationHeader title={title} />, screenEl)}

      {/* Full results — under the dock's orb, so voice stays live over it. */}
      {screenEl &&
        createPortal(
          <AnimatePresence>
            {list && (
              <SportsListView
                key={`sports-list-${list.mode}`}
                mode={list.mode}
                origin={list.origin}
                provider={provider}
                onSelectProvider={setProvider}
                onClose={() => setList(null)}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}
    </div>
  )
}
