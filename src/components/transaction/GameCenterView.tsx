/**
 * Game center — the drill-in behind 8C's scoreboard cards, for a game in
 * progress or gone final (the same game object as GamePreviewView, two
 * states later: same split-club hero, same overline). The sheet's
 * headline is the scoreboard itself — the card's anatomy carried up so the
 * morph reads continuous — then a punch-out to watch on the feed the
 * answer carries, a status banner (the run, the timeout; or the result
 * and what it means for the series), and three lenses:
 *
 *   Summary   → the score by quarter (the live quarter marked), each
 *               club's leaders side by side, and — once final — the recap.
 *   Box score → both starting fives: minutes, points, rebounds, assists.
 *   Plays     → the feed, most recent first, the live play pulsing.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { GameCenter, Leader, Play, SideLine } from './gameCenterData'
import {
  gameDate,
  gameNumberOf,
  seriesKeyOf,
  seriesLine,
  seriesWins,
  type SportsProviderId,
} from './sportsData'
import {
  ActionChip,
  ActionChips,
  Banner,
  ClubSplitHero,
  DetailSurface,
  EASE,
  LeagueMark,
  PunchOutChip,
  SectionTitle,
  Segmented,
  type DetailsOrigin,
} from './sportsDetailsKit'

/** "Sat., June 14th" → "SAT, JUNE 14" (the overline's registry style). */
const overlineDate = (date: string) =>
  date.replace(/(st|nd|rd|th)$/, '').replace(/\./g, '').toUpperCase()

const PROVIDER_NAMES: Record<SportsProviderId, string> = { nba: 'NBA', espn: 'ESPN' }

type Lens = 'summary' | 'box' | 'plays'
const LENSES: { id: Lens; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'box', label: 'Box score' },
  { id: 'plays', label: 'Plays' },
]

/** The live pill — red when the clock's running, ink once it isn't. */
function StatusPill({ status }: { status: GameCenter['status'] }) {
  return status === 'live' ? (
    <span className="flex h-6 items-center gap-1.5 rounded-full bg-[#b23030] px-2.5 text-[12px] font-medium tracking-[0.01em] text-white">
      <motion.span
        className="size-1.5 rounded-full bg-white"
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      Live
    </span>
  ) : (
    <span className="flex h-6 items-center rounded-full bg-ink px-2.5 text-[12px] font-medium tracking-[0.01em] text-white">
      Final
    </span>
  )
}

/** The score by quarter — the live quarter dotted, the leader's total bold. */
function QuarterTable({ center }: { center: GameCenter }) {
  const [home, away] = center.game.teams
  const liveQ =
    center.status === 'live' ? center.home.quarters.findLastIndex((q) => q !== null) : -1
  const rows: { name: string; logo: string; line: SideLine }[] = [
    { name: home.name, logo: home.logo, line: center.home },
    { name: away.name, logo: away.logo, line: center.away },
  ]
  const leader = Math.max(center.home.score, center.away.score)
  return (
    <div className="mt-2.5 overflow-hidden rounded-[18px] border border-black/[0.08]">
      <div className="grid grid-cols-[1fr_repeat(5,40px)] items-center px-4 py-2 text-[11px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
        <span />
        {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
          <span key={q} className="flex items-center justify-center gap-1 text-center">
            {i === liveQ && <span className="size-1.5 rounded-full bg-[#b23030]" />}
            {q}
          </span>
        ))}
        <span className="text-center text-ink">T</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          className="grid grid-cols-[1fr_repeat(5,40px)] items-center border-t border-black/[0.06] px-4 py-2.5 text-[13.5px] tabular-nums"
        >
          <span className="flex items-center gap-2">
            <img src={r.logo} alt="" draggable={false} className="size-5 object-contain" />
            <span className="font-semibold text-ink">{r.name}</span>
          </span>
          {r.line.quarters.map((q, i) => (
            <span
              key={i}
              className={`text-center ${
                q === null ? 'text-ink-tertiary/60' : i === liveQ ? 'font-semibold text-ink' : 'text-ink/70'
              }`}
            >
              {q ?? '\u2013'}
            </span>
          ))}
          <span
            className={`text-center ${
              r.line.score === leader ? 'font-extrabold text-ink' : 'font-semibold text-ink/60'
            }`}
          >
            {r.line.score}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Each club's leaders, the stat labeling the center column. */
