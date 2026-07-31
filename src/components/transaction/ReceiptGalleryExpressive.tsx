/**
 * 4B — Receipt objects, expressive. Same three-zone anatomy as 4A (provider,
 * payload, fulfillment track) but each domain earns an immersive layer:
 * dining and hotel get hero photography dissolving into the dark surface,
 * the ride gets a live map with the car traveling the route, and tickets
 * get a team-color wash with a perforated stub holding the QR. The header
 * floats over the hero as island-style chips.
 */
import { Squircle } from '@squircle-js/react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.32, 0.72, 0, 1] as const

/** Shared dark surface + entrance. Squircle clipping swallows box-shadow,
    so the shadow rides a drop-shadow wrapper (follows the silhouette). */
function Surface({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.94, filter: 'blur(10px)' }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.55, ease: EASE },
      }}
    >
      <div style={{ filter: 'drop-shadow(0 20px 32px rgba(14,12,17,0.35))' }}>
        <Squircle
          cornerRadius={28}
          cornerSmoothing={1}
          className="relative overflow-hidden"
          style={{
            background:
              'radial-gradient(130% 120% at 28% 0%, #262130 0%, #17141b 58%, #0e0c11 100%)',
          }}
        >
          {children}
        </Squircle>
      </div>
    </motion.div>
  )
}

/** Island-style header chips floating over the hero. */
function HeaderChips({ icon, name, code }: { icon: string; name: string; code: string }) {
  return (
    <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between">
      <span className="flex items-center gap-2 rounded-full bg-black/45 py-1 pr-3 pl-1 backdrop-blur-[8px]">
        <span className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-white">
          <img src={icon} alt="" draggable={false} className="size-6 object-contain" />
        </span>
        <span className="text-[12px] font-medium text-white/90">{name}</span>
      </span>
      <span className="rounded-full bg-black/45 px-3 py-1.5 text-[11px] tracking-[0.06em] text-white/60 backdrop-blur-[8px]">
        {code}
      </span>
    </div>
  )
}

