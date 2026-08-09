/**
 * Level three of the receipt: the full sheet. Level one is the fan (glance),
 * level two the zoomed ticket (inspect + quick actions); this is "enter the
 * artifact" — everything the ticket face compresses, plus what's live.
 *
 * The surface expands from the zoomed ticket's measured bounds (clip-path
 * morph, no crossfade) with the ticket's identity persisting into the
 * header, so it reads as walking into the ticket. Anatomy, top to bottom:
 * identity header (brand field / hero photo, status), the live moment
 * (gate + boarding, driver en route, check-in window), full details grid,
 * the scannable, provider action rows, and a provenance footer — the
 * receipt knows which conversation turn produced it, and links back.
 */
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.32, 0.72, 0, 1] as const

export type SheetOrigin = { top: number; left: number; right: number; bottom: number }

const clipFrom = (o: SheetOrigin) =>
  `inset(${o.top}px ${o.right}px ${o.bottom}px ${o.left}px round 34px)`

/* ── Shared blocks ────────────────────────────────────────────────────── */

function StatusChip({ label, live = false }: { label: string; live?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10.5px] font-bold tracking-[0.08em] text-white uppercase backdrop-blur-[6px]">
      {live ? (
        <motion.span
          className="size-1.5 rounded-full bg-[#4CD964]"
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <span className="size-1.5 rounded-full bg-[#4CD964]" />
      )}
      {label}
    </span>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 text-[10.5px] font-semibold tracking-[0.14em] text-ink-tertiary uppercase">
      {children}
    </p>
  )
}

/** Label/value rows — the ticket stub's grid, given room to say everything. */
function DetailsList({ rows }: { rows: { l: string; v: string }[] }) {
  return (
    <div className="flex flex-col rounded-[20px] bg-black/[0.04]">
      {rows.map((r, i) => (
        <div
          key={r.l}
          className={`flex items-baseline justify-between gap-4 px-4.5 py-3 ${
            i > 0 ? 'border-t border-black/[0.05]' : ''
          }`}
        >
          <span className="shrink-0 text-[12px] text-ink-tertiary">{r.l}</span>
          <span className="text-right text-[13px] font-semibold text-ink">{r.v}</span>
        </div>
      ))}
    </div>
  )
}

/** The scannable — big and honest, the "hold it to the scanner" moment. */
function Scannable({ qr, code, caption }: { qr: string; code: string; caption: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] bg-black/[0.04] px-6 py-6">
      <img src={qr} alt="" draggable={false} className="size-[132px]" />
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[13px] font-bold tracking-[0.12em] text-ink">{code}</p>
        <p className="text-[11px] text-ink-tertiary">{caption}</p>
      </div>
    </div>
  )
}

