/**
 * 4D — Receipt objects, wallet. The receipt as an Apple Wallet-style pass:
 * a full-bleed brand-color field, header with the provider mark and key
 * fields, a big primary pair (the boarding-pass "SFO ✈ EWR" moment,
 * translated per domain), labeled aux fields, and a perforated stub with a
 * large scannable QR. Same transaction data as 4A–4C, maximum artifact.
 */
import { Squircle } from '@squircle-js/react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.32, 0.72, 0, 1] as const

/* ── Pass primitives ──────────────────────────────────────────────────── */

function Field({
  label,
  value,
  align = 'left',
}: {
  label: string
  value: string
  align?: 'left' | 'right'
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${align === 'right' ? 'items-end text-right' : ''}`}>
      <span className="text-[10px] font-medium tracking-[0.08em] text-white/60 uppercase">
        {label}
      </span>
      <span className="text-[14px] leading-tight font-medium text-white">{value}</span>
    </div>
  )
}

function BigValue({
  label,
  value,
  align = 'left',
}: {
  label: string
  value: string
  align?: 'left' | 'right'
}) {
  return (
    <div className={`flex flex-col gap-1 ${align === 'right' ? 'items-end text-right' : ''}`}>
      <span className="text-[10px] font-medium tracking-[0.08em] whitespace-nowrap text-white/60 uppercase">
        {label}
      </span>
      <span className="text-[27px] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap text-white">
        {value}
      </span>
    </div>
  )
}

/**
 * The pass hero: two big values with caps labels. The connector between them
 * carries meaning, so it diverges per domain — a dotted route + vehicle glyph
 * only where there's actual travel, a labeled span for durations, a "vs" mark
 * for matchups, and nothing at all when the two values aren't related as a
 * journey (dining's where/when).
 */
function PrimaryPair({
  leftLabel,
  left,
  rightLabel,
  right,
  middle,
  line = 'none',
}: {
  leftLabel: string
  left: string
  rightLabel: string
  right: string
  middle?: ReactNode
  /** Connecting line style flanking the middle node. */
  line?: 'dotted' | 'solid' | 'none'
}) {
  if (!middle) {
    return (
      <div className="flex items-end justify-between gap-4">
        <BigValue label={leftLabel} value={left} />
        <BigValue label={rightLabel} value={right} align="right" />
      </div>
    )
  }
  // Fixed-length lines so both sides of the glyph read identically.
  const lineEl =
    line === 'dotted' ? (
      <span className="w-11 border-t-2 border-dotted border-white/35" />
    ) : line === 'solid' ? (
      <span className="w-7 border-t border-white/25" />
    ) : null
  // Equal side columns keep the middle node on the card's centerline
  // regardless of how wide each value block renders.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end">
      <BigValue label={leftLabel} value={left} />
      <div className="mb-[7px] flex h-4 items-center gap-1.5 px-1">
        {lineEl}
        {middle}
        {lineEl}
      </div>
      <BigValue label={rightLabel} value={right} align="right" />
    </div>
  )
}

/** A labeled duration bridging two endpoints (check-in → check-out). */
function SpanTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-medium tracking-[0.08em] whitespace-nowrap text-white/70 uppercase">
      {label}
    </span>
  )
}

/** Matchup divider — opposition, not travel. */
function VsTag() {
  return (
    <span className="text-[13px] font-semibold tracking-[0.06em] text-white/60 uppercase">
      vs
    </span>
  )
}

type PassSpec = {
  domain: string
  /** The pass field color — full-bleed brand color, wallet style. */
  color: string
  icon: string
  name: string
  headerFields: { label: string; value: string }[]
  primary: ReactNode
  /** Rows of labeled aux fields. */
  fields: { label: string; value: string }[][]
  qr: string
  qrCaption: string
}

function WalletPass({ spec, index }: { spec: PassSpec; index: number }) {
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
          cornerRadius={20}
          cornerSmoothing={1}
          className="relative overflow-hidden"
          style={{
            background: `linear-gradient(to bottom, ${spec.color}, color-mix(in srgb, ${spec.color} 86%, black))`,
          }}
        >
          <div className="px-5 pt-4.5">
            {/* Header — provider + key fields. */}
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-white">
                  <img
                    src={spec.icon}
                    alt=""
                    draggable={false}
                    className="size-6 object-cover"
                  />
                </span>
                <span className="text-[13px] font-semibold tracking-[0.02em] text-white">
                  {spec.name}
                </span>
              </span>
              <span className="flex gap-4">
                {spec.headerFields.map((f) => (
                  <Field key={f.label} label={f.label} value={f.value} align="right" />
                ))}
              </span>
            </div>

            {/* Primary */}
            <div className="mt-5">{spec.primary}</div>

            {/* Aux fields */}
            {spec.fields.map((row, i) => (
              <div key={i} className="mt-4 flex items-start justify-between gap-3">
                {row.map((f, j) => (
                  <Field
                    key={f.label}
                    label={f.label}
                    value={f.value}
                    align={j === row.length - 1 && row.length > 1 ? 'right' : 'left'}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Perforation */}
          <div className="relative mt-4.5">
            <div className="mx-4 border-t-2 border-dashed border-white/25" />
            <span className="absolute top-1/2 -left-[9px] size-[18px] -translate-y-1/2 rounded-full bg-canvas" />
            <span className="absolute top-1/2 -right-[9px] size-[18px] -translate-y-1/2 rounded-full bg-canvas" />
          </div>

          {/* Stub — the scannable artifact. */}
          <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-5">
            <div className="rounded-[14px] bg-white p-2.5">
              <img src={spec.qr} alt="" draggable={false} className="size-[108px]" />
            </div>
            <span className="text-[10.5px] tracking-[0.04em] text-white/60">
              {spec.qrCaption}
            </span>
          </div>
        </Squircle>
      </div>
    </motion.div>
  )
}

/* ── Domain glyphs ────────────────────────────────────────────────────── */

const GLYPH = {
  plane: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.5 15.5 13.5 11V4.75a1.5 1.5 0 0 0-3 0V11l-8 4.5V17l8-2.25V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13.5 19v-4.25l8 2.25v-1.5Z" />
    </svg>
  ),
  car: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 11 6.5 6.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11a2 2 0 0 1 2 2v4h-2v1.5a1.5 1.5 0 0 1-3 0V17H8v1.5a1.5 1.5 0 0 1-3 0V17H3v-4a2 2 0 0 1 2-2Zm2.1-.5h9.8l-1-3.5H8.1l-1 3.5ZM6.5 15a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm11 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
    </svg>
  ),
}

/* ── The passes ───────────────────────────────────────────────────────── */

const PASSES: PassSpec[] = [
  {
    domain: 'Flight · United',
    color: '#0B37DA',
    icon: '/providers/united.png',
    name: 'UNITED',
    headerFields: [
      { label: 'Gate', value: 'F13' },
      { label: 'Flight', value: 'UA 1128' },
    ],
    primary: (
      <PrimaryPair
        leftLabel="San Francisco"
        left="SFO"
        rightLabel="Newark"
        right="EWR"
        middle={<span className="text-white">{GLYPH.plane}</span>}
        line="dotted"
      />
    ),
    fields: [
      [
        { label: 'Seq', value: '1' },
        { label: 'Boards', value: '6:10 AM' },
        { label: 'Seat', value: '33L' },
        { label: 'Group', value: '3' },
      ],
      [{ label: 'Passenger', value: 'BELL/JARAD' }],
    ],
    qr: '/receipts/qr-united.svg',
    qrCaption: 'Boarding pass · scan at gate',
  },
  {
    domain: 'Dining · OpenTable',
    color: '#DA3743',
    icon: '/providers/opentable.svg',
    name: 'OpenTable',
    headerFields: [{ label: 'Conf', value: '#VLT-8127' }],
    // Dining isn't a journey — the hero is where and when, no connector.
    primary: (
      <PrimaryPair leftLabel="Reservation" left="Valette" rightLabel="Time" right="7:30 PM" />
    ),
    fields: [
      [
        { label: 'Date', value: 'Sat, Jul 25' },
        { label: 'Party', value: '2 guests' },
        { label: 'Cancel by', value: '5:00 PM' },
      ],
    ],
    qr: '/receipts/qr-opentable.svg',
    qrCaption: 'Check in with the host',
  },
  {
    domain: 'Ride · Uber',
    color: '#0B0B0B',
    icon: '/providers/uber.png',
    name: 'Uber',
    headerFields: [
      { label: 'Trip', value: 'UberX' },
      { label: 'Fare', value: '$24.80' },
    ],
    primary: (
      <PrimaryPair
        leftLabel="Pickup · 7:12 PM"
        left="Home"
        rightLabel="Drop-off"
        right="Valette"
        middle={<span className="text-white">{GLYPH.car}</span>}
        line="dotted"
      />
    ),
    fields: [
      [
        { label: 'Driver', value: 'Marcus · 4.9 ★' },
        { label: 'Car', value: 'Black Camry' },
        { label: 'Plate', value: '8GYT772' },
      ],
    ],
    qr: '/receipts/qr-uber.svg',
    qrCaption: 'Show to your driver',
  },
  {
    domain: 'Hotel · Expedia',
    color: '#191E3B',
    icon: '/providers/expedia.png',
    name: 'Expedia',
    headerFields: [{ label: 'Conf', value: '#EXP-99231' }],
    // A stay is a span, not a trip — the connector says how long.
    primary: (
      <PrimaryPair
        leftLabel="Check-in"
        left="JUL 25"
        rightLabel="Check-out"
        right="JUL 27"
        middle={<SpanTag label="2 nights" />}
        line="solid"
      />
    ),
    fields: [
      [
        { label: 'Property', value: 'Hotel Healdsburg' },
        { label: 'Room', value: 'King' },
        { label: 'Guests', value: '2' },
      ],
    ],
    qr: '/receipts/qr-expedia.svg',
    qrCaption: 'Digital room key',
  },
  {
    domain: 'Tickets · Ticketmaster',
    color: '#026CDF',
    icon: '/providers/ticketmaster.png',
    name: 'Ticketmaster',
    headerFields: [{ label: 'Order', value: '#TM-448210' }],
    // A matchup is opposition, not travel — "vs", no route.
    primary: (
      <PrimaryPair
        leftLabel="Warriors"
        left="GSW"
        rightLabel="Lakers"
        right="LAL"
        middle={<VsTag />}
      />
    ),
    fields: [
      [
        { label: 'Sec', value: '112' },
        { label: 'Row', value: '14' },
        { label: 'Seats', value: '5–6' },
        { label: 'Gates', value: '6:00 PM' },
      ],
      [{ label: 'Venue', value: 'Chase Center · Sat, Jul 25 · 7:30 PM' }],
    ],
    qr: '/receipts/qr-ticketmaster.svg',
    qrCaption: 'Scan at the gate · 2 tickets',
  },
]

/* ── Gallery ──────────────────────────────────────────────────────────── */

export function ReceiptGalleryWallet() {
  return (
    <div
      className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-5 pt-[calc(var(--safe-top)+18px)] pb-16"
      style={{ scrollbarWidth: 'none' }}
    >
      <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
        Receipt objects — wallet
      </h1>
      <p className="mt-1 text-[13px] text-ink-secondary">
        The receipt as a pass: brand field, primary pair, labeled fields, perforated stub.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {PASSES.map((spec, i) => (
          <section key={spec.domain} className="flex flex-col gap-2">
            <h2 className="text-[11px] font-medium tracking-[0.06em] text-ink-tertiary uppercase">
              {spec.domain}
            </h2>
            <WalletPass spec={spec} index={i} />
          </section>
        ))}
      </div>
    </div>
  )
}