function LeadersTable({ center }: { center: GameCenter }) {
  const [home, away] = center.game.teams
  const stats: Leader['stat'][] = ['PTS', 'REB', 'AST']
  const cell = (l: Leader | undefined, align: 'left' | 'right') =>
    l ? (
      <span className={`flex min-w-0 flex-col ${align === 'right' ? 'items-end text-right' : ''}`}>
        <span className="flex items-baseline gap-1.5">
          {align === 'right' && <span className="text-[16px] font-extrabold tabular-nums text-ink">{l.value}</span>}
          <span className="truncate text-[12.5px] font-semibold text-ink">{l.name}</span>
          {align === 'left' && <span className="text-[16px] font-extrabold tabular-nums text-ink">{l.value}</span>}
        </span>
        <span className="text-[10.5px] text-ink-tertiary">{l.detail}</span>
      </span>
    ) : (
      <span />
    )
  return (
    <div className="mt-2.5 rounded-[18px] border border-black/[0.08]">
      <div className="grid grid-cols-[1fr_52px_1fr] items-center px-4 pt-3 pb-2">
        <span className="flex items-center gap-2">
          <img src={home.logo} alt="" draggable={false} className="size-5 object-contain" />
          <span className="text-[12.5px] font-semibold text-ink">{home.name}</span>
        </span>
        <span />
        <span className="flex items-center justify-end gap-2">
          <span className="text-[12.5px] font-semibold text-ink">{away.name}</span>
          <img src={away.logo} alt="" draggable={false} className="size-5 object-contain" />
        </span>
      </div>
      {stats.map((stat, i) => (
        <div
          key={stat}
          className={`grid grid-cols-[1fr_52px_1fr] items-center px-4 py-2.5 ${
            i === 0 ? 'border-t border-black/[0.08]' : 'border-t border-black/[0.05]'
          }`}
        >
          {cell(center.home.leaders.find((l) => l.stat === stat), 'left')}
          <span className="text-center text-[11px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            {stat}
          </span>
          {cell(center.away.leaders.find((l) => l.stat === stat), 'right')}
        </div>
      ))}
    </div>
  )
}

/** One club's starting five. */
function BoxTable({ name, logo, line }: { name: string; logo: string; line: SideLine }) {
  return (
    <div className="mt-2.5 overflow-hidden rounded-[18px] border border-black/[0.08]">
      <div className="grid grid-cols-[1fr_44px_36px_36px_36px] items-center px-4 py-2.5">
        <span className="flex items-center gap-2">
          <img src={logo} alt="" draggable={false} className="size-5 object-contain" />
          <span className="text-[12.5px] font-semibold text-ink">{name} starters</span>
        </span>
        {['MIN', 'PTS', 'REB', 'AST'].map((h) => (
          <span key={h} className="text-right text-[10.5px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            {h}
          </span>
        ))}
      </div>
      {line.box.map((p) => (
        <div
          key={p.name}
          className="grid grid-cols-[1fr_44px_36px_36px_36px] items-center border-t border-black/[0.05] px-4 py-2 text-[12.5px] tabular-nums"
        >
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate font-semibold text-ink">{p.name}</span>
            <span className="text-[10.5px] text-ink-tertiary">{p.pos}</span>
          </span>
          <span className="text-right text-ink/60">{p.min}</span>
          <span className="text-right font-semibold text-ink">{p.pts}</span>
          <span className="text-right text-ink/70">{p.reb}</span>
          <span className="text-right text-ink/70">{p.ast}</span>
        </div>
      ))}
    </div>
  )
}

