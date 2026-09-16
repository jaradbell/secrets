/**
 * Sports list-result prototype (8C): one thread, five inquiries — the
 * suggested object changes shape with the question, and each object
 * drills into the detail view its intent actually implies.
 *
 *   schedule   → the two-team fixture card (Figma 2279:78979) dealt as a
 *                swipeable deck of the upcoming slate. Tap → the GAME
 *                PREVIEW (GamePreviewView): what the league's feed knows
 *                about a game that hasn't tipped — tipoff, broadcast, the
 *                series so far, form, last meeting — with tickets as a
 *                punch-out to the marketplace, not a sale of its own.
 *   tickets    → the seat-listing card (new): a marketplace's pairs dealt
 *                as a deck — the section lit on a bowl thumbnail, tier and
 *                row, the per-ticket price. Ticketmaster / SeatGeek chips
 *                re-source the deck. Tap → the TICKET SHEET
 *                (TicketDetailsView): the arena with your section stitched
 *                to the court, seats and price, Buy tickets → Apple Pay →
 *                the celebration takeover (GameTicketReceipt) → Done lands
 *                back here, where the resolved turn keeps the ticket.
 *   live game  → the scoreboard card (Figma 2377:73529) with the Live
 *                pill. Tap → the GAME CENTER (GameCenterView): the score
 *                by quarter, leaders, a starters' box, the play feed.
 *   final      → the same scoreboard gone Final. Tap → the game center in
 *                its finished state: recap, complete quarters, the series
 *                line updated.
 *   rankings   → the standings row (Figma 2371:73391) dealt as a deck,
 *                one card per team. Tap → the TEAM PAGE (TeamDetailsView):
 *                seed, the row as tiles, next game (a doorway back into
 *                the preview), last five, leaders.
 *
 * League chips (NBA / ESPN) attribute whose feed an answer carries; the
 * ticket turn swaps them for marketplace chips, since the seller is the
 * source there. Each View More clip-morphs the inquiry's full surface open
 * (SportsListView). Drill-ins stack: a detail opened from inside another
 * rides two z-levels above it and pops back to it on close.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArenaThumb } from './arenaMap'
import { ConversationHeader } from './ConversationHeader'
import { gameBooking } from './gameBookingStore'
import { FINAL_GAME, LIVE_GAME, type GameCenter } from './gameCenterData'
import { GameCenterView } from './GameCenterView'
import { GamePreviewView } from './GamePreviewView'
import { useReservationFlow } from './reservationFlow'
import type { DetailsOrigin } from './sportsDetailsKit'
import { SportsListView, type SportsListMode, type SportsListOrigin } from './SportsListView'
import {
  ALL_GAMES,
  seriesKeyOf,
  seriesLine,
  seriesWins,
  SportsChips,
  WEST_STANDINGS as STANDINGS,
  type ScheduleGame,
  type SportsProviderId,
  type TeamStanding,
} from './sportsData'
import { TeamDetailsView } from './TeamDetailsView'
import {
  SEAT_LISTINGS,
  TicketChips,
  TicketMark,
  ticketProvider,
  TIER_LABELS,
  type SeatListing,
  type TicketProvider,
  type TicketProviderId,
} from './ticketData'
import { TicketDetailsView } from './TicketDetailsView'

const EASE = [0.32, 0.72, 0, 1] as const

/** Family shadow — same as the flight ticket's, so the sports objects read
    as the same suggested-result class. */
const CARD_SHADOW = '0px 11px 20px rgba(0,0,0,0.1)'
const MUTED_SHADOW = '0px 6px 20px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)'

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
const SPURS_GAMES = ALL_GAMES.filter((g) => g.teams.some((t) => t.name === 'Spurs'))

/** The fixture the ticket ask is about — the thread's lead game. */
const TICKET_GAME = SPURS_GAMES[0]