/** The fulfillment track — identical bones to 4A's. */
function Track({
  progress,
  accent,
  status,
  statusIcon = 'check',
  next,
}: {
  progress: number
  accent: string
  status: string
  statusIcon?: 'check' | 'pulse'
  next: string
}) {
  const pct = Math.round(progress * 100)
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[3px] w-full rounded-full bg-white/[0.12]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: accent, opacity: 0.9 }}
        />
        <motion.span
          className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${pct}%`, background: accent, boxShadow: `0 0 10px ${accent}e6` }}
          animate={{ scale: [1, 1.35, 1], opacity: [1, 0.75, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="absolute top-1/2 right-0 size-[5px] -translate-y-1/2 rounded-full bg-white/25" />
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="flex shrink-0 items-center gap-1.5 font-medium" style={{ color: accent }}>
          {statusIcon === 'pulse' ? (
            <motion.span
              className="size-[7px] rounded-full"
              style={{ background: accent }}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12.5 10 17.5 19 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {status}
        </span>
        <span className="truncate text-white/45">{next}</span>
      </div>
    </div>
  )
}

/** Hero photo dissolving into the surface. */
function Hero({ src, height = 128 }: { src: string; height?: number }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <motion.img
        src={src}
        alt=""
        draggable={false}
        className="size-full object-cover"
        style={{
          maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
        }}
        // A slow Ken Burns drift keeps the object feeling alive.
        animate={{ scale: [1, 1.07, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

/* ── Dining ───────────────────────────────────────────────────────────── */

function DiningReceipt() {
  return (
    <Surface>
      <HeaderChips icon="/providers/opentable.svg" name="OpenTable" code="#VLT-8127" />
      <Hero src="/places/valette.jpg" />
      <div className="relative -mt-5 px-5 pb-5">
        <p className="text-[18px] font-semibold tracking-[-0.01em] text-white">
          Valette Restaurant
        </p>
        <p className="mt-1 text-[12.5px] text-white/55">Saturday · 7:30 PM · 2 guests</p>
        <div className="mt-4">
          <Track
            progress={0.24}
            accent="#34d399"
            status="Confirmed"
            next="Table at 7:30 PM · free to cancel until 5 PM"
          />
        </div>
      </div>
    </Surface>
  )
}

/* ── Ride ─────────────────────────────────────────────────────────────── */

/** Route in a 1×1 unit space; drawn into the map SVG and reused as the CSS
    motion path (scaled to the band's rendered size) for the traveling car. */
const ROUTE = 'M28 108 L28 64 L176 64 L176 30 L332 30'

function RideMap() {
  return (
    <div className="relative h-[128px] w-full overflow-hidden">
      <svg viewBox="0 0 360 128" className="absolute inset-0 size-full" aria-hidden="true">
        <rect width="360" height="128" fill="#1d1a24" />
        <g stroke="rgba(255,255,255,0.06)" strokeWidth="1.5">
          <path d="M0 30h360M0 64h360M0 98h360M28 0v128M92 0v128M176 0v128M258 0v128M332 0v128" />
        </g>
        {/* Blocks — faint city fabric. */}
        <g fill="rgba(255,255,255,0.035)">
          <rect x="102" y="8" width="60" height="44" rx="6" />
          <rect x="186" y="74" width="58" height="42" rx="6" />
          <rect x="268" y="40" width="52" height="46" rx="6" />
          <rect x="38" y="8" width="42" height="42" rx="6" />
        </g>
        <path
          d={ROUTE}
          fill="none"
          stroke="#9CC3FF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <circle cx="332" cy="30" r="6" fill="none" stroke="#9CC3FF" strokeWidth="3" />
        <circle cx="28" cy="108" r="5" fill="#ffffff" />
      </svg>
      {/* The car — travels the route on a CSS motion path. */}
      <motion.div
        className="absolute top-0 left-0 size-[14px] rounded-full border-2 border-[#1d1a24] bg-white shadow-[0_0_12px_rgba(156,195,255,0.8)]"
        style={{
          offsetPath: `path("${ROUTE}")`,
          // The SVG scales with the card; the path is in its 360×128 space,
          // so pin the band to that aspect via the wrapper below.
          offsetRotate: '0deg',
        }}
        animate={{ offsetDistance: ['0%', '100%'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(23,20,27,0.95))',
        }}
      />
    </div>
  )
}

function RideReceipt() {
  return (
    <Surface>
      <HeaderChips icon="/providers/uber.png" name="Uber" code="UberX · $24.80" />
      <RideMap />
      <div className="relative -mt-3 px-5 pb-5">
        <div className="flex items-center gap-3">
          <img
            src="/details/avatar-1.png"
            alt=""
            draggable={false}
            className="size-10 rounded-full border border-white/15 object-cover"
          />
          <div className="flex min-w-0 flex-col">
            <p className="text-[18px] font-semibold tracking-[-0.01em] text-white">
              Arriving in 4 min
            </p>
            <p className="text-[12.5px] text-white/55">
              Marcus · 4.9 ★ · Black Camry · 8GYT772
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Track
            progress={0.45}
            accent="#9CC3FF"
            status="En route"
            statusIcon="pulse"
            next="Pickup at 7:12 PM"
          />
        </div>
      </div>
    </Surface>
  )
}

/* ── Hotel ────────────────────────────────────────────────────────────── */

function HotelReceipt() {
  return (
    <Surface>
      <HeaderChips icon="/providers/expedia.png" name="Expedia" code="#EXP-99231" />
      <Hero src="/domains/travel.jpg" />
      <div className="relative -mt-5 px-5 pb-5">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[18px] font-semibold tracking-[-0.01em] text-white">
              Hotel Healdsburg
            </p>
            <p className="mt-1 text-[12.5px] text-white/55">Jul 25–27 · 2 nights · King room</p>
          </div>
          <div className="flex size-[52px] shrink-0 items-center justify-center rounded-[13px] bg-white">
            <img src="/receipts/qr-expedia.svg" alt="" draggable={false} className="size-10" />
          </div>
        </div>
        <div className="mt-4">
          <Track
            progress={0.12}
            accent="#FCC72C"
            status="Confirmed"
            next="Check-in Sat, 3:00 PM · free cancellation"
          />
        </div>
      </div>
    </Surface>
  )
}

/* ── Tickets ──────────────────────────────────────────────────────────── */

function TicketsReceipt() {
  return (
    <Surface>
      <HeaderChips icon="/providers/ticketmaster.png" name="Ticketmaster" code="#TM-448210" />
      <div className="relative">
        <Hero src="/domains/sports.jpg" height={118} />
        {/* Team-color duel wash over the hero. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(253,185,39,0.32) 0%, transparent 42%, transparent 58%, rgba(85,37,131,0.5) 100%)',
            maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
          }}
        />
      </div>
      <div className="relative -mt-4 px-5">
        <p className="text-[18px] font-semibold tracking-[-0.01em] text-white">
          <span className="text-[#FDB927]">Warriors</span>
          <span className="mx-1.5 text-white/40">vs.</span>
          <span className="text-[#B490E4]">Lakers</span>
        </p>
        <p className="mt-1 text-[12.5px] text-white/55">Chase Center · Sat, Jul 25 · 7:30 PM</p>
        <div className="mt-4">
          <Track progress={0.62} accent="#FDB927" status="In hand" next="Gates at 6:00 PM" />
        </div>
      </div>
      {/* Perforation — the stub below carries the entry artifact. */}
      <div className="relative mx-5 mt-4">
        <div className="border-t-[1.5px] border-dashed border-white/[0.14]" />
        <span className="absolute top-1/2 -left-[27px] size-4 -translate-y-1/2 rounded-full bg-canvas" />
        <span className="absolute top-1/2 -right-[27px] size-4 -translate-y-1/2 rounded-full bg-canvas" />
      </div>
      <div className="flex items-center gap-3 px-5 pt-4 pb-5">
        <div className="flex size-[46px] shrink-0 items-center justify-center rounded-[12px] bg-white">
          <img src="/receipts/qr-ticketmaster.svg" alt="" draggable={false} className="size-9" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-[12.5px] font-medium text-white/85">
            Sec 112 · Row 14 · Seats 5–6
          </p>
          <p className="truncate text-[11.5px] text-white/45">Scan at the gate · 2 tickets</p>
        </div>
        <button
          type="button"
          className="ml-auto shrink-0 rounded-full bg-white/[0.09] px-3.5 py-2 text-[11.5px] font-medium whitespace-nowrap text-white/85 outline-none transition-colors duration-150 active:bg-white/[0.16]"
        >
          Wallet
        </button>
      </div>
    </Surface>
  )
}

/* ── Gallery ──────────────────────────────────────────────────────────── */

const SECTIONS: { domain: string; card: ReactNode }[] = [
  { domain: 'Dining · OpenTable', card: <DiningReceipt /> },
  { domain: 'Ride · Uber', card: <RideReceipt /> },
  { domain: 'Hotel · Expedia', card: <HotelReceipt /> },
  { domain: 'Tickets · Ticketmaster', card: <TicketsReceipt /> },
]

export function ReceiptGalleryExpressive() {
  return (
    <div
      className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-5 pt-[calc(var(--safe-top)+18px)] pb-16"
      style={{ scrollbarWidth: 'none' }}
    >
      <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
        Receipt objects — expressive
      </h1>
      <p className="mt-1 text-[13px] text-ink-secondary">
        Same anatomy, plus an immersive layer per domain: heroes, live map, team colors, stub.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {SECTIONS.map(({ domain, card }) => (
          <section key={domain} className="flex flex-col gap-2">
            <h2 className="text-[11px] font-medium tracking-[0.06em] text-ink-tertiary uppercase">
              {domain}
            </h2>
            {card}
          </section>
        ))}
      </div>
    </div>
  )
}