/** The feed, most recent first — the live play pulses. */
function PlayFeed({ center }: { center: GameCenter }) {
  const [home, away] = center.game.teams
  const logoFor = (p: Play) => (p.side === 'home' ? home.logo : p.side === 'away' ? away.logo : null)
  return (
    <div className="mt-2.5 flex flex-col">
      <p className="text-[11px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
        {center.status === 'live' ? `${center.period} quarter \u00B7 in progress` : '4th quarter \u00B7 final minutes'}
      </p>
      <div className="mt-1.5 flex flex-col">
        {center.plays.map((p, i) => {
          const logo = logoFor(p)
          const isLive = center.status === 'live' && i === 0
          return (
            <motion.div
              key={`${p.clock}-${i}`}
              className="grid grid-cols-[42px_28px_1fr_auto] items-center gap-2 border-b border-black/[0.05] py-2.5 last:border-b-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.3, ease: EASE }}
            >
              <span className="flex items-center gap-1.5 text-[12px] font-medium tabular-nums text-ink/60">
                {isLive && (
                  <motion.span
                    className="size-1.5 shrink-0 rounded-full bg-[#b23030]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                {p.clock}
              </span>
              <span className="flex items-center justify-center">
                {logo ? (
                  <img src={logo} alt="" draggable={false} className="size-5 object-contain" />
                ) : (
                  <span className="size-1.5 rounded-full bg-black/20" />
                )}
              </span>
              <span className={`text-[13px] leading-snug ${p.side ? 'text-ink' : 'text-ink-tertiary'}`}>
                {p.text}
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-ink/70">{p.score}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export function GameCenterView({
  center,
  provider,
  origin,
  z,
  onClose,
}: {
  center: GameCenter
  /** Whose feed the answer carries — the thread's league chips. */
  provider: SportsProviderId
  origin: DetailsOrigin
  z?: number
  onClose: () => void
}) {
  const [lens, setLens] = useState<Lens>('summary')
  const { game, status } = center
  const [home, away] = game.teams
  const key = seriesKeyOf(game.id)
  const winner =
    status === 'final' ? (center.home.score > center.away.score ? home.name : away.name) : undefined
  const homeLeads = center.home.score >= center.away.score
  /** The series record, with this game folded in once it's final. */
  const record = (name: string, other: string) =>
    `(${seriesWins(key, name, winner)}-${seriesWins(key, other, winner)})`

  return (
    <DetailSurface origin={origin} z={z} hero={<ClubSplitHero home={home} away={away} />}>
      {/* Header — overline + close; the scoreboard is the headline. */}
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[11px] font-semibold tracking-[0.08em] text-ink-tertiary uppercase">
          {PROVIDER_NAMES[provider]} &middot; Game {gameNumberOf(game.id)} &middot;{' '}
          {overlineDate(gameDate(game))}
        </p>
        <button
          type="button"
          aria-label="Close game center"
          onClick={onClose}
          className="-mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-200 ease-out active:scale-90"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3 13 13M13 3 3 13" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* The scoreboard — the card's anatomy, carried up as the headline. */}
      <div className="mt-1 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <img src={home.logo} alt="" draggable={false} className="size-11 object-contain" />
          <p className="w-full truncate text-[13px] leading-tight font-semibold text-ink">{home.name}</p>
          <p className="text-[11px] leading-none font-medium text-ink-tertiary">
            {record(home.name, away.name)}
          </p>
        </div>
        <div className="flex w-[150px] shrink-0 flex-col items-center gap-1.5 pt-1">
          <StatusPill status={status} />
          <div className="flex w-full items-center justify-between leading-none font-extrabold tracking-[-0.03em] text-ink">
            <p className={`text-[36px] tabular-nums ${homeLeads ? '' : 'text-ink/45'}`}>{center.home.score}</p>
            <p className="text-[20px] text-ink/30">:</p>
            <p className={`text-[36px] tabular-nums ${homeLeads ? 'text-ink/45' : ''}`}>{center.away.score}</p>
          </div>
          <p className="text-[12px] leading-none font-medium whitespace-nowrap text-ink/60">
            {status === 'live' ? `${center.period} \u00B7 ${center.clock}` : seriesLine(key, winner)}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <img src={away.logo} alt="" draggable={false} className="size-11 object-contain" />
          <p className="w-full truncate text-[13px] leading-tight font-semibold text-ink">{away.name}</p>
          <p className="text-[11px] leading-none font-medium text-ink-tertiary">
            {record(away.name, home.name)}
          </p>
        </div>
      </div>

      <ActionChips>
        <PunchOutChip
          mark={<LeagueMark id={provider} size={24} />}
          label={status === 'live' ? `Watch on ${PROVIDER_NAMES[provider]}` : 'Watch recap'}
        />
        <ActionChip
          label={status === 'live' ? 'Live Activity' : 'Highlights'}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {status === 'live' ? (
                <path d="M13 2 5 13.5h6L11 22l8-11.5h-6L13 2Z" />
              ) : (
                <path d="m5 4 14 8-14 8V4Z" />
              )}
            </svg>
          }
        />
        <ActionChip
          label={status === 'live' ? 'Flag final minutes' : 'Share'}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {status === 'live' ? (
                <path d="M5 21V4h12l-1.5 4L17 12H5" />
              ) : (
                <path d="M12 15V4M8 7.5 12 3.5l4 4M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" />
              )}
            </svg>
          }
        />
      </ActionChips>

      <Banner title={center.banner.title} sub={center.banner.sub} />

      <Segmented options={LENSES} value={lens} onChange={setLens} label="Game center lenses" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={lens}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          {lens === 'summary' && (
            <>
              {center.recap && (
                <>
                  <SectionTitle>Recap</SectionTitle>
                  <p className="mt-2 text-[13.5px] leading-[21px] text-ink">{center.recap}</p>
                </>
              )}
              <SectionTitle>Score by quarter</SectionTitle>
              <QuarterTable center={center} />
              <SectionTitle>Leaders</SectionTitle>
              <LeadersTable center={center} />
            </>
          )}
          {lens === 'box' && (
            <>
              <SectionTitle>Box score</SectionTitle>
              <BoxTable name={home.name} logo={home.logo} line={center.home} />
              <BoxTable name={away.name} logo={away.logo} line={center.away} />
              <p className="mt-3 text-center text-[10.5px] text-ink-tertiary">
                Starters shown &middot; full box on {PROVIDER_NAMES[provider]}
              </p>
            </>
          )}
          {lens === 'plays' && (
            <>
              <SectionTitle>Plays</SectionTitle>
              <PlayFeed center={center} />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </DetailSurface>
  )
}
