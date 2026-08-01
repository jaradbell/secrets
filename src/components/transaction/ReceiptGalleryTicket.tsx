/**
 * 4E — Receipt objects, ticket. The keepsake direction tuned for the app:
 * heavy grotesque type instead of serif, hero art zones tearing into stub
 * field grids (DATE / CITY over SHOW / SECTION / ROW / SEAT), deep side
 * notches at the perforation, number strips and barcodes. The provider is
 * always present by logo — disc lockups on solid fields, white pills over
 * photography. Max corner smoothing throughout.
 */
import { Squircle } from '@squircle-js/react'
import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

const EASE = [0.32, 0.72, 0, 1] as const

/* ── Primitives ───────────────────────────────────────────────────────── */

function Ticket({
  index,
  style,
  children,
}: {
  index: number
  style: CSSProperties
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { delay: 0.08 * index, duration: 0.5, ease: EASE },
      }}
    >
      <div style={{ filter: 'drop-shadow(0 18px 30px rgba(14,12,17,0.3))' }}>
        <Squircle
          cornerRadius={28}
          cornerSmoothing={1}
          className="relative overflow-hidden"
          style={style}
        >
          {children}
        </Squircle>
      </div>
    </motion.div>
  )
}

/** Provider lockup — logo disc + bold name. The brand always gets a face. */
function Provider({ icon, name, sub, ink }: { icon: string; name: string; sub?: string; ink: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white">
        <img src={icon} alt="" draggable={false} className="size-7 object-cover" />
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] leading-tight font-bold" style={{ color: ink }}>
          {name}
        </span>
        {sub && (
          <span
            className="text-[10px] leading-tight tracking-[0.12em] uppercase"
            style={{ color: ink, opacity: 0.55 }}
          >
            {sub}
          </span>
        )}
      </span>
    </span>
  )
}

/** Provider pill floating over photography. */
function ProviderPill({ icon, name }: { icon: string; name: string }) {
  return (
    <span className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
      <span className="flex size-6 items-center justify-center overflow-hidden rounded-full">
        <img src={icon} alt="" draggable={false} className="size-6 object-cover" />
      </span>
      <span className="text-[12px] font-bold text-[#111]">{name}</span>
    </span>
  )
}

/** Perforation — dashed tear with deep side bites. */
function Perf({ ink }: { ink: string }) {
  return (
    <div className="relative">
      <div className="mx-7 border-t-2 border-dashed" style={{ borderColor: ink }} />
      <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-canvas" />
      <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-canvas" />
    </div>
  )
}

