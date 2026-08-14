/**
 * Sports full results — the surfaces behind the sports thread's "View More"
 * pills, one per inquiry:
 *
 *   schedule  → the upcoming slate (Figma 2302:75680 rows): date-grouped
 *               fixtures, each row the two clubs against a hairline-split
 *               time column, under a schedule-shaped filter rail.
 *   standings → the league table (Figma 2374:72712): both conferences as
 *               flat sections — title, stat header, hairline, ranked rows.
 *
 * Same grammar as FlightListView: the surface clip-morphs open from the
 * pill, league chips re-source in place, content melts into progressive
 * blur at both scroll edges.
 */
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ProgressiveBlur } from '../shared/ProgressiveBlur'
import { useReservationFlow } from './reservationFlow'
import {
  EAST_STANDINGS,
  SCHEDULE,
  SportsChips,
  WEST_STANDINGS,
  type ScheduleGame,
  type SportsProviderId,
  type TeamStanding,
} from './sportsData'

const EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const

/** Where the morph starts: the View More pill's insets from the frame edges. */
export type SportsListOrigin = { top: number; right: number; bottom: number; left: number }

export type SportsListMode = 'schedule' | 'standings'

/** The schedule's lenses — Upcoming rides as the default. */
type ScheduleFilter = 'today' | 'upcoming' | 'live' | 'tv' | 'mine'
const SCHEDULE_FILTERS: { id: ScheduleFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'live', label: 'Live' },
  { id: 'tv', label: 'On TV' },
  { id: 'mine', label: 'My Teams' },
]

