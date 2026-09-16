/**
 * Team page — the drill-in behind 8C's standings cards (a standings row is
 * a team, so its detail is the team). The club's color field up top with
 * its mark, then a sheet in the family grammar: conference + seed
 * overline, the club as a headline, action chips, a status banner (the
 * streak and where the season stands), the standings row's columns as
 * tiles, the next game as a doorway back into the game preview, the last
 * five results, and the season's leaders.
 */
import { motion } from 'framer-motion'
import {
  ALL_GAMES,
  conferenceOf,
  EAST_STANDINGS,
  seriesLine,
  teamInfo,
  WEST_STANDINGS,
  type ScheduleGame,
  type TeamStanding,
} from './sportsData'
import {
  ActionChip,
  ActionChips,
  Banner,
  ClubHero,
  DetailSurface,
  EASE,
  SectionTitle,
  SheetHeader,
  type DetailsOrigin,
} from './sportsDetailsKit'

const ordinal = (n: number) =>
  `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

/** "w3" → "Won 3 straight". */
const streakLine = (strk: string) => {
  const n = parseInt(strk.slice(1), 10)
  return `${strk.startsWith('w') ? 'Won' : 'Lost'} ${n} straight`
}

/** Where the season stands, by seed — the top two are in the conference
    finals the thread follows; the rest went out along the way. */
const seasonStatus = (team: TeamStanding) => {
  const conf = conferenceOf(team.name)
  if (team.rank <= 2) return `${conf}ern Conference Finals \u00B7 ${seriesLine(conf === 'West' ? 'west' : 'east')}`
  if (team.rank <= 4) return 'Eliminated in the conference semifinals'
  if (team.rank <= 8) return 'Eliminated in the first round'
  return 'Eliminated in the play-in'
}

/** The last five, read back from the streak and the last ten — the streak
    is the tail, the rest fill from the ten-game record. Opponents and
    scores are deterministic per club at prototype grade. */
const lastFive = (team: TeamStanding) => {
  const streakWon = team.strk.startsWith('w')
  const streakN = Math.min(5, parseInt(team.strk.slice(1), 10))
  const tenWins = parseInt(team.l10.split('-')[0], 10)
  const results: boolean[] = Array.from({ length: streakN }, () => streakWon)
  let winsLeft = Math.max(0, tenWins - (streakWon ? streakN : 0))
  while (results.length < 5) {
    // Oldest games fill from the front, so the streak stays the tail.
    const win = winsLeft > 0 && (results.length + tenWins) % 2 === 0
    if (win) winsLeft -= 1
    results.unshift(win)
  }
  const pool = [...WEST_STANDINGS, ...EAST_STANDINGS].filter((t) => t.name !== team.name)
  const seed = team.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return results.map((won, i) => {
    const opp = pool[(seed * 3 + i * 7) % pool.length]
    const base = 100 + ((seed + i * 11) % 22)
    const margin = 3 + ((seed + i * 5) % 12)
    return {
      won,
      opp,
      us: won ? base + margin : base,
      them: won ? base : base + margin,
      home: (seed + i) % 2 === 0,
    }
  })
}

export function TeamDetailsView({
  team,
  origin,
  z,
  onClose,
  onOpenGame,
}: {
  team: TeamStanding
  origin: DetailsOrigin
  z?: number
  onClose: () => void
  /** The next-game doorway — the row's element carries the morph origin. */
  onOpenGame: (game: ScheduleGame, el: Element) => void
}) {
  const info = teamInfo(team.name)
  const conf = conferenceOf(team.name)
  const next = ALL_GAMES.find((g) => g.teams.some((t) => t.name === team.name))
  const recent = lastFive(team)
  const tiles: [string, string][] = [
    ['W', String(team.w)],
    ['L', String(team.l)],
    ['PCT', team.pct],
    ['GB', team.gb],
    ['L10', team.l10],
    ['STRK', team.strk.toUpperCase()],
  ]

  return (
    <DetailSurface origin={origin} z={z} hero={<ClubHero name={team.name} logo={team.logo} />}>
      <SheetHeader
        overline={
          <>
            {conf}ern Conference &middot; {ordinal(team.rank)} seed &middot; 2025&ndash;26
          </>
        }
        title={
          <>
            {info.city} {team.name}
          </>
        }
        sub={
          <>
            {team.w}&ndash;{team.l} &middot; {team.pct} &middot; {info.arena}
          </>
        }
        onClose={onClose}
        closeLabel="Close team page"
      />

      <ActionChips>
        <ActionChip
          label="Follow"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 3 2.8 5.9 6.2.8-4.5 4.4 1.1 6.4L12 17.4l-5.6 3.1 1.1-6.4L3 9.7l6.2-.8L12 3Z" />
            </svg>
          }
        />
        <ActionChip
          label="Schedule"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M4 10.5h16" />
            </svg>
          }
        />
        <ActionChip
          label="Roster"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.5a3 3 0 0 1 0 5.6M17 13.6a5 5 0 0 1 3.5 4.9" />
            </svg>
          }
        />
      </ActionChips>

      <Banner
        title={
          <>
            {streakLine(team.strk)} &middot; {team.l10} in the last ten
          </>
        }
        sub={seasonStatus(team)}
      />

      {/* The standings row, as tiles. */}
      <div className="mt-4 grid grid-cols-6 gap-1.5">
        {tiles.map(([label, value], i) => (
          <motion.div
            key={label}
            className="flex flex-col items-center gap-1 rounded-[14px] bg-black/[0.035] py-2.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.04, duration: 0.3, ease: EASE }}
          >
            <span className="text-[15px] leading-none font-extrabold tracking-[-0.02em] tabular-nums text-ink">
              {value}
            </span>
            <span className="text-[9.5px] leading-none font-medium tracking-[0.06em] text-ink-tertiary">
              {label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Next game — a doorway back into the game preview. */}
      <SectionTitle>Next game</SectionTitle>
      {next ? (
        <button
          type="button"
          onClick={(e) => onOpenGame(next, e.currentTarget)}
          aria-label={`View ${next.teams[0].name} vs ${next.teams[1].name}`}
          className="mt-2.5 flex w-full items-center rounded-[18px] border border-black/[0.08] bg-white px-4 py-3 text-left outline-none transition-transform duration-200 ease-out active:scale-[0.985]"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {next.teams.map((t) => (
              <span key={t.name} className="flex items-center gap-2">
                <img src={t.logo} alt="" draggable={false} className="size-5 object-contain" />
                <span className="truncate text-[13.5px] tracking-[-0.01em] text-ink">
                  <span className="font-semibold">{t.name}</span>{' '}
                  <span className="font-medium text-ink-tertiary">{t.record}</span>
                </span>
              </span>
            ))}
          </div>
          <div className="mx-3 w-px self-stretch bg-black/[0.06]" />
          <div className="flex w-[78px] shrink-0 flex-col gap-1.5 text-right text-[12px] leading-none font-medium text-ink">
            <p>{next.day}</p>
            <p>{next.time}</p>
            <p className="text-[10.5px] text-ink-tertiary">{next.tv}</p>
          </div>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="ml-2 shrink-0">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      ) : (
        <p className="mt-2 text-[13px] text-ink-tertiary">Season complete &middot; {seasonStatus(team)}</p>
      )}

      {/* Last five. */}
      <SectionTitle>Last five</SectionTitle>
      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {recent.map((r, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center gap-1.5 rounded-[14px] border border-black/[0.07] py-2.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.04, duration: 0.3, ease: EASE }}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${
                r.won ? 'bg-[#2f9e5b]' : 'bg-[#c9463d]'
              }`}
            >
              {r.won ? 'W' : 'L'}
            </span>
            <img src={r.opp.logo} alt="" draggable={false} className="size-5 object-contain" />
            <span className="text-[10.5px] leading-none font-semibold tabular-nums text-ink">
              {r.us}&ndash;{r.them}
            </span>
            <span className="text-[9px] leading-none text-ink-tertiary">
              {r.home ? 'vs' : '@'} {teamInfo(r.opp.name).abbr}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Leaders. */}
      {info.leaders.length > 0 && (
        <>
          <SectionTitle>Season leaders</SectionTitle>
          <div className="mt-2.5 rounded-[18px] border border-black/[0.08]">
            {info.leaders.map((l, i) => (
              <div
                key={l.stat}
                className={`flex items-center justify-between px-4 py-3 ${
                  i > 0 ? 'border-t border-black/[0.05]' : ''
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-8 text-[11px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
                    {l.stat}
                  </span>
                  <span className="text-[13.5px] font-semibold text-ink">{l.name}</span>
                </span>
                <span className="text-[15px] font-extrabold tabular-nums text-ink">{l.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </DetailSurface>
  )
}