/** Provider verbs, as rows now — chips are level two's language. */
function ActionRows({ actions }: { actions: string[] }) {
  return (
    <div className="flex flex-col rounded-[20px] bg-black/[0.04]">
      {actions.map((a, i) => (
        <button
          key={a}
          type="button"
          className={`flex items-center justify-between px-4.5 py-3.5 text-left outline-none transition-colors duration-150 active:bg-black/[0.04] ${
            i > 0 ? 'border-t border-black/[0.05]' : ''
          }`}
        >
          <span className="text-[13.5px] font-medium text-ink">{a}</span>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true">
            <path
              d="m1 1 4 4-4 4"
              stroke="rgba(23,23,23,0.35)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

/* ── Domain configs ───────────────────────────────────────────────────── */

type SheetConfig = {
  /** Identity header — brand field or hero photo. */
  hero: ReactNode
  /** The reason level three exists: what's live about this booking. */
  live: ReactNode
  details: { l: string; v: string }[]
  scannable?: { qr: string; code: string; caption: string }
  actions: string[]
  /** Provenance line — when the conversation produced this artifact. */
  booked: string
}

function HeroShell({
  background,
  photo,
  wash,
  provider,
  status,
  live,
  title,
  sub,
}: {
  background: string
  photo?: string
  wash?: string
  provider: { icon: string; name: string }
  status: string
  live?: boolean
  title: string
  sub: string
}) {
  return (
    <div className="relative h-[236px] shrink-0 overflow-hidden" style={{ background }}>
      {photo && (
        <img
          src={photo}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {wash && <div className="absolute inset-0" style={{ background: wash }} />}
      {/* Grabber — the sheet's handle. */}
      <span className="absolute top-2.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/40" />
      <div className="absolute inset-x-0 top-7 flex items-center justify-between px-5">
        <span className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
            <img
              src={provider.icon}
              alt=""
              draggable={false}
              className="size-8 object-contain"
            />
          </span>
          <span className="text-[14px] font-bold text-white">{provider.name}</span>
        </span>
        <StatusChip label={status} live={live} />
      </div>
      <div className="absolute bottom-5 left-5">
        <p className="text-[30px] leading-none font-extrabold tracking-[-0.02em] text-white">
          {title}
        </p>
        <p className="mt-1.5 text-[12px] font-medium text-white/70">{sub}</p>
      </div>
    </div>
  )
}

/** Flight live moment — the route with the day's specifics beneath. */
function FlightLive() {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-black/[0.04] px-4.5 pt-4.5 pb-4">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[26px] leading-none font-extrabold tracking-[-0.02em] text-ink">
            SFO
          </span>
          <span className="text-[11px] text-ink-tertiary">6:10 AM</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1.5 px-4 pb-1">
          <span className="text-[10px] font-medium tracking-[0.1em] text-ink-tertiary uppercase">
            5h 32m
          </span>
          <span className="flex w-full items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-ink" />
            <span className="h-[2px] flex-1 rounded-full bg-black/15" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(23,23,23,0.8)" aria-hidden="true">
              <path d="M21.5 15.5 13.5 11V4.75a1.5 1.5 0 0 0-3 0V11l-8 4.5V18l8-2.5v5l-2.25 1.69V24L12 23l3.75 1v-1.81L13.5 20.5v-5l8 2.5v-2.5Z" />
            </svg>
            <span className="h-[2px] flex-1 rounded-full bg-black/15" />
            <span className="size-1.5 rounded-full border-[1.5px] border-ink bg-transparent" />
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[26px] leading-none font-extrabold tracking-[-0.02em] text-ink">
            EWR
          </span>
          <span className="text-[11px] text-ink-tertiary">2:42 PM</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-black/[0.06] pt-3.5">
        {[
          { l: 'Gate', v: 'F13' },
          { l: 'Seat', v: '33L' },
          { l: 'Group', v: '2' },
          { l: 'Boards', v: '5:35 AM' },
        ].map((f) => (
          <div key={f.l} className="flex flex-col items-center gap-0.5">
            <span className="text-[9.5px] tracking-[0.12em] text-ink-tertiary uppercase">
              {f.l}
            </span>
            <span className="text-[13px] font-bold whitespace-nowrap text-ink">{f.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Ride live moment — the driver at the curb, ETA leading. */
function RideLive() {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-black/[0.04] px-4.5 pt-4.5 pb-4.5">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-ink-tertiary uppercase">
          <motion.span
            className="size-1.5 rounded-full bg-[#34c759]"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          Driver en route
        </p>
        <p className="text-[24px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
          6 min away
        </p>
        <p className="text-[12px] text-ink-tertiary">Pickup at 7:12 PM · Home</p>
      </div>
      <div className="flex items-center gap-3 border-t border-black/[0.06] pt-4">
        <img
          src="/receipts/driver.jpg"
          alt=""
          draggable={false}
          className="size-11 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13.5px] leading-tight font-bold text-ink">Marcus · 4.9 ★</span>
          <span className="truncate text-[11.5px] leading-tight text-ink-tertiary">
            Black Toyota Camry
          </span>
        </div>
        <span className="ml-auto shrink-0 rounded-[7px] border border-black/15 bg-white px-2.5 py-1 text-[13px] font-extrabold tracking-[0.1em] text-ink shadow-sm">
          8GYT772
        </span>
      </div>
    </div>
  )
}

/** Simple live moment — the when/where block for dining and hotel. */
function MomentLive({
  headline,
  sub,
  note,
}: {
  headline: string
  sub: string
  note: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[20px] bg-black/[0.04] px-4.5 py-4.5">
      <p className="text-[20px] leading-tight font-extrabold tracking-[-0.01em] text-ink">
        {headline}
      </p>
      <p className="text-[12.5px] text-ink-secondary">{sub}</p>
      <p className="mt-1.5 text-[11.5px] text-ink-tertiary">{note}</p>
    </div>
  )
}

const SHEETS: Record<string, SheetConfig> = {
  flight: {
    hero: (
      <HeroShell
        background="linear-gradient(160deg, #0A1045 0%, #16226E 55%, #2438C9 130%)"
        provider={{ icon: '/providers/united.png', name: 'United' }}
        status="On time"
        title="SFO → EWR"
        sub="Sat, Jul 25 · UA 1128 · Boeing 787-9"
      />
    ),
    live: <FlightLive />,
    details: [
      { l: 'Passenger', v: 'Jarad Bell' },
      { l: 'Confirmation', v: 'H8X4TQ' },
      { l: 'Fare', v: 'Economy Plus' },
      { l: 'Bags', v: '1 checked · 1 carry-on' },
      { l: 'Payment', v: 'Apple Pay ·· 4821 — $428.60' },
    ],
    scannable: { qr: '/receipts/qr-united.svg', code: 'H8X4TQ', caption: 'Boarding pass' },
    actions: ['Check in', 'Change seats', 'Add to Apple Wallet', 'Get help from United'],
    booked: 'Booked in this conversation · Jul 12',
  },
  hotel: {
    hero: (
      <HeroShell
        background="#232A36"
        photo="/receipts/photos/hotel-pool.jpg"
        wash="linear-gradient(to top, rgba(20,24,32,0.82), rgba(20,24,32,0.1) 55%)"
        provider={{ icon: '/providers/expedia.png', name: 'Expedia' }}
        status="Confirmed"
        title="Hotel Healdsburg"
        sub="25 Matheson St, Healdsburg, CA"
      />
    ),
    live: (
      <MomentLive
        headline="Check-in opens 3:00 PM"
        sub="Saturday, Jul 25 · through Monday, Jul 27"
        note="Two nights · King room · Garden view"
      />
    ),
    details: [
      { l: 'Guests', v: '2 adults' },
      { l: 'Room', v: 'King · Garden view' },
      { l: 'Nights', v: '2 (Jul 25 – 27)' },
      { l: 'Confirmation', v: 'EXP-99231' },
      { l: 'Rate', v: '$389 / night' },
      { l: 'Payment', v: 'Apple Pay ·· 4821 — $902.14' },
    ],
    scannable: {
      qr: '/receipts/qr-expedia.svg',
      code: 'EXP-99231',
      caption: 'Express check-in',
    },
    actions: ['Get directions', 'Modify stay', 'Message the hotel', 'Get help from Expedia'],
    booked: 'Booked in this conversation · Jul 14',
  },
  dining: {
    hero: (
      <HeroShell
        background="#2A1215"
        photo="/places/valette.jpg"
        wash="linear-gradient(to top, rgba(160,29,38,0.9), rgba(42,18,21,0.15) 60%)"
        provider={{ icon: '/providers/opentable.svg', name: 'OpenTable' }}
        status="Confirmed"
        title="Valette"
        sub="344 Center St, Healdsburg, CA"
      />
    ),
    live: (
      <MomentLive
        headline="Sat, Jul 25 · 7:30 PM"
        sub="Table for two · Chef's counter"
        note="Free to cancel until 5:00 PM day-of"
      />
    ),
    details: [
      { l: 'Party', v: '2 guests' },
      { l: 'Table', v: "Chef's counter" },
      { l: 'Confirmation', v: 'VLT-8127' },
      { l: 'Dress', v: 'Smart casual' },
      { l: 'Contact', v: '(707) 473-0946' },
    ],
    scannable: {
      qr: '/receipts/qr-opentable.svg',
      code: 'VLT-8127',
      caption: 'Show at the host stand',
    },
    actions: ['Change time', 'Modify party size', 'Add to calendar', 'Get help from OpenTable'],
    booked: 'Booked in this conversation · just now',
  },
  ride: {
    hero: (
      <HeroShell
        background="#0B0B0B"
        provider={{ icon: '/providers/uber.png', name: 'Uber' }}
        status="En route"
        live
        title="Ride to Valette"
        sub="UberX · Sat, Jul 25 · 7:12 PM pickup"
      />
    ),
    live: <RideLive />,
    details: [
      { l: 'Pickup', v: 'Home — 214 Center St' },
      { l: 'Drop-off', v: 'Valette — 344 Center St' },
      { l: 'Trip', v: '19 mins (6.2 mi)' },
      { l: 'Fare', v: 'Apple Pay ·· 4821 — $24.80' },
    ],
    actions: ['Track ride', 'Contact driver', 'Share trip status', 'Get help from Uber'],
    booked: 'Booked in this conversation · Jul 18',
  },
  // The wallet's cross-conversation artifact — booked in a different
  // thread than the Sisters trip, which its provenance line says plainly.
  game: {
    hero: (
      <HeroShell
        background="linear-gradient(160deg, #12275C 0%, #1D428A 60%, #2A5CC4 130%)"
        provider={{ icon: '/providers/ticketmaster.png', name: 'Ticketmaster' }}
        status="Confirmed"
        title="Warriors vs Lakers"
        sub="Chase Center · Sat, Jul 25 · 7:30 PM"
      />
    ),
    live: (
      <MomentLive
        headline="Doors open 6:00 PM"
        sub="Saturday, Jul 25 · tip-off 7:30 PM"
        note="Section 112 · Row 14 · Seats 5–6"
      />
    ),
    details: [
      { l: 'Section', v: '112' },
      { l: 'Row · Seats', v: '14 · 5–6' },
      { l: 'Confirmation', v: 'TM-448210' },
      { l: 'Entry', v: 'Gate B · mobile only' },
      { l: 'Payment', v: 'Apple Pay ·· 4821 — $312.40' },
    ],
    scannable: {
      qr: '/receipts/qr-ticketmaster.svg',
      code: 'TM-448210',
      caption: 'Scan at the gate',
    },
    actions: ['Transfer tickets', 'Add to Apple Wallet', 'Get help from Ticketmaster'],
    booked: 'Booked in "Warriors vs Lakers" · Jul 8',
  },
}

/* ── The sheet ────────────────────────────────────────────────────────── */

export function ReceiptSheet({
  id,
  origin,
  onDismiss,
  onViewInThread,
}: {
  id: string
  /** The zoomed ticket's bounds (viewport insets) — the morph origin. */
  origin: SheetOrigin
  onDismiss: () => void
  onViewInThread?: () => void
}) {
  const config = SHEETS[id]
  if (!config) return null

  return (
    <motion.div
      className="absolute inset-0 z-20 overflow-hidden bg-canvas"
      initial={{ clipPath: clipFrom(origin) }}
      animate={{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }}
      exit={{
        clipPath: clipFrom(origin),
        opacity: 0,
        transition: {
          clipPath: { duration: 0.4, ease: EASE },
          opacity: { duration: 0.16, delay: 0.26 },
        },
      }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div
        className="absolute inset-0 overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Header carries the ticket's identity into the sheet — drag it
            down (or tap the chevron) to step back out. */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.35 }}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (info.offset.y > 90 || info.velocity.y > 500) onDismiss()
          }}
          className="relative touch-none"
        >
          {config.hero}
          <button
            type="button"
            aria-label="Back to receipts"
            onClick={onDismiss}
            className="absolute top-2 left-1/2 flex h-8 w-16 -translate-x-1/2 items-center justify-center outline-none"
          >
            <span className="sr-only">Back to receipts</span>
          </button>
        </motion.div>

        {/* Body — develops in once the morph has mostly landed. */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.45, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="flex flex-col gap-5 px-4 pt-5 pb-[210px]"
        >
          {config.live}

          <div className="flex flex-col gap-2">
            <SectionLabel>Details</SectionLabel>
            <DetailsList rows={config.details} />
          </div>

          {config.scannable && <Scannable {...config.scannable} />}

          <div className="flex flex-col gap-2">
            <SectionLabel>Manage</SectionLabel>
            <ActionRows actions={config.actions} />
          </div>

          {/* Provenance — the artifact knows its origin story; the door
              back to the turn that produced it. */}
          <button
            type="button"
            onClick={onViewInThread}
            className="flex items-center justify-between rounded-[20px] border border-black/[0.07] px-4.5 py-4 text-left outline-none transition-colors duration-150 active:bg-black/[0.03]"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[12.5px] font-medium text-ink">{config.booked}</span>
              <span className="text-[11px] text-ink-tertiary">View the conversation turn</span>
            </span>
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true">
              <path
                d="m1 1 4 4-4 4"
                stroke="rgba(23,23,23,0.35)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </motion.div>
      </div>

      {/* Bottom scrim — content dissolves before it reaches the dock. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[170px]"
        style={{
          background:
            'linear-gradient(to top, #fcfcfc 0%, #fcfcfc 40%, rgba(252,252,252,0.8) 68%, rgba(252,252,252,0) 100%)',
        }}
      />
    </motion.div>
  )
}
