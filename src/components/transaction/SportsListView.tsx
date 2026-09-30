/**
 * Sports full results — the surfaces behind the sports thread's "View More"
 * pills, one per inquiry:
 *
 *   schedule  → the upcoming slate (Figma 2302:75680 rows): date-grouped
 *               fixtures, each row the two clubs against a hairline-split
 *               time column, under a schedule-shaped filter rail.
 *   standings → the league table (Figma 2374:72712): both conferences as
 *               flat sections — title, stat header, hairline, ranked rows.
 *   tickets   → the marketplace's full inventory: the seat-listing card's
 *               anatomy flattened to rows (bowl thumb, tier and section,
 *               the per-ticket price past a hairline) under a ticket-shaped
 *               sort rail. Rows are doorways into the seat-and-pay sheet;
 *               seller chips re-source the inventory in place.
 *
 * Same grammar as FlightListView: the surface clip-morphs open from the
 * pill, league chips re-source in place, content melts into progressive
 * blur at both scroll edges.
 */
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ProgressiveBlur } from '../shared/ProgressiveBlur'
import { ArenaThumb } from './arenaMap'
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
import {
  SEAT_LISTINGS,
  TicketChips,
  TIER_LABELS,
  type SeatListing,
  type TicketProviderId,
} from './ticketData'

const EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const

/** Where the morph starts: the View More pill's insets from the frame edges. */
export type SportsListOrigin = { top: number; right: number; bottom: number; left: number }

export type SportsListMode = 'schedule' | 'standings' | 'tickets'

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

/** The ticket rail's two live sorts — the marketplace's own order (the
    assistant's pick leads) vs. cheapest pair first. The active chip
    toggles off, landing back on the seller's order. */
type TicketSortId = 'best' | 'cheapest'
type TicketSort = TicketSortId | null
const TICKET_SORTS: { id: TicketSortId; label: string }[] = [
  { id: 'best', label: 'Best seats' },
  { id: 'cheapest', label: 'Cheapest' },
]
const TICKET_FILTERS = ['2 together', 'Aisle', 'Lower bowl']

