/**
 * Game preview — the drill-in behind 8C's fixture cards, for a game that
 * hasn't tipped. A schedule answer comes from the league's feed, so this
 * is what the feed knows: the matchup's identity up top (both clubs'
 * colors meeting on a slant), then a sheet in the flight-tracker grammar —
 * source + date overline, the matchup as a headline, action chips, a
 * status banner, the tipoff block with the broadcast chip, the series so
 * far as a strip of game dots, both clubs' form side by side, and the last
 * meeting.
 *
 * Tickets aren't the feed's to sell. The sheet's last move is a punch-out
 * — "Get tickets · from $58" wearing the marketplace's mark and ↗ — which
 * leaves for the seat-and-pay sheet (TicketDetailsView) with the active
 * marketplace's lead listing. Same game object across scheduled → live →
 * final: GameCenterView shares this hero and header.
 */
import { motion } from 'framer-motion'
import {
  EAST_STANDINGS,
  gameDate,
  gameNumberOf,
  SERIES,
  seriesKeyOf,
  seriesLine,
  seriesWinner,
  teamInfo,
  WEST_STANDINGS,
  type ScheduleGame,
  type ScheduleTeam,
  type SportsProviderId,
} from './sportsData'
import {
  ActionChip,
  ActionChips,
  Banner,
  BlockTitle,
  ClubSplitHero,
  DetailSurface,
  EASE,
  LeagueMark,
  PunchOutRow,
  SectionTitle,
  SheetHeader,
  type DetailsOrigin,
} from './sportsDetailsKit'
import { cheapestListing, SEAT_LISTINGS, TicketMark, type TicketProvider } from './ticketData'

/** "Sat., June 14th" → "SAT, JUNE 14" (the overline's registry style). */
const overlineDate = (date: string) =>
  date.replace(/(st|nd|rd|th)$/, '').replace(/\./g, '').toUpperCase()

const PROVIDER_NAMES: Record<SportsProviderId, string> = { nba: 'NBA', espn: 'ESPN' }

/** The season line a club carries into the game — read off the standings,
    with scoring rates derived from the record at prototype grade. */
const formOf = (name: string) => {
  const row = [...WEST_STANDINGS, ...EAST_STANDINGS].find((t) => t.name === name)
  const pct = row ? row.w / (row.w + row.l) : 0.5
  return {
    record: row ? `${row.w}\u2013${row.l}` : '\u2014',
    ppg: (105 + pct * 18).toFixed(1),
    oppg: (122 - pct * 16).toFixed(1),
    l10: row?.l10 ?? '\u2014',
    strk: row ? row.strk.toUpperCase() : '\u2014',
  }
}

/** The series as a strip of seven — played games carry the winner's
    logo and the score, this game is the lit hollow, the rest are dashed
    "if necessary" slots. */