/** Stub field grid — caps labels over bold values, reference pattern. */
function FieldRows({
  rows,
  ink,
  labelInk,
}: {
  rows: { l: string; v: string }[][]
  ink: string
  labelInk: string
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-x-3"
          style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
        >
          {row.map((f) => (
            <div key={f.l} className="flex flex-col gap-1">
              <span className="text-[9.5px] tracking-[0.14em] uppercase" style={{ color: labelInk }}>
                {f.l}
              </span>
              <span
                className="text-[15px] leading-tight font-bold tracking-[-0.01em] whitespace-nowrap"
                style={{ color: ink }}
              >
                {f.v}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Serial number strip. */
function Serial({ value, ink }: { value: string; ink: string }) {
  return (
    <p className="text-center text-[10px] tracking-[0.2em]" style={{ color: ink }}>
      {value}
    </p>
  )
}

/** Deterministic fake barcode — widths hashed from the seed. */
function Barcode({ seed, color }: { seed: string; color: string }) {
  const bars: { x: number; w: number }[] = []
  let x = 0
  let i = 0
  while (x < 236) {
    const h = (seed.charCodeAt(i % seed.length) * 31 + i * 17) % 7
    const w = h < 3 ? 1.1 : h < 5 ? 2.2 : 3.6
    bars.push({ x, w })
    x += w + 1.6 + ((h * 13) % 3)
    i += 1
  }
  return (
    <svg viewBox="0 0 236 30" className="h-[30px] w-full" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b, j) => (
        <rect key={j} x={b.x} y={0} width={b.w} height={30} fill={color} />
      ))}
    </svg>
  )
}

/* ── The tickets ──────────────────────────────────────────────────────── */

/** Flight — the stacked-route boarding pass: SFO over EWR, giant. */
function FlightTicket({ index }: { index: number }) {
  return (
    <Ticket
      index={index}
      style={{ background: 'linear-gradient(160deg, #0A1045 0%, #16226E 55%, #2438C9 130%)' }}
    >
      <div className="flex items-center justify-between px-6 pt-5">
        <Provider icon="/providers/united.png" name="United" sub="UA 1128" ink="#ffffff" />
        <span className="text-[10px] tracking-[0.14em] text-white/55 uppercase">Boarding</span>
      </div>
      <div className="mt-4 border-t border-white/15" />

      <div className="flex flex-col items-center pt-7 pb-2">
        <span className="text-[58px] leading-none font-extrabold tracking-[-0.02em] text-white">
          SFO
        </span>
        <span className="mt-2.5 text-[9.5px] tracking-[0.22em] text-white/50 uppercase">
          San Francisco International
        </span>
      </div>

      {/* Waypoint motif + deep bites, the tear you don't tear. */}
      <div className="relative py-6">
        <div className="flex items-center justify-center gap-10">
          <span className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-white/60" />
            <span className="h-[2px] w-9 bg-white/60" />
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[2px] w-9 bg-white/60" />
            <span className="size-1 rounded-full bg-white/60" />
          </span>
        </div>
        <span className="absolute top-1/2 -left-4 size-8 -translate-y-1/2 rounded-full bg-canvas" />
        <span className="absolute top-1/2 -right-4 size-8 -translate-y-1/2 rounded-full bg-canvas" />
      </div>

      <div className="flex flex-col items-center pt-2 pb-6">
        <span className="text-[58px] leading-none font-extrabold tracking-[-0.02em] text-white">
          EWR
        </span>
        <span className="mt-2.5 text-[9.5px] tracking-[0.22em] text-white/50 uppercase">
          Newark Liberty International
        </span>
      </div>

      <div className="mx-6 border-t border-white/15" />
      <div className="grid grid-cols-4 gap-x-2 px-6 pt-4 pb-5">
        {[
          { l: 'Date', v: 'Jul 25' },
          { l: 'Gate', v: 'F13' },
          { l: 'Seat', v: '33L' },
          { l: 'Departure', v: '6:10 AM' },
        ].map((f) => (
          <div key={f.l} className="flex flex-col items-center gap-1 text-center">
            <span className="text-[9.5px] tracking-[0.14em] text-white/50 uppercase">{f.l}</span>
            <span className="text-[14px] leading-tight font-bold whitespace-nowrap text-white">
              {f.v}
            </span>
          </div>
        ))}
      </div>
    </Ticket>
  )
}

/** Dining — photo hero with display type, tearing into a dark red stub. */
function DiningTicket({ index }: { index: number }) {
  return (
    <Ticket
      index={index}
      style={{ background: 'linear-gradient(to bottom, #C22F3B, #9E232E)' }}
    >
      <div className="relative h-[230px]" style={{ background: '#2A1215' }}>
        <img
          src="/places/valette.jpg"
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
        <ProviderPill icon="/providers/opentable.svg" name="OpenTable" />
        {/* The photo dissolves into the red field. */}
        <div
          className="absolute inset-x-0 bottom-0 h-[130px]"
          style={{ background: 'linear-gradient(to top, rgba(160,29,38,0.92), transparent)' }}
        />
        <div className="absolute bottom-4 left-5">
          <p className="text-[38px] leading-none font-extrabold tracking-[-0.02em] text-white uppercase">
            Valette
          </p>
          <p className="mt-1.5 text-[10px] tracking-[0.2em] text-white/70 uppercase">
            Healdsburg, CA
          </p>
        </div>
      </div>

      <Perf ink="rgba(255,255,255,0.35)" />

      <div className="flex flex-col gap-4 px-6 pt-5 pb-5">
        <p className="text-center text-[12.5px] font-medium text-white/75">
          Dinner reservation · Table for two
        </p>
        <FieldRows
          rows={[
            [
              { l: 'Date', v: 'Sat, 25 Jul 2026' },
              { l: 'Time', v: '7:30 PM' },
            ],
            [
              { l: 'Party', v: '2' },
              { l: 'Table', v: "Chef's" },
              { l: 'Conf', v: 'VLT-8127' },
              { l: 'Cancel by', v: '5:00 PM' },
            ],
          ]}
          ink="#ffffff"
          labelInk="rgba(255,255,255,0.55)"
        />
        <Serial value="2913 8401 2987 4124" ink="rgba(255,255,255,0.5)" />
      </div>
    </Ticket>
  )
}

/** Uber's own waypoint glyphs — pin for pickup, square for destination. */
function PickupPin() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Z" fill="white" />
      <circle cx="12" cy="9" r="2.6" fill="#0B0B0B" />
    </svg>
  )
}

