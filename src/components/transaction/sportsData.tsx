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

export type ScheduleTeam = { name: string; record: string; logo: string }

export type ScheduleGame = {
  id: string
  teams: [ScheduleTeam, ScheduleTeam]
  /** Relative day label in the right column ("Tomorrow", "Wednesday"). */
  day: string
  time: string
}

export type ScheduleGroup = { date: string; games: ScheduleGame[] }

const SPURS: ScheduleTeam = { name: 'Spurs', record: '(2-3)', logo: '/sports/spurs.svg' }
const THUNDER: ScheduleTeam = { name: 'Thunder', record: '(3-2)', logo: '/sports/thunder.svg' }
const CELTICS: ScheduleTeam = { name: 'Celtics', record: '(3-2)', logo: '/sports/teams/bos.png' }
const PACERS: ScheduleTeam = { name: 'Pacers', record: '(2-3)', logo: '/sports/teams/ind.png' }

/** The upcoming slate, grouped by date — conference finals winding toward
    a pair of game sevens. */
export const SCHEDULE: ScheduleGroup[] = [
  {
    date: 'Sat., June 14th',
    games: [
      { id: 'g5-west', teams: [SPURS, THUNDER], day: 'Tomorrow', time: '7:30 PM' },
      { id: 'g5-east', teams: [PACERS, CELTICS], day: 'Tomorrow', time: '5:00 PM' },
    ],
  },
  {
    date: 'Mon., June 16th',
    games: [
      { id: 'g6-west', teams: [THUNDER, SPURS], day: 'Monday', time: '8:00 PM' },
      { id: 'g6-east', teams: [CELTICS, PACERS], day: 'Monday', time: '6:30 PM' },
    ],
  },
  {
    date: 'Wed., June 18th',
    games: [
      { id: 'g7-west', teams: [SPURS, THUNDER], day: 'Wednesday', time: '7:30 PM' },
      { id: 'g7-east', teams: [PACERS, CELTICS], day: 'Wednesday', time: '5:00 PM' },
    ],
  },
]

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
