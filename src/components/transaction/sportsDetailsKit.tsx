/**
 * The sports drill-ins' shared chrome — what GamePreviewView,
 * GameCenterView, TeamDetailsView and TicketDetailsView compose from, so
 * the four read as one family (and as FlightDetailsView's kin):
 *
 *   DetailSurface  — the clip-morph from the tapped card's geometry onto a
 *                    full surface, a hero full-bleed up top, the rounded
 *                    sheet scrolling over it from y=196.
 *   SheetHeader    — overline + headline + the close disc.
 *   ActionChips    — the horizontal chip rail; PunchOutChip is the variant
 *                    that leaves for a provider (its mark + ↗).
 *   Banner         — the tracker's status band.
 *   ClubSplitHero  — the game's identity: both clubs' colors meeting on a
 *                    slant, logos over faded abbreviations (the game
 *                    surfaces' hero across scheduled → live → final).
 *   ClubHero       — one club's color field (the team page).
 *   Segmented      — the game center's Summary / Box score / Plays lenses.
 *   PunchOutRow    — a full-width doorway that leaves for a marketplace.
 */
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useReservationFlow } from './reservationFlow'
import { teamInfo, type ScheduleTeam } from './sportsData'

export const EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const

/** Where the morph starts: the tapped card's insets from the frame. */
export type DetailsOrigin = { top: number; right: number; bottom: number; left: number }

/** Relative luminance — dark ink on light club colors (the Spurs' silver). */
export const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6
}

export function DetailSurface({
  origin,
  z = 30,
  hero,
  children,
  radius = 32,
}: {
  origin: DetailsOrigin
  /** Stacking — each drill-in opened from another rides two above it. */
  z?: number
  hero: React.ReactNode
  children: React.ReactNode
  radius?: number
}) {
  // The details surface owns the moment — the orb stays live, hint down.
  const setHintSuppressed = useReservationFlow()?.setHintSuppressed
  useEffect(() => {
    setHintSuppressed?.(true)
    return () => setHintSuppressed?.(false)
  }, [setHintSuppressed])

  const originClip = `inset(${origin.top}px ${origin.right}px ${origin.bottom}px ${origin.left}px round ${radius}px)`

  return (
    <motion.div
      className="absolute inset-0 flex flex-col overflow-hidden bg-[#fcfcfc]"
      style={{ zIndex: z }}
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
      {/* The hero — full-bleed behind the sheet. */}
      <div className="absolute inset-x-0 top-0 h-[290px]">{hero}</div>

      {/* The sheet — rounded over the hero, scrolling its own content. */}
      <div className="relative z-[1] mt-[196px] flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white shadow-[0_-18px_50px_-20px_rgba(20,16,28,0.35)]">
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 pt-5"
          style={{ scrollbarWidth: 'none', paddingBottom: 'calc(var(--safe-bottom) + 170px)' }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  )
}

export function SheetHeader({
  overline,
  title,
  sub,
  avatar,
  onClose,
  closeLabel,
}: {
  overline: React.ReactNode
  title: React.ReactNode
  sub?: React.ReactNode
  /** A club or provider mark riding left of the type. */
  avatar?: React.ReactNode
  onClose: () => void
  closeLabel: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {avatar && (
          <span className="mt-1 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.14)]">
            {avatar}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-tertiary uppercase">
            {overline}
          </p>
          <p className="text-[20px] leading-[1.2] font-bold tracking-[-0.02em] text-ink">{title}</p>
          {sub && <p className="mt-0.5 text-[12px] text-ink-tertiary">{sub}</p>}
        </div>
      </div>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-200 ease-out active:scale-90"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 3 13 13M13 3 3 13" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export function ActionChips({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 mt-4 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
      <div className="flex w-max items-center gap-2">{children}</div>
    </div>
  )
}

export function ActionChip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 text-[12px] font-medium whitespace-nowrap text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.96]"
    >
      {icon}
      {label}
    </button>
  )
}

/** The ↗ glyph — an action that leaves for a provider's own surface. */
export function PunchOutGlyph({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  )
}

/** A chip that punches out to a provider — its mark leads, ↗ trails. */
export function PunchOutChip({
  mark,
  label,
  onClick,
}: {
  mark: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white pr-3 pl-1.5 text-[12px] font-medium whitespace-nowrap text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.96]"
    >
      {mark}
      {label}
      <PunchOutGlyph size={10} color="#9a9a9a" />
    </button>
  )
}

/** ESPN's and the NBA's marks at chip size — the league feeds the answer
    carries, riding the chips that leave for them. */
export function LeagueMark({ id, size = 24 }: { id: 'nba' | 'espn'; size?: number }) {
  return id === 'espn' ? (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#cc0000]"
      style={{ width: size, height: size }}
    >
      <img
        src="/sports/espn.svg"
        alt=""
        draggable={false}
        style={{ width: size * 0.6, filter: 'brightness(0) invert(1)' }}
      />
    </span>
  ) : (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/[0.06] bg-white"
      style={{ width: size, height: size }}
    >
      <img
        src="/sports/nba.png"
        alt=""
        draggable={false}
        className="object-contain"
        style={{ width: size * 0.7, height: size * 0.7 }}
      />
    </span>
  )
}

export function Banner({ title, sub }: { title: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="-mx-5 mt-3.5 bg-black/[0.04] px-5 py-2.5">
      <p className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">{title}</p>
      <p className="mt-0.5 text-[12.5px] text-ink-tertiary">{sub}</p>
    </div>
  )
}

/** The block headings the sheets share — a small bold title with a quiet
    trailing chevron, the flight tracker's "SDG · San Diego Intl. ›". */
export function BlockTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
      {icon}
      {children}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="m9 5 7 7-7 7" />
      </svg>
    </p>
  )
}