function DestinationSquare() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4.5" fill="white" />
      <circle cx="12" cy="12" r="2.6" fill="#0B0B0B" />
    </svg>
  )
}

/** Ride — pickup schedule up top, the app's own itinerary list as the
    centerpiece, driver at the curb. Nothing else. */
function RideTicket({ index }: { index: number }) {
  return (
    <Ticket index={index} style={{ background: '#0B0B0B' }}>
      <div className="flex items-center justify-between px-6 pt-5">
        <Provider icon="/providers/uber.png" name="Uber" sub="UberX" ink="#ffffff" />
        <span className="text-[13px] font-bold text-white">$24.80</span>
      </div>
      <div className="mt-4 border-t border-white/15" />

      {/* Live status — the driver is coming, the ETA is the headline. */}
      <div className="px-6 pt-5">
        <p className="flex items-center gap-2 text-[9.5px] tracking-[0.22em] text-white/50 uppercase">
          <motion.span
            className="size-1.5 rounded-full bg-[#4CD964]"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          Driver en route
        </p>
        <p className="mt-2 text-[26px] leading-none font-extrabold tracking-[-0.02em] text-white">
          6 min away
        </p>
        <p className="mt-1.5 text-[12px] text-white/55">Pickup at 7:12 PM</p>
      </div>

      {/* Itinerary — pin to square, annotated like the app. */}
      <div className="mx-6 mt-5 grid grid-cols-[18px_1fr] gap-x-3">
        <PickupPin />
        <div className="flex flex-col gap-0.5">
          <p className="text-[14px] leading-tight font-bold text-white">Home</p>
          <p className="text-[11.5px] leading-tight text-white/55">
            214 Center St, Healdsburg
          </p>
        </div>
        <span className="mx-auto my-1 w-[2px] self-stretch rounded-full bg-white/30 py-3" />
        <span />
        <span />
        <p className="pb-1.5 text-[12.5px] font-bold text-white">19 mins (6.2 mi) trip</p>
        <DestinationSquare />
        <div className="flex flex-col gap-0.5">
          <p className="text-[14px] leading-tight font-bold text-white">Valette</p>
          <p className="text-[11.5px] leading-tight text-white/55">
            344 Center St, Healdsburg
          </p>
        </div>
      </div>

      <div className="mt-5">
        <Perf ink="rgba(255,255,255,0.3)" />
      </div>

      {/* Driver row — avatar, name and rating, the plate as a plate. */}
      <div className="flex items-center gap-3 px-6 pt-4 pb-5">
        <img
          src="/receipts/driver.jpg"
          alt=""
          draggable={false}
          className="size-10 rounded-full object-cover ring-2 ring-white/25"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13.5px] leading-tight font-bold text-white">Marcus · 4.9 ★</span>
          <span className="truncate text-[11.5px] leading-tight text-white/55">
            Black Toyota Camry
          </span>
        </div>
        <span className="ml-auto shrink-0 rounded-[7px] border-2 border-[#0B0B0B] bg-white px-2.5 py-1 text-[13px] font-extrabold tracking-[0.1em] text-[#111] shadow-[0_0_0_2px_rgba(255,255,255,0.35)]">
          8GYT772
        </span>
      </div>
    </Ticket>
  )
}

/** Hotel — the kept element: photo hero, oval date badge, paper stub,
    barcode. Bold sans now, Expedia by logo. */
