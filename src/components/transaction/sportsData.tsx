/**
 * Shared sports data + the league attribution chips, used by the thread
 * (SportsView) and its full results surfaces (SportsListView).
 */
import { motion } from 'framer-motion'

export type SportsProviderId = 'nba' | 'espn'

export type TeamStanding = {
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
export const WEST_STANDINGS: TeamStanding[] = [
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

/** Eastern Conference top ten — the standings surface shows both tables. */
export const EAST_STANDINGS: TeamStanding[] = [
  { rank: 1, name: 'Celtics', logo: '/sports/teams/bos.png', w: 61, l: 21, pct: '.744', gb: '-', l10: '9-1', strk: 'w6' },
  { rank: 2, name: 'Cavaliers', logo: '/sports/teams/cle.png', w: 58, l: 24, pct: '.707', gb: '3.0', l10: '7-3', strk: 'w2' },
  { rank: 3, name: 'Knicks', logo: '/sports/teams/ny.png', w: 54, l: 28, pct: '.659', gb: '7.0', l10: '6-4', strk: 'l1' },
  { rank: 4, name: 'Bucks', logo: '/sports/teams/mil.png', w: 51, l: 31, pct: '.622', gb: '10.0', l10: '5-5', strk: 'w1' },
  { rank: 5, name: 'Pacers', logo: '/sports/teams/ind.png', w: 49, l: 33, pct: '.598', gb: '12.0', l10: '7-3', strk: 'w4' },
  { rank: 6, name: 'Magic', logo: '/sports/teams/orl.png', w: 46, l: 36, pct: '.561', gb: '15.0', l10: '5-5', strk: 'l2' },
  { rank: 7, name: 'Pistons', logo: '/sports/teams/det.png', w: 43, l: 39, pct: '.524', gb: '18.0', l10: '6-4', strk: 'w2' },
  { rank: 8, name: 'Heat', logo: '/sports/teams/mia.png', w: 41, l: 41, pct: '.500', gb: '20.0', l10: '4-6', strk: 'l1' },
  { rank: 9, name: 'Hawks', logo: '/sports/teams/atl.png', w: 38, l: 44, pct: '.463', gb: '23.0', l10: '5-5', strk: 'w1' },
  { rank: 10, name: 'Bulls', logo: '/sports/teams/chi.png', w: 36, l: 46, pct: '.439', gb: '25.0', l10: '3-7', strk: 'l4' },
]

/* ── The club registry ─────────────────────────────────────────────────── */

export type TeamLeader = { stat: 'PTS' | 'REB' | 'AST'; name: string; value: string }

/** Prototype-grade club facts the standings and schedule rows don't carry
    — identity (abbreviation, city, palette), home floor, and the season's
    leaders. Keyed by the short name every sports row already uses. */
export type TeamInfo = {
  abbr: string
  city: string
  /** Primary, secondary (what the heroes and celebration walls flood). */
  colors: [string, string]
  arena: string
  arenaCity: string
  leaders: TeamLeader[]
}

const leaders = (pts: [string, string], reb: [string, string], ast: [string, string]): TeamLeader[] => [
  { stat: 'PTS', name: pts[0], value: pts[1] },
  { stat: 'REB', name: reb[0], value: reb[1] },
  { stat: 'AST', name: ast[0], value: ast[1] },
]

export const TEAMS: Record<string, TeamInfo> = {
  Spurs: { abbr: 'SA', city: 'San Antonio', colors: ['#C4CED4', '#1a1a1a'], arena: 'Frost Bank Center', arenaCity: 'San Antonio, TX', leaders: leaders(['V. Wembanyama', '24.8'], ['V. Wembanyama', '11.2'], ["De'A. Fox", '7.1']) },
  Thunder: { abbr: 'OKC', city: 'Oklahoma City', colors: ['#007AC1', '#EF3B24'], arena: 'Paycom Center', arenaCity: 'Oklahoma City, OK', leaders: leaders(['S. Gilgeous-Alexander', '31.4'], ['C. Holmgren', '8.9'], ['S. Gilgeous-Alexander', '6.3']) },
  Nuggets: { abbr: 'DEN', city: 'Denver', colors: ['#0E2240', '#FEC524'], arena: 'Ball Arena', arenaCity: 'Denver, CO', leaders: leaders(['N. Jokić', '28.1'], ['N. Jokić', '12.6'], ['N. Jokić', '10.2']) },
  Wolves: { abbr: 'MIN', city: 'Minnesota', colors: ['#0C2340', '#78BE20'], arena: 'Target Center', arenaCity: 'Minneapolis, MN', leaders: leaders(['A. Edwards', '27.3'], ['R. Gobert', '11.4'], ['A. Edwards', '4.9']) },
  Mavericks: { abbr: 'DAL', city: 'Dallas', colors: ['#00538C', '#002B5E'], arena: 'American Airlines Center', arenaCity: 'Dallas, TX', leaders: leaders(['A. Davis', '25.2'], ['A. Davis', '11.8'], ['C. Flagg', '4.6']) },
  Lakers: { abbr: 'LAL', city: 'Los Angeles', colors: ['#552583', '#FDB927'], arena: 'Crypto.com Arena', arenaCity: 'Los Angeles, CA', leaders: leaders(['L. Dončić', '30.6'], ['L. James', '7.9'], ['L. Dončić', '8.4']) },
  Clippers: { abbr: 'LAC', city: 'Los Angeles', colors: ['#C8102E', '#1D428A'], arena: 'Intuit Dome', arenaCity: 'Inglewood, CA', leaders: leaders(['K. Leonard', '24.1'], ['I. Zubac', '12.3'], ['J. Harden', '8.7']) },
  Suns: { abbr: 'PHX', city: 'Phoenix', colors: ['#1D1160', '#E56020'], arena: 'Mortgage Matchup Center', arenaCity: 'Phoenix, AZ', leaders: leaders(['D. Booker', '26.8'], ['M. Williams', '8.2'], ['D. Booker', '6.6']) },
  Grizzlies: { abbr: 'MEM', city: 'Memphis', colors: ['#5D76A9', '#12173F'], arena: 'FedExForum', arenaCity: 'Memphis, TN', leaders: leaders(['J. Morant', '23.9'], ['Z. Edey', '10.7'], ['J. Morant', '7.8']) },
  Kings: { abbr: 'SAC', city: 'Sacramento', colors: ['#5A2D81', '#63727A'], arena: 'Golden 1 Center', arenaCity: 'Sacramento, CA', leaders: leaders(['Z. LaVine', '22.4'], ['D. Sabonis', '13.1'], ['D. Sabonis', '6.2']) },
  Celtics: { abbr: 'BOS', city: 'Boston', colors: ['#007A33', '#BA9653'], arena: 'TD Garden', arenaCity: 'Boston, MA', leaders: leaders(['J. Brown', '26.4'], ['D. White', '5.8'], ['P. Pritchard', '5.9']) },
  Cavaliers: { abbr: 'CLE', city: 'Cleveland', colors: ['#860038', '#FDBB30'], arena: 'Rocket Arena', arenaCity: 'Cleveland, OH', leaders: leaders(['D. Mitchell', '25.7'], ['E. Mobley', '9.6'], ['D. Garland', '6.9']) },
  Knicks: { abbr: 'NY', city: 'New York', colors: ['#006BB6', '#F58426'], arena: 'Madison Square Garden', arenaCity: 'New York, NY', leaders: leaders(['J. Brunson', '27.2'], ['K. Towns', '12.4'], ['J. Brunson', '7.3']) },
  Bucks: { abbr: 'MIL', city: 'Milwaukee', colors: ['#00471B', '#EEE1C6'], arena: 'Fiserv Forum', arenaCity: 'Milwaukee, WI', leaders: leaders(['G. Antetokounmpo', '30.8'], ['G. Antetokounmpo', '12.1'], ['G. Antetokounmpo', '6.4']) },
  Pacers: { abbr: 'IND', city: 'Indiana', colors: ['#002D62', '#FDBB30'], arena: 'Gainbridge Fieldhouse', arenaCity: 'Indianapolis, IN', leaders: leaders(['P. Siakam', '22.6'], ['P. Siakam', '7.4'], ['A. Nembhard', '6.8']) },
  Magic: { abbr: 'ORL', city: 'Orlando', colors: ['#0077C0', '#C4CED4'], arena: 'Kia Center', arenaCity: 'Orlando, FL', leaders: leaders(['P. Banchero', '25.1'], ['P. Banchero', '8.3'], ['F. Wagner', '5.2']) },
  Pistons: { abbr: 'DET', city: 'Detroit', colors: ['#C8102E', '#1D42BA'], arena: 'Little Caesars Arena', arenaCity: 'Detroit, MI', leaders: leaders(['C. Cunningham', '26.3'], ['J. Duren', '10.8'], ['C. Cunningham', '9.1']) },
  Heat: { abbr: 'MIA', city: 'Miami', colors: ['#98002E', '#F9A01B'], arena: 'Kaseya Center', arenaCity: 'Miami, FL', leaders: leaders(['T. Herro', '24.2'], ['B. Adebayo', '9.7'], ['T. Herro', '5.6']) },
  Hawks: { abbr: 'ATL', city: 'Atlanta', colors: ['#E03A3E', '#C1D32F'], arena: 'State Farm Arena', arenaCity: 'Atlanta, GA', leaders: leaders(['T. Young', '23.8'], ['J. Johnson', '9.9'], ['T. Young', '11.2']) },
  Bulls: { abbr: 'CHI', city: 'Chicago', colors: ['#CE1141', '#1a1a1a'], arena: 'United Center', arenaCity: 'Chicago, IL', leaders: leaders(['C. White', '21.9'], ['M. Buzelis', '7.1'], ['J. Giddey', '8.4']) },
}

const FALLBACK_TEAM: TeamInfo = {
  abbr: '—',
  city: '',
  colors: ['#8a8494', '#3a3742'],
  arena: 'Arena',
  arenaCity: '',
  leaders: [],
}

export const teamInfo = (name: string): TeamInfo => TEAMS[name] ?? FALLBACK_TEAM

/** Which conference a standings row belongs to. */
export const conferenceOf = (name: string): 'West' | 'East' =>
  EAST_STANDINGS.some((t) => t.name === name) ? 'East' : 'West'

/* ── The slate ─────────────────────────────────────────────────────────── */

export type ScheduleTeam = { name: string; record: string; logo: string }

export type ScheduleGame = {
  id: string
  /** Home club first — the fixture is played on the first club's floor. */
  teams: [ScheduleTeam, ScheduleTeam]
  /** Relative day label in the right column ("Tomorrow", "Wednesday"). */
  day: string
  time: string
  /** National broadcast — the preview's TV chip. */
  tv: string
}

export type ScheduleGroup = { date: string; games: ScheduleGame[] }

/** Records here are the series — both conference finals sit at 2–2. */
const SPURS: ScheduleTeam = { name: 'Spurs', record: '(2-2)', logo: '/sports/spurs.svg' }
const THUNDER: ScheduleTeam = { name: 'Thunder', record: '(2-2)', logo: '/sports/thunder.svg' }
const CELTICS: ScheduleTeam = { name: 'Celtics', record: '(2-2)', logo: '/sports/teams/bos.png' }
const PACERS: ScheduleTeam = { name: 'Pacers', record: '(2-2)', logo: '/sports/teams/ind.png' }

/** The upcoming slate, grouped by date — both conference finals tied 2–2,
    Game 5 on the higher seed's floor (2-2-1-1-1), winding toward a pair
    of game sevens. */
export const SCHEDULE: ScheduleGroup[] = [
  {
    date: 'Sat., June 14th',
    games: [
      { id: 'g5-west', teams: [SPURS, THUNDER], day: 'Tomorrow', time: '7:30 PM', tv: 'ESPN' },
      { id: 'g5-east', teams: [CELTICS, PACERS], day: 'Tomorrow', time: '5:00 PM', tv: 'ABC' },
    ],
  },
  {
    date: 'Mon., June 16th',
    games: [
      { id: 'g6-west', teams: [THUNDER, SPURS], day: 'Monday', time: '8:00 PM', tv: 'ESPN' },
      { id: 'g6-east', teams: [PACERS, CELTICS], day: 'Monday', time: '6:30 PM', tv: 'ABC' },
    ],
  },
  {
    date: 'Wed., June 18th',
    games: [
      { id: 'g7-west', teams: [SPURS, THUNDER], day: 'Wednesday', time: '7:30 PM', tv: 'ESPN' },
      { id: 'g7-east', teams: [CELTICS, PACERS], day: 'Wednesday', time: '5:00 PM', tv: 'ABC' },
    ],
  },
]

export const ALL_GAMES: ScheduleGame[] = SCHEDULE.flatMap((g) => g.games)

/** The date group a fixture belongs to ("Sat., June 14th"). */
export const gameDate = (game: ScheduleGame) =>
  SCHEDULE.find((g) => g.games.some((x) => x.id === game.id))?.date ?? ''

/** "g5-west" → 5. */
export const gameNumberOf = (id: string) => parseInt(id.match(/\d+/)?.[0] ?? '0', 10)

/** "g5-west" → "west". */
export const seriesKeyOf = (id: string): SeriesKey => (id.endsWith('east') ? 'east' : 'west')

/* ── The series ────────────────────────────────────────────────────────── */

export type SeriesKey = 'west' | 'east'

export type SeriesGame = {
  num: number
  /** Home club first, mirroring ScheduleGame. */
  home: string
  away: string
  homeScore: number
  awayScore: number
  date: string
}

export type Series = {
  title: string
  /** The two clubs, higher seed first. */
  teams: [string, string]
  played: SeriesGame[]
}

/** Both conference finals so far — four games each, split 2–2. The
    preview's series strip and "last meeting" read from here. */
export const SERIES: Record<SeriesKey, Series> = {
  west: {
    title: 'Western Conference Finals',
    teams: ['Spurs', 'Thunder'],
    played: [
      { num: 1, home: 'Spurs', away: 'Thunder', homeScore: 112, awayScore: 104, date: 'Wed, June 4' },
      { num: 2, home: 'Spurs', away: 'Thunder', homeScore: 109, awayScore: 118, date: 'Fri, June 6' },
      { num: 3, home: 'Thunder', away: 'Spurs', homeScore: 121, awayScore: 110, date: 'Mon, June 9' },
      { num: 4, home: 'Thunder', away: 'Spurs', homeScore: 108, awayScore: 115, date: 'Wed, June 11' },
    ],
  },
  east: {
    title: 'Eastern Conference Finals',
    teams: ['Celtics', 'Pacers'],
    played: [
      { num: 1, home: 'Celtics', away: 'Pacers', homeScore: 110, awayScore: 98, date: 'Tue, June 3' },
      { num: 2, home: 'Celtics', away: 'Pacers', homeScore: 111, awayScore: 114, date: 'Thu, June 5' },
      { num: 3, home: 'Pacers', away: 'Celtics', homeScore: 99, awayScore: 105, date: 'Sat, June 7' },
      { num: 4, home: 'Pacers', away: 'Celtics', homeScore: 120, awayScore: 113, date: 'Tue, June 10' },
    ],
  },
}

export const seriesWinner = (g: SeriesGame) => (g.homeScore > g.awayScore ? g.home : g.away)

/** A club's wins in a series, with an optional extra result folded in. */
export const seriesWins = (key: SeriesKey, team: string, extraWinner?: string) =>
  SERIES[key].played.filter((g) => seriesWinner(g) === team).length +
  (extraWinner === team ? 1 : 0)

/** "Series tied 2–2" / "Spurs lead 3–2" for a series' played games, with
    an optional extra result folded in (the game center's final). */
export const seriesLine = (key: SeriesKey, extraWinner?: string) => {
  const [a, b] = SERIES[key].teams
  const wa = seriesWins(key, a, extraWinner)
  const wb = seriesWins(key, b, extraWinner)
  if (wa === wb) return `Series tied ${wa}\u2013${wb}`
  const [leader, hi, lo] = wa > wb ? [a, wa, wb] : [b, wb, wa]
  return `${leader} ${hi === 4 ? 'win' : 'lead'} ${hi}\u2013${lo}`
}

/** League attribution chips — ProviderChips' grammar with sports sources.
    ESPN's mark is its wordmark knocked out white on the brand's red disc;
    the NBA's is the league lockup on white. */
export function SportsChips({
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