function FilterRow({
  active,
  onSelect,
}: {
  active: ScheduleFilter
  onSelect: (f: ScheduleFilter) => void
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
      <div className="flex w-max items-center gap-2">
        <button
          type="button"
          aria-label="Filters"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-200 ease-out active:scale-95"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2.4" />
            <circle cx="8" cy="17" r="2.4" />
          </svg>
        </button>
        {SCHEDULE_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={active === id}
            onClick={() => onSelect(id)}
            className={`flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-medium whitespace-nowrap outline-none transition-[transform,background-color,color] duration-200 ease-out active:scale-[0.97] ${
              active === id ? 'bg-ink text-white' : 'bg-black/[0.05] text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** One fixture — the schedule card's anatomy flattened to a list row: the
    two clubs stacked on the left, the tip-off split off by a hairline. */
function ScheduleRow({ game }: { game: ScheduleGame }) {
  return (
    <div className="flex items-center py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {game.teams.map((t) => (
          <span key={t.name} className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center">
              <img src={t.logo} alt="" draggable={false} className="size-6 object-contain" />
            </span>
            <p className="truncate text-[14px] tracking-[-0.01em] text-[#110707]">
              <span className="font-semibold">{t.name}</span>{' '}
              <span className="font-medium text-[rgba(17,7,7,0.4)]">{t.record}</span>
            </p>
          </span>
        ))}
      </div>
      <div className="mx-4 w-px self-stretch bg-black/[0.06]" />
      <div className="flex w-[86px] shrink-0 flex-col gap-2 text-right text-[12px] leading-none font-medium text-black">
        <p>{game.day}</p>
        <p>{game.time}</p>
      </div>
    </div>
  )
}

/** One conference table — title, stat header, hairline, ranked rows. */
function StandingsSection({ title, teams }: { title: string; teams: TeamStanding[] }) {
  return (
    <div className="flex flex-col">
      <p className="text-[14px] leading-[18px] font-medium text-[#0a0a0a]">{title}</p>
      <div className="mt-4 flex items-center justify-between text-[12px] leading-none font-medium text-black/50">
        <p className="w-[53px]">Team</p>
        <div className="flex w-[186px] items-center justify-between whitespace-nowrap">
          <span>W</span>
          <span>L</span>
          <span>PCT</span>
          <span>GB</span>
          <span>L10</span>
          <span>STRK</span>
        </div>
      </div>
      <div className="mt-2.5 h-px w-full bg-black/[0.06]" />
      <div className="mt-1 flex flex-col">
        {teams.map((team) => (
          <div key={team.name} className="flex h-[45px] items-center justify-between py-[5px]">
            <div className="flex min-w-0 items-center gap-[6.5px]">
              <span className="w-[9px] shrink-0 text-[12px] font-medium text-[#787a7d]">
                {team.rank}
              </span>
              <img
                src={team.logo}
                alt=""
                draggable={false}
                className="size-6 shrink-0 object-contain"
              />
              <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#1e1e1f]">
                {team.name}
              </p>
            </div>
            <div className="flex w-[186px] shrink-0 items-center justify-between text-[12px] leading-none font-medium whitespace-nowrap text-black/60">
              <span>{team.w}</span>
              <span>{team.l}</span>
              <span>{team.pct}</span>
              <span>{team.gb}</span>
              <span>{team.l10}</span>
              <span>{team.strk}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SportsListView({
  mode,
  origin,
  provider,
  onSelectProvider,
  onClose,
}: {
  mode: SportsListMode
  origin: SportsListOrigin
  provider: SportsProviderId
  onSelectProvider: (id: SportsProviderId) => void
  onClose: () => void
}) {
  // While the list is up the orb stays live, but its resting hint stands
  // down — the results are the moment.
  const setHintSuppressed = useReservationFlow()?.setHintSuppressed
  useEffect(() => {
    setHintSuppressed?.(true)
    return () => setHintSuppressed?.(false)
  }, [setHintSuppressed])

  const [filter, setFilter] = useState<ScheduleFilter>('upcoming')

  const originClip = `inset(${origin.top}px ${origin.right}px ${origin.bottom}px ${origin.left}px round 22px)`

  return (
    <motion.div
      className="absolute inset-0 z-[28] flex flex-col overflow-hidden bg-[#fcfcfc]"
      initial={{ clipPath: originClip, opacity: 1 }}
      animate={{ clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }}
      exit={{
        clipPath: originClip,
        opacity: 0,
        transition: {
          clipPath: { duration: 0.4, ease: CLOSE_EASE },
          opacity: { duration: 0.14, delay: 0.26 },
        },
      }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {/* Chrome — back beside the context island, mirroring the thread's
          header grammar. */}
      <div
        className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4"
        style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}
      >
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to thread"
            className="flex size-11 items-center justify-center outline-none transition-transform duration-200 ease-out active:scale-90"
          >
            <img src="/details/chevron-left.svg" alt="" draggable={false} className="size-5" />
          </button>
        </div>
        <div className="flex items-center rounded-[24px] border border-white bg-[rgba(250,250,250,0.7)] px-4 py-[10px] shadow-[0px_2px_40px_0px_rgba(0,0,0,0.1)] backdrop-blur-[12px]">
          <span className="text-[12px] font-medium tracking-[0.12px] text-[#171717]">
            {mode === 'schedule' ? 'Spurs Schedule' : 'NBA Standings'}
          </span>
        </div>
        <span aria-hidden="true" />
      </div>

      {/* Sourcing + (for the schedule) its filter rail. */}
      <div className="shrink-0 px-5 pt-4">
        <SportsChips active={provider} onSelect={onSelectProvider} />
        {mode === 'schedule' && (
          <div className="mt-3">
            <FilterRow active={filter} onSelect={setFilter} />
          </div>
        )}
      </div>

      {/* Results — date-grouped fixtures or the two conference tables. The
          relative wrapper carries a top melt band so rows dissolve leaving
          the viewport instead of clipping at the scroller's edge. */}
      <div className="relative mt-1 flex min-h-0 flex-1 flex-col">
        <ProgressiveBlur
          side="top"
          className="absolute inset-x-0 top-0 z-[4] h-7"
          tint="linear-gradient(to bottom, rgba(252,252,252,0.9) 0%, rgba(252,252,252,0) 70%)"
        />
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-6"
          style={{
            scrollbarWidth: 'none',
            paddingBottom: 'calc(var(--safe-bottom) + 160px)',
          }}
        >
          {mode === 'schedule' ? (
            <div className="flex flex-col gap-2">
              {SCHEDULE.map((group, gi) => (
                <motion.div
                  key={group.date}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.08 + gi * 0.06, ease: EASE }}
                >
                  <p className="pt-3 pb-1 text-[13px] font-medium text-ink-tertiary">
                    {group.date}
                  </p>
                  {group.games.map((game) => (
                    <ScheduleRow key={game.id} game={game} />
                  ))}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-10 pt-2">
              {[
                { title: 'Western Conference', teams: WEST_STANDINGS },
                { title: 'Eastern Conference', teams: EAST_STANDINGS },
              ].map((section, si) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.08 + si * 0.08, ease: EASE }}
                >
                  <StandingsSection title={section.title} teams={section.teams} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scrim behind the voice dock — rows melt into a progressive blur
          before the orb. */}
      <ProgressiveBlur
        className="absolute inset-x-0 bottom-0 z-[4] h-[164px]"
        tint="linear-gradient(to top, rgba(252,252,252,0.7) 0%, rgba(252,252,252,0.25) 45%, rgba(252,252,252,0) 80%)"
      />
    </motion.div>
  )
}