/** Fixture card (Figma 2279:78979) — one upcoming game, dealt as a deck. */
function ScheduleCard({ game, muted = false }: { game: ScheduleGame; muted?: boolean }) {
  return (
    <div
      className="flex w-full items-center justify-between rounded-[32px] bg-white p-4"
      style={{ height: SCHEDULE_H, boxShadow: muted ? MUTED_SHADOW : CARD_SHADOW }}
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

const LISTING_H = 90

/** Seat-listing card — a marketplace's pair for the game: the section lit
    on a bowl thumbnail, tier and section, row and the seller's notes, the
    per-ticket price. The fixture card's frame, pointed at inventory. */
function SeatListingCard({ listing, muted = false }: { listing: SeatListing; muted?: boolean }) {
  return (
    <div
      className="flex w-full items-center rounded-[32px] bg-white py-3 pr-5 pl-3"
      style={{ height: LISTING_H, boxShadow: muted ? MUTED_SHADOW : CARD_SHADOW }}
    >
      <div
        className="flex w-full items-center gap-3 transition-opacity duration-300"
        style={{ opacity: muted ? 0 : 1 }}
      >
        <div className="flex h-[62px] w-[66px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#eef0f2]">
          <ArenaThumb spot={listing.spot} className="h-[50px] w-[60px]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#110707]">
            {TIER_LABELS[listing.tier]} &middot; Sec {listing.section}
          </p>
          <p className="truncate text-[12px] font-medium text-[rgba(17,7,7,0.45)]">
            Row {listing.row} &middot; {listing.tags.join(' \u00B7 ')}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <p className="text-[16px] leading-none font-bold tracking-[-0.02em] tabular-nums text-black">
            ${listing.price.toLocaleString()}
          </p>
          <p className="text-[11px] leading-none font-medium text-[rgba(17,7,7,0.45)]">each</p>
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

/** Scoreboard card (Figma 2377:73529) — the live-game answer, and the
    same card gone Final. A doorway into the game center. */
function ScoreboardCard({
  center,
  onOpen,
}: {
  center: GameCenter
  onOpen: (center: GameCenter, el: Element) => void
}) {
  const [home, away] = center.game.teams
  const key = seriesKeyOf(center.game.id)
  const live = center.status === 'live'
  const winner = live ? undefined : center.home.score > center.away.score ? home.name : away.name
  const record = (name: string, other: string) =>
    `${seriesWins(key, name, winner)}-${seriesWins(key, other, winner)}`
  return (
    <button
      type="button"
      onClick={(e) => onOpen(center, e.currentTarget)}
      aria-label={`${live ? 'Live' : 'Final'}: ${home.name} ${center.home.score}, ${away.name} ${center.away.score}`}
      className="flex w-full flex-col gap-4 rounded-[32px] bg-white px-4 py-8 text-left outline-none transition-transform duration-200 ease-out active:scale-[0.985]"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="flex w-full items-start gap-5">
        <ClubColumn name={home.name} record={record(home.name, away.name)} logo={home.logo} />
        <div className="flex w-[120px] shrink-0 flex-col items-center gap-2">
          {live ? (
            <span className="flex h-6 w-[53px] items-center justify-center rounded-full bg-[#b23030] text-[12px] font-medium tracking-[0.01em] text-white">
              Live
            </span>
          ) : (
            <span className="flex h-6 w-[53px] items-center justify-center rounded-full bg-ink text-[12px] font-medium tracking-[0.01em] text-white">
              Final
            </span>
          )}
          <div className="flex w-full items-center justify-between leading-[1.5] font-medium text-black">
            <p className={`text-[32px] tabular-nums ${!live && winner !== home.name ? 'text-black/40' : ''}`}>
              {center.home.score}
            </p>
            <p className="text-[20px] tracking-[-0.02em]">:</p>
            <p className={`text-[32px] tabular-nums ${!live && winner !== away.name ? 'text-black/40' : ''}`}>
              {center.away.score}
            </p>
          </div>
          <p className="text-[12px] leading-[1.5] font-medium whitespace-nowrap text-black/60">
            {live ? `${center.period} ${center.clock}` : 'Final'}
          </p>
        </div>
        <ClubColumn name={away.name} record={record(away.name, home.name)} logo={away.logo} />
      </div>
      {/* Perforation — the same tear line the flight ticket carries. */}
      <img
        src="/flights/divider.svg"
        alt=""
        draggable={false}
        className="h-px w-full"
        style={{ objectFit: 'fill' }}
      />
      <p className="w-full text-center text-[12px] font-semibold tracking-[-0.02em] text-[#1a1c1e]">
        Conference Finals &middot;&ensp;Game 5 ({seriesLine(key, winner)})
      </p>
    </button>
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
      style={{ height: STANDING_H, boxShadow: muted ? MUTED_SHADOW : CARD_SHADOW }}
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

/** The swipeable deck the sports answers deal from — flick to page
    through the cards; tap advances (or selects, when the front card is a
    doorway — every sports deck drills into its object's detail). */
function Deck<T>({
  items,
  height,
  ariaLabel,
  keyOf,
  onSelect,
  children,
}: {
  items: T[]
  height: number
  ariaLabel: string
  keyOf: (item: T) => string | number
  /** Tap on the front card (flick still pages). */
  onSelect?: (item: T, el: Element) => void
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
              if (onSelect) {
                const el = document.querySelector(`[data-deck-card="${keyOf(item)}"]`)
                if (el) onSelect(item, el)
              } else advance()
            }}
          >
            <div
              data-deck-card={keyOf(item)}
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

/** The schedule answer: the Spurs' remaining games dealt as a deck.
    Tapping the front fixture drills into that game's preview. */
function ScheduleStack({ onSelect }: { onSelect: (game: ScheduleGame, el: Element) => void }) {
  return (
    <Deck
      items={SPURS_GAMES}
      height={SCHEDULE_H}
      ariaLabel="Upcoming Spurs games"
      keyOf={(g) => g.id}
      onSelect={onSelect}
    >
      {(game, muted) => <ScheduleCard game={game} muted={muted} />}
    </Deck>
  )
}

/** The ticket answer: a marketplace's pairs dealt as a deck, the lead
    listing in front. Tapping drills into the seat-and-pay sheet. */
function ListingStack({
  listings,
  onSelect,
}: {
  listings: SeatListing[]
  onSelect: (listing: SeatListing, el: Element) => void
}) {
  return (
    <Deck
      items={listings}
      height={LISTING_H}
      ariaLabel="Ticket listings"
      keyOf={(l) => l.id}
      onSelect={onSelect}
    >
      {(listing, muted) => <SeatListingCard listing={listing} muted={muted} />}
    </Deck>
  )
}

/** The rankings answer: standings dealt as a deck, 1–10. Tapping the
    front card drills into that team's page. */
function StandingsStack({ onSelect }: { onSelect: (team: TeamStanding, el: Element) => void }) {
  return (
    <Deck
      items={STANDINGS}
      height={STANDING_H}
      ariaLabel="Western Conference standings, ranks 1 through 10"
      keyOf={(t) => t.rank}
      onSelect={onSelect}
    >
      {(team, muted) => <StandingCard team={team} muted={muted} />}
    </Deck>
  )
}

/** Assistant typing — three quiet dots while the new turn "thinks". */
function TypingDots() {
  return (
    <div className="flex h-8 w-fit items-center gap-1 rounded-full bg-black/[0.06] px-3.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink/40"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/** A ticket purchase's snapshot — taken at pay time so the keepsake
    survives the flow's own state moving on. */
type TicketExchange = {
  id: number
  game: ScheduleGame
  listing: SeatListing
  provider: TicketProvider
  quantity: number
  total: number
}

/** The confirmed keepsake — a compact ticket tossed into the thread with
    the snapshot-pile tilt (2E's ConfirmedFlightKeepsake grammar): the
    matchup and seats beside a torn stub's barcode, the seller's mark on
    the stub. */
function ConfirmedTicketKeepsake({ ex }: { ex: TicketExchange }) {
  const [home, away] = ex.game.teams
  return (
    <div className="relative mt-1 pb-2 pl-10">
      {/* Dotted stitch from the prose toward its keepsake. */}
      <svg
        aria-hidden="true"
        className="absolute top-[-4px] left-[9px]"
        width="40"
        height="52"
        viewBox="0 0 40 52"
        fill="none"
      >
        <motion.path
          d="M2 1 C 3 18, 7 34, 22 44"
          stroke="rgba(23,23,23,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="0.1 6.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
        />
      </svg>

      <motion.div
        className="relative mt-6 w-fit"
        initial={{ opacity: 0, y: 16, rotate: 0, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, rotate: -3.5, scale: 1 }}
        transition={{ type: 'spring', stiffness: 190, damping: 20, delay: 0.2 }}
      >
        <div
          className="flex w-fit items-stretch rounded-[20px] bg-white"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex flex-col justify-center gap-1.5 py-3.5 pr-4 pl-4">
            <span className="flex items-center gap-2">
              <img src={home.logo} alt="" draggable={false} className="size-5 object-contain" />
              <p className="text-[13px] font-semibold tracking-[-0.01em] whitespace-nowrap text-[#1a1c1e]">
                {home.name} vs {away.name}
              </p>
              <img src={away.logo} alt="" draggable={false} className="size-5 object-contain" />
            </span>
            <p className="text-[10.5px] whitespace-nowrap text-ink-tertiary">
              {ex.game.day} &middot; {ex.game.time} &middot; Sec {ex.listing.section} &middot; Row{' '}
              {ex.listing.row} &middot; {ex.quantity} seats
            </p>
          </div>
          {/* The stub — the seller's mark over a barcode, past a perforation. */}
          <div className="flex flex-col items-center justify-center gap-1.5 border-l-2 border-dashed border-black/15 px-3 py-2.5">
            <TicketMark provider={ex.provider} size={16} />
            <div
              aria-hidden="true"
              className="h-6 w-6"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, #1a1721 0 2px, transparent 2px 5px)',
              }}
            />
          </div>
        </div>

        {/* Corner sticker — relative time, the receipt object's voice. */}
        <motion.span
          className="absolute -top-2.5 -right-3 flex items-center gap-1.5 rounded-full bg-ink py-[7px] pr-3.5 pl-3 text-[11.5px] font-medium tracking-[0.01em] text-white shadow-[0_4px_16px_rgba(0,0,0,0.28)]"
          initial={{ opacity: 0, scale: 0.6, rotate: 12 }}
          animate={{ opacity: 1, scale: 1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.55 }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          {ex.game.day}
        </motion.span>
      </motion.div>
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

/** The drill-in stack — each entry is one detail surface, morphed open
    from the geometry that summoned it. Entries opened from inside another
    detail stack above it (z climbs two per level) and pop back on close. */
type DetailKind =
  | { kind: 'preview'; game: ScheduleGame }
  | { kind: 'center'; center: GameCenter }
  | { kind: 'team'; team: TeamStanding }
  | { kind: 'ticket'; game: ScheduleGame; listing: SeatListing; provider: TicketProvider }
type DetailEntry = DetailKind & { id: number; origin: DetailsOrigin }

export function SportsView({ title = 'Spurs Season' }: { title?: string }) {
  const [provider, setProvider] = useState<SportsProviderId>('espn')
  const [seller, setSeller] = useState<TicketProviderId>('ticketmaster')
  const sellerInfo = ticketProvider(seller)
  const listings = SEAT_LISTINGS[seller]
  const leadListing = listings[0]

  // The full results surface — which inquiry's list is open, and the pill
  // bounds it morphs from. Provider state is shared, so toggles carry
  // both ways.
  const [list, setList] = useState<{ mode: SportsListMode; origin: SportsListOrigin } | null>(
    null,
  )
  const [stack, setStack] = useState<DetailEntry[]>([])
  const detailIdRef = useRef(0)

  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'

  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setScreenEl(document.getElementById('app-screen'))
  }, [])

  /** A surface's insets from the device frame — where its morph starts. */
  const measure = (el: Element): DetailsOrigin | null => {
    if (!screenEl) return null
    const v = screenEl.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    return {
      top: b.top - v.top,
      left: b.left - v.left,
      right: v.right - b.right,
      bottom: v.bottom - b.bottom,
    }
  }

  // The list surface clip-morphs open from the tapped pill's exact bounds.
  const openList = (mode: SportsListMode) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const origin = measure(e.currentTarget)
    if (origin) setList({ mode, origin })
  }

  const push = (entry: DetailKind, el: Element) => {
    const origin = measure(el)
    if (!origin) return
    setStack((s) => [...s, { ...entry, id: ++detailIdRef.current, origin }])
  }
  const pop = (id: number) => setStack((s) => s.filter((e) => e.id !== id))

  const openPreview = (game: ScheduleGame, el: Element) => push({ kind: 'preview', game }, el)
  const openCenter = (center: GameCenter, el: Element) => push({ kind: 'center', center }, el)
  const openTeam = (team: TeamStanding, el: Element) => push({ kind: 'team', team }, el)
  const openTicket = (game: ScheduleGame, listing: SeatListing, el: Element) =>
    push({ kind: 'ticket', game, listing, provider: sellerInfo }, el)

  // ── The ticket thread (2E's mechanics, sans draft) ─────────────────────
  const [exchanges, setExchanges] = useState<TicketExchange[]>([])
  const [revealed, setRevealed] = useState(0)
  const exchangeIdRef = useRef(0)
  const revealTimerRef = useRef(0)
  useEffect(() => () => window.clearTimeout(revealTimerRef.current), [])

  /** The ticket sheet paid — the store carries the seats. Close every
      surface, append the exchange, and hand the flow a complete intent: it
      books, then blooms. */
  const startBooking = () => {
    if (!flow || stage === 'booking' || stage === 'receipt') return
    const { game, listing, provider: from } = gameBooking
    if (!game || !listing || !from) return
    setStack([])
    setList(null)
    setExchanges((xs) => [
      ...xs,
      {
        id: ++exchangeIdRef.current,
        game,
        listing,
        provider: from,
        quantity: gameBooking.quantity,
        total: gameBooking.total,
      },
    ])
    window.clearTimeout(revealTimerRef.current)
    revealTimerRef.current = window.setTimeout(
      () => setRevealed(exchangeIdRef.current),
      1100,
    )
    flow.begin(
      { date: game.day, time: game.time, party: gameBooking.quantity },
      game.id,
    )
  }

  // Keep the newest turn on screen as the thread builds (see 2C's note on
  // pinning to the scroller's own bottom over a few frames).
  const threadScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!exchanges.length) return
    const timers = [120, 420, 800].map((ms) =>
      window.setTimeout(() => {
        const el = threadScrollRef.current
        el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [exchanges.length, revealed, stage])

  const [ticketHome, ticketAway] = TICKET_GAME.teams

  return (
    <div
      ref={threadScrollRef}
      className="-mx-4 -mb-[190px] flex min-h-0 flex-col gap-7 self-stretch justify-start overflow-x-hidden overflow-y-auto px-4 pt-[84px] pb-[220px]"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Schedule inquiry → the fixture card. Tapping the front fixture
          is the doorway into that game's preview. */}
      <Exchange question="When do the Spurs play next?" delay={0}>
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">
            The Spurs host the Thunder tomorrow at {TICKET_GAME.time}
          </span>{' '}
          &mdash; Game 5, series tied 2&ndash;2, on {TICKET_GAME.tv}. Tap the game for the
          preview, or view the rest of the slate.
        </p>
        <SportsChips active={provider} onSelect={setProvider} />
        <div className="mt-1">
          <ScheduleStack onSelect={openPreview} />
        </div>
        <ViewMorePill onOpen={openList('schedule')} />
      </Exchange>

      {/* Ticket inquiry → the seat-listing deck, sourced from a
          marketplace. Tapping a listing is the doorway into buying it. */}
      <Exchange question={`Get me 2 tickets to the ${ticketHome.name} game tomorrow`} delay={0.12}>
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">
            {sellerInfo.name} has a pair together in the {TIER_LABELS[leadListing.tier].toLowerCase()}
          </span>{' '}
          &mdash; Sec {leadListing.section}, Row {leadListing.row} at ${leadListing.price} each,{' '}
          {leadListing.tags[1].toLowerCase()}. Tap a listing to see the seats, or swipe for more
          sections.
        </p>
        <TicketChips active={seller} onSelect={setSeller} />
        <div className="mt-1">
          <ListingStack
            key={seller}
            listings={listings}
            onSelect={(l, el) => openTicket(TICKET_GAME, l, el)}
          />
        </div>
      </Exchange>

      {/* Live-game inquiry → the scoreboard. */}
      <Exchange question={`How's the ${ticketHome.name} game going?`} delay={0.24}>
        <p className="text-[14px] leading-relaxed text-ink">
          It&rsquo;s close &mdash; the {ticketHome.name} trail the {ticketAway.name}{' '}
          <span className="font-semibold">
            {LIVE_GAME.home.score}&ndash;{LIVE_GAME.away.score}
          </span>{' '}
          with {LIVE_GAME.clock} left in the third. I can flag you if it comes down to the final
          minutes.
        </p>
        <SportsChips active={provider} onSelect={setProvider} />
        <div className="mt-1">
          <ScoreboardCard center={LIVE_GAME} onOpen={openCenter} />
        </div>
      </Exchange>

      {/* Final-score inquiry → the same scoreboard, gone Final. */}
      <Exchange question="Did the Spurs hold on?" delay={0.36}>
        <p className="text-[14px] leading-relaxed text-ink">
          They did &mdash;{' '}
          <span className="font-semibold">
            {ticketHome.name} {FINAL_GAME.home.score}, {ticketAway.name} {FINAL_GAME.away.score}.
          </span>{' '}
          Wembanyama went for 31 and 14 and San Antonio closed on a 14&ndash;4 run. They lead the
          series 3&ndash;2 with Game 6 Monday in Oklahoma City.
        </p>
        <SportsChips active={provider} onSelect={setProvider} />
        <div className="mt-1">
          <ScoreboardCard center={FINAL_GAME} onOpen={openCenter} />
        </div>
      </Exchange>

      {/* Rankings inquiry → the standings deck, 1–10. */}
      <Exchange question="Where are the Spurs in the standings?" delay={0.48}>
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">The Spurs hold the top seed in the West at 60&ndash;22.</span>{' '}
          Swipe through the top ten below, or tap a team for its page.
        </p>
        <SportsChips active={provider} onSelect={setProvider} />
        <div className="mt-1">
          <StandingsStack onSelect={openTeam} />
        </div>
        <ViewMorePill onOpen={openList('standings')} />
      </Exchange>

      {/* The ticket thread — each paid listing appends an exchange; the
          resolved turn keeps the ticket as history. The keepsake waits out
          the full-screen takeover: Done (dismiss) is what reveals it, so
          it animates in on the return. */}
      {exchanges.map((ex) => {
        const showAssistant = ex.id <= revealed
        const latest = ex.id === exchangeIdRef.current
        const resolved =
          showAssistant && !(latest && (stage === 'booking' || stage === 'receipt'))
        const [home, away] = ex.game.teams
        return (
          <div key={ex.id} className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="flex flex-col items-end"
            >
              <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
                Buy the Sec {ex.listing.section} seats on {ex.provider.name}
              </div>
              <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
            </motion.div>

            <div className="mt-2.5 flex flex-col gap-3">
              <AnimatePresence mode="wait" initial={false}>
                {!resolved ? (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25 }}
                  >
                    <TypingDots />
                  </motion.div>
                ) : (
                  <motion.div
                    key="receipt"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.16 } }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="flex flex-col gap-3"
                  >
                    <p className="text-[14px] leading-relaxed text-ink">
                      You&rsquo;re in &mdash;{' '}
                      <span className="font-semibold">
                        {home.name} vs {away.name}
                      </span>{' '}
                      {ex.game.day.toLowerCase() === 'tomorrow' ? 'tomorrow' : ex.game.day} at{' '}
                      {ex.game.time}, Sec {ex.listing.section}, Row {ex.listing.row}. Paid $
                      {ex.total.toLocaleString()} with Apple Pay on {ex.provider.name} &mdash; the
                      tickets are in your wallet.
                    </p>
                    <ConfirmedTicketKeepsake ex={ex} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )
      })}

      {screenEl && createPortal(<ConversationHeader title={title} />, screenEl)}

      {/* Full results — under the dock's orb; a tapped fixture drills into
          its preview, a tapped standings row into its team (the stack's
          z-30+ opens above the list's z-28). */}
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
                onSelectGame={openPreview}
                onSelectTeam={openTeam}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}

      {/* The drill-ins — one surface per stack entry, each two z-levels
          above the one that summoned it. */}
      {screenEl &&
        createPortal(
          <AnimatePresence>
            {stack.map((entry, i) => {
              const z = 30 + i * 2
              switch (entry.kind) {
                case 'preview':
                  return (
                    <GamePreviewView
                      key={entry.id}
                      game={entry.game}
                      provider={provider}
                      ticketProvider={sellerInfo}
                      origin={entry.origin}
                      z={z}
                      onClose={() => pop(entry.id)}
                      onTickets={(el) => openTicket(entry.game, leadListing, el)}
                    />
                  )
                case 'center':
                  return (
                    <GameCenterView
                      key={entry.id}
                      center={entry.center}
                      provider={provider}
                      origin={entry.origin}
                      z={z}
                      onClose={() => pop(entry.id)}
                    />
                  )
                case 'team':
                  return (
                    <TeamDetailsView
                      key={entry.id}
                      team={entry.team}
                      origin={entry.origin}
                      z={z}
                      onClose={() => pop(entry.id)}
                      onOpenGame={openPreview}
                    />
                  )
                case 'ticket':
                  return (
                    <TicketDetailsView
                      key={entry.id}
                      game={entry.game}
                      listing={entry.listing}
                      provider={entry.provider}
                      origin={entry.origin}
                      z={z}
                      onClose={() => pop(entry.id)}
                      onBooked={startBooking}
                    />
                  )
              }
            })}
          </AnimatePresence>,
          screenEl,
        )}
    </div>
  )
}