function SeriesStrip({ game }: { game: ScheduleGame }) {
  const key = seriesKeyOf(game.id)
  const series = SERIES[key]
  const thisNum = gameNumberOf(game.id)
  const logoOf = (name: string) =>
    game.teams.find((t) => t.name === name)?.logo ?? teamInfo(name).abbr
  return (
    <div className="mt-3 grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const num = i + 1
        const played = series.played.find((g) => g.num === num)
        const isThis = num === thisNum
        return (
          <motion.div
            key={num}
            className="flex flex-col items-center gap-1.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05, duration: 0.35, ease: EASE }}
          >
            {played ? (
              <span className="flex size-9 items-center justify-center rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.14)]">
                <img
                  src={logoOf(seriesWinner(played))}
                  alt=""
                  draggable={false}
                  className="size-5 object-contain"
                />
              </span>
            ) : (
              <span
                className={`flex size-9 items-center justify-center rounded-full text-[11px] font-bold ${
                  isThis
                    ? 'bg-[#f6c944] text-ink shadow-[0_2px_10px_rgba(246,201,68,0.55)]'
                    : 'border border-dashed border-black/20 text-ink-tertiary'
                }`}
              >
                G{num}
              </span>
            )}
            <span
              className={`text-[9.5px] leading-none font-medium whitespace-nowrap ${
                isThis ? 'text-ink' : 'text-ink-tertiary'
              }`}
            >
              {played
                ? `${Math.max(played.homeScore, played.awayScore)}\u2013${Math.min(played.homeScore, played.awayScore)}`
                : isThis
                  ? game.day
                  : num > thisNum
                    ? 'if nec.'
                    : '\u2014'}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

/** Both clubs' season lines side by side — a labeled center column. */
function FormTable({ home, away }: { home: ScheduleTeam; away: ScheduleTeam }) {
  const h = formOf(home.name)
  const a = formOf(away.name)
  const rows: [string, string, string][] = [
    ['Season', h.record, a.record],
    ['PPG', h.ppg, a.ppg],
    ['Opp PPG', h.oppg, a.oppg],
    ['Last 10', h.l10, a.l10],
    ['Streak', h.strk, a.strk],
  ]
  return (
    <div className="mt-2.5 rounded-[18px] border border-black/[0.08]">
      <div className="grid grid-cols-[1fr_88px_1fr] items-center px-4 pt-3 pb-2">
        <span className="flex items-center gap-2">
          <img src={home.logo} alt="" draggable={false} className="size-6 object-contain" />
          <span className="text-[13px] font-semibold text-ink">{home.name}</span>
        </span>
        <span />
        <span className="flex items-center justify-end gap-2">
          <span className="text-[13px] font-semibold text-ink">{away.name}</span>
          <img src={away.logo} alt="" draggable={false} className="size-6 object-contain" />
        </span>
      </div>
      {rows.map(([label, hv, av], i) => (
        <div
          key={label}
          className={`grid grid-cols-[1fr_88px_1fr] items-center px-4 py-2 text-[13px] ${
            i > 0 ? 'border-t border-black/[0.05]' : 'border-t border-black/[0.08]'
          }`}
        >
          <span className="font-semibold tabular-nums text-ink">{hv}</span>
          <span className="text-center text-[11px] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
            {label}
          </span>
          <span className="text-right font-semibold tabular-nums text-ink">{av}</span>
        </div>
      ))}
    </div>
  )
}

export function GamePreviewView({
  game,
  provider,
  ticketProvider,
  origin,
  z,
  onClose,
  onTickets,
}: {
  game: ScheduleGame
  /** Whose feed the preview carries — the thread's league chips. */
  provider: SportsProviderId
  /** Whose inventory the punch-out leaves for — the thread's ticket chips. */
  ticketProvider: TicketProvider
  origin: DetailsOrigin
  z?: number
  onClose: () => void
  /** The punch-out — the row's element carries the morph's origin. */
  onTickets: (el: Element) => void
}) {
  const [home, away] = game.teams
  const homeInfo = teamInfo(home.name)
  const key = seriesKeyOf(game.id)
  const series = SERIES[key]
  const last = series.played[series.played.length - 1]
  const lastVenue = teamInfo(last.home).arena
  const cheapest = cheapestListing(ticketProvider.id)
  const lower = SEAT_LISTINGS[ticketProvider.id]
    .filter((l) => l.tier === 'lower')
    .reduce((a, b) => (b.price < a.price ? b : a))

  return (
    <DetailSurface origin={origin} z={z} hero={<ClubSplitHero home={home} away={away} />}>
      <SheetHeader
        overline={
          <>
            {PROVIDER_NAMES[provider]} &middot; Game {gameNumberOf(game.id)} &middot;{' '}
            {overlineDate(gameDate(game))}
          </>
        }
        title={
          <>
            {home.name} vs {away.name}
          </>
        }
        avatar={<LeagueMark id={provider} size={40} />}
        onClose={onClose}
        closeLabel="Close game preview"
      />

      <ActionChips>
        <ActionChip
          label="Add to calendar"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M4 10.5h16" />
            </svg>
          }
        />
        <ActionChip
          label="Remind me"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 21h4" />
            </svg>
          }
        />
        <ActionChip
          label="Directions"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2ZM9 4v14M15 6v14" />
            </svg>
          }
        />
      </ActionChips>

      <Banner
        title={
          <>
            Tipoff {game.day.toLowerCase() === 'tomorrow' ? 'tomorrow' : game.day} at {game.time}
          </>
        }
        sub={
          <>
            {homeInfo.arena} &middot; {homeInfo.arenaCity} &middot; {seriesLine(key)}
          </>
        }
      />

      {/* Tipoff block — big scheduled time, the broadcast as the chip. */}
      <div className="mt-4 flex flex-col gap-1">
        <BlockTitle
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          }
        >
          {game.day} &middot; Tipoff
        </BlockTitle>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
              {game.time}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-tertiary">Scheduled &middot; local time</p>
          </div>
          <div className="flex flex-col items-end gap-1 pb-0.5">
            <span className="flex items-center gap-1 rounded-[9px] bg-[#f6c944] px-2 py-[3px] text-[14px] font-extrabold tracking-[-0.01em] text-ink">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="6" width="18" height="12" rx="2.5" />
                <path d="M8 21h8M12 3v3" />
              </svg>
              {game.tv}
            </span>
            <p className="text-[12px] text-ink-tertiary">Doors 6:00 PM</p>
          </div>
        </div>
      </div>

      {/* The series so far. */}
      <SectionTitle>{series.title}</SectionTitle>
      <p className="mt-0.5 text-[12px] text-ink-tertiary">
        {seriesLine(key)} &middot; Game {gameNumberOf(game.id)}{' '}
        {game.day.toLowerCase() === 'tomorrow' ? 'tomorrow' : game.day}
      </p>
      <SeriesStrip game={game} />

      {/* Form. */}
      <SectionTitle>Form</SectionTitle>
      <FormTable home={home} away={away} />

      {/* Last meeting. */}
      <SectionTitle>Last meeting</SectionTitle>
      <div className="mt-2.5 flex items-center justify-between rounded-[18px] border border-black/[0.08] px-4 py-3">
        <div className="flex flex-col gap-1.5">
          {[
            { name: last.home, score: last.homeScore },
            { name: last.away, score: last.awayScore },
          ].map((side) => {
            const won = seriesWinner(last) === side.name
            const logo = game.teams.find((t) => t.name === side.name)?.logo
            return (
              <span key={side.name} className="flex items-center gap-2">
                {logo && <img src={logo} alt="" draggable={false} className="size-5 object-contain" />}
                <span className={`text-[13.5px] ${won ? 'font-bold text-ink' : 'font-medium text-ink-tertiary'}`}>
                  {side.name}
                </span>
                <span className={`ml-1 text-[13.5px] tabular-nums ${won ? 'font-bold text-ink' : 'font-medium text-ink-tertiary'}`}>
                  {side.score}
                </span>
              </span>
            )
          })}
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-[12px] font-semibold text-ink">Game {last.num} &middot; Final</span>
          <span className="text-[11px] text-ink-tertiary">{last.date}</span>
          <span className="text-[11px] text-ink-tertiary">{lastVenue}</span>
        </div>
      </div>

      {/* The punch-out — tickets are the marketplace's to sell. */}
      <SectionTitle>Tickets</SectionTitle>
      <div className="mt-2.5">
        <PunchOutRow
          mark={<TicketMark provider={ticketProvider} size={36} />}
          title={<>Get tickets &middot; from ${cheapest.price}</>}
          sub={
            <>
              {ticketProvider.name} &middot; Lower bowl from ${lower.price} &middot; pairs
            </>
          }
          onClick={(e) => onTickets(e.currentTarget)}
          ariaLabel={`Get tickets on ${ticketProvider.name}`}
        />
      </div>
      <p className="mt-2 text-center text-[10.5px] text-ink-tertiary">
        Opens {ticketProvider.name} &middot; prices include fees
      </p>
    </DetailSurface>
  )
}
