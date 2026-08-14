/**
 * Sports list-result prototype (8C): one thread, three inquiries — the
 * suggested object changes shape with the question.
 *
 *   schedule  → the two-team fixture card (Figma 2279:78979): logos and
 *               records on the left, "Tomorrow / 7:30 PM" on the right.
 *   live game → the scoreboard card (Figma 2377:73529): big club logos,
 *               the Live pill over the score, period clock, and the series
 *               line under a perforation rule.
 *   rankings  → the standings row (Figma 2371:73391) dealt as a swipeable
 *               deck, one card per team, ranked 1–10 — the flight-deck
 *               grammar pointed at a table.
 *
 * League chips (NBA / ESPN) attribute whose feed the answer carries, same
 * grammar as the thread's provider chips.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConversationHeader } from './ConversationHeader'

const EASE = [0.32, 0.72, 0, 1] as const

type SportsProviderId = 'nba' | 'espn'

type TeamStanding = {
  rank: number
  name: string
  logo: string
  w: number
  l: number
  pct: string
  gb: string
  l10: string
  strk: string
}

/** Western Conference top ten — Spurs lead, mirroring the design's row. */
const STANDINGS: TeamStanding[] = [
  { rank: 1, name: 'Spurs', logo: '/sports/teams/sa.png', w: 60, l: 22, pct: '.732', gb: '-', l10: '8-2', strk: 'w3' },
  { rank: 2, name: 'Thunder', logo: '/sports/teams/okc.png', w: 59, l: 23, pct: '.720', gb: '1.0', l10: '8-2', strk: 'w5' },
  { rank: 3, name: 'Nuggets', logo: '/sports/teams/den.png', w: 55, l: 27, pct: '.671', gb: '5.0', l10: '7-3', strk: 'w2' },
  { rank: 4, name: 'Wolves', logo: '/sports/teams/min.png', w: 52, l: 30, pct: '.634', gb: '8.0', l10: '6-4', strk: 'l1' },
  { rank: 5, name: 'Mavericks', logo: '/sports/teams/dal.png', w: 50, l: 32, pct: '.610', gb: '10.0', l10: '7-3', strk: 'w1' },
  { rank: 6, name: 'Lakers', logo: '/sports/teams/lal.png', w: 47, l: 35, pct: '.573', gb: '13.0', l10: '5-5', strk: 'l2' },
  { rank: 7, name: 'Clippers', logo: '/sports/teams/lac.png', w: 45, l: 37, pct: '.549', gb: '15.0', l10: '4-6', strk: 'w1' },
  { rank: 8, name: 'Suns', logo: '/sports/teams/phx.png', w: 44, l: 38, pct: '.537', gb: '16.0', l10: '6-4', strk: 'l1' },
  { rank: 9, name: 'Grizzlies', logo: '/sports/teams/mem.png', w: 41, l: 41, pct: '.500', gb: '19.0', l10: '5-5', strk: 'w2' },
  { rank: 10, name: 'Kings', logo: '/sports/teams/sac.png', w: 39, l: 43, pct: '.476', gb: '21.0', l10: '3-7', strk: 'l3' },
]

/** Family shadow — same as the flight ticket's, so the sports objects read
    as the same suggested-result class. */
const CARD_SHADOW = '0px 11px 20px rgba(0,0,0,0.1)'

/** League attribution chips — ProviderChips' grammar with sports sources.
    ESPN's mark is its wordmark knocked out white on the brand's red disc;
    the NBA's is the league lockup on white. */
function SportsChips({
  active,
  onSelect,
}: {
  active: SportsProviderId
  onSelect: (id: SportsProviderId) => void
}) {
  const providers: { id: SportsProviderId; name: string }[] = [
    { id: 'nba', name: 'NBA' },
    { id: 'espn', name: 'ESPN' },
  ]
  return (
    <div className="flex items-center gap-2">
      {providers.map((p) => {
        const isActive = p.id === active
        return (
          <motion.button
            key={p.id}
            type="button"
            layout
            onClick={() => onSelect(p.id)}
            aria-pressed={isActive}
            aria-label={p.name}
            className="flex items-center rounded-full border border-white/20 p-1 outline-none"
            style={{ background: 'rgba(0,0,0,0.04)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {p.id === 'espn' ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-[#cc0000]">
                <img
                  src="/sports/espn.svg"
                  alt=""
                  draggable={false}
                  className="w-[19px]"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </span>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-white">
                <img
                  src="/sports/nba.png"
                  alt=""
                  draggable={false}
                  className="h-[22px] w-[22px] object-contain"
                />
              </span>
            )}
            {isActive && (
              <motion.span
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-1 flex h-8 items-center rounded-full bg-white/80 px-3 text-[12px] font-medium tracking-[0.2px] whitespace-nowrap text-ink"
              >
                {p.name}
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

/** The View More affordance under a result — the same pill the flights and
    places threads carry. Decorative here: the full surfaces aren't part of
    this prototype. */
function ViewMorePill() {
  return (
    <button
      type="button"
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

/** Fixture card (Figma 2279:78979) — the schedule answer. */
function ScheduleCard() {
  const teams = [
    { name: 'Spurs', record: '(2-3)', logo: '/sports/spurs.svg' },
    { name: 'Thunder', record: '(3-2)', logo: '/sports/thunder.svg' },
  ]
  return (
    <div
      className="flex items-center justify-between rounded-[32px] bg-white p-4"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="flex flex-col gap-3">
        {teams.map((t) => (
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
        <p>Tomorrow</p>
        <p>7:30 PM</p>
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

/** The rankings answer: standings dealt as a swipeable deck, 1–10. Flick
    to page through the ranks; tap advances. */
function StandingsStack() {
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const n = STANDINGS.length
  const draggingRef = useRef(false)

  const advance = () => setCurrent((c) => (c + 1) % n)
  const retreat = () => setCurrent((c) => (c - 1 + n) % n)

  return (
    <div
      className="relative w-full"
      style={{ height: STANDING_H + PEEK[Math.min(DEPTH, n - 1)] }}
      role="group"
      aria-roledescription="carousel"
      aria-label="Western Conference standings, ranks 1 through 10"
    >
      {STANDINGS.map((team, i) => {
        const depth = (i - current + n) % n
        if (depth > DEPTH) return null
        const isFront = depth === 0
        return (
          <motion.div
            key={team.rank}
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
              <StandingCard team={team} muted={!isFront} />
            </div>
          </motion.div>
        )
      })}
    </div>
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

  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setScreenEl(document.getElementById('app-screen'))
  }, [])

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
          <ScheduleCard />
        </div>
        <ViewMorePill />
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
        <ViewMorePill />
      </Exchange>

      {screenEl && createPortal(<ConversationHeader title={title} />, screenEl)}
    </div>
  )
}