function TicketFilterRow({
  sort,
  onSort,
}: {
  sort: TicketSort
  onSort: (s: TicketSortId) => void
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
        {TICKET_SORTS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={sort === id}
            onClick={() => onSort(id)}
            className={`flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-medium whitespace-nowrap outline-none transition-[transform,background-color,color] duration-200 ease-out active:scale-[0.97] ${
              sort === id ? 'bg-ink text-white' : 'bg-black/[0.05] text-ink'
            }`}
          >
            {label}
          </button>
        ))}
        {TICKET_FILTERS.map((label) => (
          <button
            key={label}
            type="button"
            className="flex h-10 shrink-0 items-center rounded-full bg-black/[0.05] px-4 text-[13px] font-medium whitespace-nowrap text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** One pair — the seat-listing card's anatomy flattened to a list row:
    the bowl thumb with the section lit, tier and section over the row and
    the seller's notes, the per-ticket price past a hairline. */
function ListingRow({ listing }: { listing: SeatListing }) {
  return (
    <div className="flex items-center py-2.5">
      <div className="flex h-[52px] w-[56px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[#eef0f2]">
        <ArenaThumb spot={listing.spot} className="h-[42px] w-[50px]" />
      </div>
      <div className="ml-3 flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#110707]">
          {TIER_LABELS[listing.tier]} &middot; Sec {listing.section}
        </p>
        <p className="truncate text-[12px] font-medium text-[rgba(17,7,7,0.45)]">
          Row {listing.row} &middot; {listing.tags.join(' \u00B7 ')}
        </p>
      </div>
      <div className="mx-4 w-px self-stretch bg-black/[0.06]" />
      <div className="flex w-[62px] shrink-0 flex-col items-end gap-1 text-right">
        <p className="text-[15px] leading-none font-bold tracking-[-0.02em] tabular-nums text-black">
          ${listing.price.toLocaleString()}
        </p>
        <p className="text-[11px] leading-none font-medium text-[rgba(17,7,7,0.45)]">each</p>
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

/** One ranked row — the standings card's anatomy in the table. */
function StandingsRow({ team }: { team: TeamStanding }) {
  return (
    <div className="flex h-[45px] items-center justify-between py-[5px]">
      <div className="flex min-w-0 items-center gap-[6.5px]">
        <span className="w-[9px] shrink-0 text-[12px] font-medium text-[#787a7d]">{team.rank}</span>
        <img src={team.logo} alt="" draggable={false} className="size-6 shrink-0 object-contain" />
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
  )
}

/** One conference table — title, stat header, hairline, ranked rows.
    Rows are doorways into the team page when the host wires them. */
function StandingsSection({
  title,
  teams,
  onSelectTeam,
}: {
  title: string
  teams: TeamStanding[]
  onSelectTeam?: (team: TeamStanding, el: Element) => void
}) {
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
        {teams.map((team) =>
          onSelectTeam ? (
            <button
              key={team.name}
              type="button"
              onClick={(e) => onSelectTeam(team, e.currentTarget)}
              aria-label={`View ${team.name}`}
              className="-mx-2 w-[calc(100%+16px)] rounded-[12px] px-2 text-left outline-none transition-colors duration-150 active:bg-black/[0.03]"
            >
              <StandingsRow team={team} />
            </button>
          ) : (
            <StandingsRow key={team.name} team={team} />
          ),
        )}
      </div>
    </div>
  )
}

export function SportsListView({
  mode,
  origin,
  provider,
  onSelectProvider,
  seller = 'ticketmaster',
  onSelectSeller,
  onClose,
  onSelectGame,
  onSelectTeam,
  onSelectListing,
}: {
  mode: SportsListMode
  origin: SportsListOrigin
  provider: SportsProviderId
  onSelectProvider: (id: SportsProviderId) => void
  /** Tickets mode sources from a marketplace, not the league's feed — the
      seller chips re-deal the inventory in place (state shared with the
      thread, so toggles carry both ways). */
  seller?: TicketProviderId
  onSelectSeller?: (id: TicketProviderId) => void
  onClose: () => void
  /** 8C: schedule rows become doorways — tapping a fixture drills into
      that game's preview (the row element carries the morph's origin). */
  onSelectGame?: (game: ScheduleGame, el: Element) => void
  /** 8C: standings rows become doorways — tapping a team drills into its
      page. */
  onSelectTeam?: (team: TeamStanding, el: Element) => void
  /** Ticket rows become doorways — tapping a pair drills into the
      seat-and-pay sheet. */
  onSelectListing?: (listing: SeatListing, el: Element) => void
}) {
  // While the list is up the orb stays live, but its resting hint stands
  // down — the results are the moment.
  const setHintSuppressed = useReservationFlow()?.setHintSuppressed
  useEffect(() => {
    setHintSuppressed?.(true)
    return () => setHintSuppressed?.(false)
  }, [setHintSuppressed])

  const [filter, setFilter] = useState<ScheduleFilter>('upcoming')

  // Tickets: the seller's own order leads with the assistant's pick;
  // Cheapest re-ranks by price. The active sort toggles off.
  const [ticketSort, setTicketSort] = useState<TicketSort>('best')
  const toggleTicketSort = (id: TicketSortId) =>
    setTicketSort((s) => (s === id ? null : id))
  const listings =
    ticketSort === 'cheapest'
      ? [...SEAT_LISTINGS[seller]].sort((a, b) => a.price - b.price)
      : SEAT_LISTINGS[seller]

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
            {mode === 'schedule'
              ? 'Spurs Schedule'
              : mode === 'standings'
                ? 'NBA Standings'
                : 'Spurs Tickets'}
          </span>
        </div>
        <span aria-hidden="true" />
      </div>

      {/* Sourcing (the league's feed, or the marketplace for tickets) +
          the mode's filter rail. */}
      <div className="shrink-0 px-5 pt-4">
        {mode === 'tickets' && onSelectSeller ? (
          <TicketChips active={seller} onSelect={onSelectSeller} />
        ) : (
          <SportsChips active={provider} onSelect={onSelectProvider} />
        )}
        {mode === 'schedule' && (
          <div className="mt-3">
            <FilterRow active={filter} onSelect={setFilter} />
          </div>
        )}
        {mode === 'tickets' && (
          <div className="mt-3">
            <TicketFilterRow sort={ticketSort} onSort={toggleTicketSort} />
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
          {mode === 'tickets' ? (
            <div key={`${seller}-${ticketSort}`} className="flex flex-col pt-1">
              {listings.map((listing, li) => {
                const row = (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 + li * 0.05, ease: EASE }}
                  >
                    <ListingRow listing={listing} />
                  </motion.div>
                )
                return onSelectListing ? (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={(e) => onSelectListing(listing, e.currentTarget)}
                    aria-label={`View seats in section ${listing.section}, row ${listing.row}, $${listing.price} each`}
                    className="-mx-2 w-[calc(100%+16px)] rounded-[16px] px-2 text-left outline-none transition-colors duration-150 active:bg-black/[0.03]"
                  >
                    {row}
                  </button>
                ) : (
                  row
                )
              })}
            </div>
          ) : mode === 'schedule' ? (
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
                  {group.games.map((game) =>
                    onSelectGame ? (
                      <button
                        key={game.id}
                        type="button"
                        onClick={(e) => onSelectGame(game, e.currentTarget)}
                        aria-label={`View ${game.teams[0].name} vs ${game.teams[1].name}`}
                        className="-mx-2 w-[calc(100%+16px)] rounded-[14px] px-2 text-left outline-none transition-colors duration-150 active:bg-black/[0.03]"
                      >
                        <ScheduleRow game={game} />
                      </button>
                    ) : (
                      <ScheduleRow key={game.id} game={game} />
                    ),
                  )}
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
                  <StandingsSection
                    title={section.title}
                    teams={section.teams}
                    onSelectTeam={onSelectTeam}
                  />
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