function HotelTicket({ index }: { index: number }) {
  const ink = '#232A36'
  return (
    <Ticket index={index} style={{ background: '#C9CFDA' }}>
      <div className="relative h-[210px]" style={{ background: ink }}>
        <img
          src="/receipts/photos/hotel-pool.jpg"
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
        <ProviderPill icon="/providers/expedia.png" name="Expedia" />
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 -rotate-6 rounded-full border-[1.5px] border-white/90 bg-black/30 px-3.5 py-1 text-[12px] font-bold tracking-[0.14em] whitespace-nowrap text-white uppercase backdrop-blur-[3px]">
          Jul 25 – 27
        </span>
      </div>

      <Perf ink="rgba(35,42,54,0.3)" />

      <div className="flex flex-col gap-4 px-6 pt-5 pb-5">
        <div>
          <p className="text-[21px] leading-tight font-extrabold tracking-[-0.01em]" style={{ color: ink }}>
            Hotel Healdsburg
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(35,42,54,0.62)' }}>
            Two nights · King room · Garden view
          </p>
        </div>
        <FieldRows
          rows={[
            [
              { l: 'Check-in', v: 'Jul 25' },
              { l: 'Check-out', v: 'Jul 27' },
            ],
            [
              { l: 'Room', v: 'King' },
              { l: 'Guests', v: '2' },
              { l: 'Nº', v: 'EXP-99231' },
            ],
          ]}
          ink={ink}
          labelInk="rgba(35,42,54,0.55)"
        />
        <Barcode seed="EXP-99231-HEALDSBURG-KING" color={ink} />
      </div>
    </Ticket>
  )
}

/** Tickets — team-color mono field, giant matchup type, stub grid. */
function GameTicket({ index }: { index: number }) {
  const gold = '#FDB927'
  return (
    <Ticket index={index} style={{ background: '#1D428A' }}>
      <div className="flex items-center justify-between px-6 pt-5">
        <Provider icon="/providers/ticketmaster.png" name="Ticketmaster" ink="#ffffff" />
        <span className="text-[10px] tracking-[0.14em] text-white/55 uppercase">
          Nº TM-448210
        </span>
      </div>

      <div className="px-6 pt-7 pb-6">
        <p
          className="text-[42px] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase"
          style={{ color: gold }}
        >
          Warriors
        </p>
        <p className="mt-2 text-[13px] font-bold tracking-[0.18em] text-white/55 uppercase">vs</p>
        <p className="mt-2 text-[42px] leading-[0.95] font-extrabold tracking-[-0.02em] text-white uppercase">
          Lakers
        </p>
        <p className="mt-4 text-[10px] tracking-[0.2em] text-white/60 uppercase">
          NBA Regular Season
        </p>
      </div>

      <Perf ink="rgba(255,255,255,0.3)" />

      <div className="flex flex-col gap-4 px-6 pt-5 pb-5">
        <FieldRows
          rows={[
            [
              { l: 'Date', v: 'Sat, 25 Jul 2026' },
              { l: 'City', v: 'San Francisco, CA' },
            ],
            [
              { l: 'Show', v: '7:30 PM' },
              { l: 'Section', v: '112' },
              { l: 'Row', v: '14' },
              { l: 'Seat', v: '5–6' },
            ],
          ]}
          ink="#ffffff"
          labelInk="rgba(255,255,255,0.55)"
        />
        <Serial value="2913 8401 2987 4124" ink="rgba(255,255,255,0.5)" />
      </div>
    </Ticket>
  )
}

/* ── Gallery ──────────────────────────────────────────────────────────── */

const SECTIONS: { domain: string; render: (i: number) => ReactNode }[] = [
  { domain: 'Flight · United', render: (i) => <FlightTicket index={i} /> },
  { domain: 'Dining · OpenTable', render: (i) => <DiningTicket index={i} /> },
  { domain: 'Ride · Uber', render: (i) => <RideTicket index={i} /> },
  { domain: 'Hotel · Expedia', render: (i) => <HotelTicket index={i} /> },
  { domain: 'Tickets · Ticketmaster', render: (i) => <GameTicket index={i} /> },
]

export function ReceiptGalleryTicket() {
  return (
    <div
      className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-5 pt-[calc(var(--safe-top)+18px)] pb-16"
      style={{ scrollbarWidth: 'none' }}
    >
      <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
        Receipt objects — ticket
      </h1>
      <p className="mt-1 text-[13px] text-ink-secondary">
        Hero art, stub grids, deep notches — the provider always by logo.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {SECTIONS.map(({ domain, render }, i) => (
          <section key={domain} className="flex flex-col gap-2">
            <h2 className="text-[11px] font-medium tracking-[0.06em] text-ink-tertiary uppercase">
              {domain}
            </h2>
            {render(i)}
          </section>
        ))}
      </div>
    </div>
  )
}
