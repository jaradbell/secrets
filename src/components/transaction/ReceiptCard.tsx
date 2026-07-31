/**
 * In-thread transaction receipt — a Dynamic Island-style live activity card.
 * Once a transaction completes, the assistant's turn swaps the exploring UI
 * for this: a dark object that reads as "decided and done" against the
 * light, undecided browsing surfaces.
 *
 * The card is one recognizable object class across domains, built from three
 * zones with domain-agnostic jobs:
 *   1. Header  — who you transacted through (provider) + a reference code
 *   2. Payload — what you got (title + meta), with an optional art object
 *   3. Track   — time-to-fulfillment: a live-activity bar from done → next
 *
 * `ReceiptObject` renders any domain from a ReceiptContent config; the
 * exported `ReceiptCard` keeps the reservation flow's slot-driven usage.
 */
import { Squircle } from '@squircle-js/react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { PROVIDERS } from './data'
import type { ReservationSlots } from './reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const

/** Default accent — the emerald the dining receipt shipped with. */
const ACCENT = '#34d399'

export type ReceiptContent = {
  provider: { name: string; icon: string }
  /** Reference line, top right: confirmation no., fare, order no. */
  code: string
  /** The thing you got — place, matchup, or the moment ("Arriving in 4 min"). */
  title: string
  /** 1–2 supporting lines: details, seats, driver. */
  meta: string[]
  /** 0–1 along the fulfillment track. */
  progress: number
  /** Left track label — the settled state ("Confirmed", "En route"). */
  status: string
  /** Right track label — the next milestone ("Table at 7:30 PM"). */
  next: string
  /** 'check' for locked-in states; 'pulse' for in-motion ones. */
  statusIcon?: 'check' | 'pulse'
  /** Track + status color; defaults to emerald. Team/brand colors welcome. */
  accent?: string
  /** Optional object docked right of the payload: map thumb, QR, seat map. */
  art?: ReactNode
}

export function ReceiptObject({ content }: { content: ReceiptContent }) {
  const accent = content.accent ?? ACCENT
  const pct = Math.round(Math.min(1, Math.max(0, content.progress)) * 100)

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
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)', transition: { duration: 0.2 } }}
    >
      {/* Squircle clipping swallows box-shadow, so the shadow rides a
          drop-shadow wrapper and follows the smoothed silhouette. */}
      <div style={{ filter: 'drop-shadow(0 18px 28px rgba(14,12,17,0.32))' }}>
        <Squircle
          cornerRadius={26}
          cornerSmoothing={1}
          className="overflow-hidden px-5 pt-4.5 pb-5"
          style={{
            background:
              'radial-gradient(130% 120% at 28% 0%, #262130 0%, #17141b 58%, #0e0c11 100%)',
          }}
        >
      {/* Provider + reference */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white">
            <img
              src={content.provider.icon}
              alt=""
              draggable={false}
              className="size-7 object-contain"
            />
          </span>
          <span className="text-[12.5px] font-medium text-white/80">{content.provider.name}</span>
        </span>
        <span className="text-[11.5px] tracking-[0.06em] text-white/40">{content.code}</span>
      </div>

      {/* Payload */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[16px] font-semibold tracking-[-0.01em] text-white">
            {content.title}
          </p>
          {content.meta.map((line) => (
            <p key={line} className="text-[12.5px] text-white/55">
              {line}
            </p>
          ))}
        </div>
        {content.art && <div className="shrink-0">{content.art}</div>}
      </div>

      {/* Live-activity track: done → next milestone */}
      <div className="mt-4.5 flex flex-col gap-2">
        <div className="relative h-[3px] w-full rounded-full bg-white/[0.12]">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pct}%`, background: accent, opacity: 0.9 }}
          />
          <motion.span
            className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${pct}%`,
              background: accent,
              boxShadow: `0 0 10px ${accent}e6`,
            }}
            animate={{ scale: [1, 1.35, 1], opacity: [1, 0.75, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="absolute top-1/2 right-0 size-[5px] -translate-y-1/2 rounded-full bg-white/25" />
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span
            className="flex shrink-0 items-center gap-1.5 font-medium"
            style={{ color: accent }}
          >
            {content.statusIcon === 'pulse' ? (
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
            {content.status}
          </span>
          <span className="truncate text-white/45">{content.next}</span>
        </div>
      </div>
        </Squircle>
      </div>
    </motion.div>
  )
}

/** The reservation flow's receipt — dining content over the shared object. */
export function ReceiptCard({ place, slots }: { place: string; slots: ReservationSlots }) {
  const provider = PROVIDERS.find((p) => p.id === 'opentable')!
  const day = slots.date?.split(',')[0] ?? 'Saturday'
  const time = slots.time ?? '7:30 PM'
  const party = slots.party ?? 2

  return (
    <ReceiptObject
      content={{
        provider: { name: 'OpenTable', icon: provider.icon },
        code: '#VLT-8127',
        title: place,
        meta: [`${day} · ${time} · ${party} guests`],
        progress: 0.24,
        status: 'Confirmed',
        next: `Table at ${time} · free to cancel until 5 PM`,
      }}
    />
  )
}