/** The listing sections' small bold heading (StayDetailsView's). */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-[15px] font-bold tracking-[-0.01em] text-ink">{children}</p>
}

/** One club's half of the split hero. */
function ClubHalf({ team, side }: { team: ScheduleTeam; side: 'home' | 'away' }) {
  const info = teamInfo(team.name)
  const light = isLight(info.colors[0])
  return (
    <div
      className="relative h-full flex-1 overflow-hidden"
      style={{
        background: `radial-gradient(120% 90% at ${side === 'home' ? '30%' : '70%'} 20%, ${info.colors[0]} 0%, ${info.colors[0]} 55%, ${info.colors[1]}cc 140%)`,
      }}
    >
      {/* The abbreviation, giant and faded into the field. */}
      <span
        aria-hidden="true"
        className={`absolute top-[6px] text-[128px] leading-none font-black tracking-[-0.06em] select-none ${
          side === 'home' ? 'left-[-6px]' : 'right-[-6px]'
        }`}
        style={{ color: light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.1)' }}
      >
        {info.abbr}
      </span>
      <motion.img
        src={team.logo}
        alt=""
        draggable={false}
        className="absolute top-[72px] size-[76px] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
        style={side === 'home' ? { left: 'calc(50% - 38px)' } : { right: 'calc(50% - 38px)' }}
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
      />
    </div>
  )
}

/** The game's identity — both clubs' colors meeting on a slant. */
export function ClubSplitHero({ home, away }: { home: ScheduleTeam; away: ScheduleTeam }) {
  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#17141b]">
      <div className="absolute inset-0 flex" style={{ clipPath: 'polygon(0 0, 54% 0, 46% 100%, 0 100%)' }}>
        <ClubHalf team={home} side="home" />
        <div className="h-full flex-1" />
      </div>
      <div className="absolute inset-0 flex" style={{ clipPath: 'polygon(54% 0, 100% 0, 100% 100%, 46% 100%)' }}>
        <div className="h-full flex-1" />
        <ClubHalf team={away} side="away" />
      </div>
      {/* The seam. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-[3px] bg-white/85"
        style={{ transform: 'skewX(-16deg)' }}
      />
      {/* A dim wash so the sheet's edge reads against light club colors. */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  )
}

/** One club's color field — the team page's hero. */
export function ClubHero({ name, logo }: { name: string; logo: string }) {
  const info = teamInfo(name)
  const light = isLight(info.colors[0])
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `radial-gradient(130% 100% at 20% 0%, ${info.colors[0]} 0%, ${info.colors[0]} 50%, ${info.colors[1]}dd 150%)`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[-4px] right-[-8px] text-[190px] leading-none font-black tracking-[-0.07em] select-none"
        style={{ color: light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.1)' }}
      >
        {info.abbr}
      </span>
      <motion.img
        src={logo}
        alt=""
        draggable={false}
        className="absolute top-[64px] left-6 size-[96px] object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.28)]"
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  )
}

/** The lenses control — a pill track, the active lens in ink. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mt-4 grid rounded-full bg-black/[0.05] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className="relative flex h-8 items-center justify-center rounded-full text-[12.5px] font-medium outline-none"
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-full bg-ink shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative transition-colors duration-200 ${active ? 'text-white' : 'text-ink'}`}>
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** A full-width doorway that leaves for a marketplace — its mark, the
    offer, the caption, and ↗. */
export function PunchOutRow({
  mark,
  title,
  sub,
  trailing,
  onClick,
  ariaLabel,
}: {
  mark: React.ReactNode
  title: React.ReactNode
  sub: React.ReactNode
  trailing?: React.ReactNode
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex w-full items-center gap-3 rounded-[18px] border border-black/[0.08] bg-white p-3 text-left outline-none transition-transform duration-200 ease-out active:scale-[0.985]"
    >
      {mark}
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
        <p className="truncate text-[11.5px] text-ink-tertiary">{sub}</p>
      </div>
      {trailing}
      <PunchOutGlyph size={13} color="#9a9a9a" />
    </button>
  )
}
