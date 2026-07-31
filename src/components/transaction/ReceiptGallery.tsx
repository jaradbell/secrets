/**
 * Receipt objects — a gallery prototype stacking the transaction receipt
 * card across domains (dining, ride, hotel, tickets) to test the design as
 * one recognizable object class. Same dark surface, header, and fulfillment
 * track everywhere; only the slots and accent change per domain.
 */
import { ReceiptObject, type ReceiptContent } from './ReceiptCard'

/** Lyft-island-style map thumbnail for the ride receipt. */
function MapThumb() {
  return (
    <div className="size-[54px] overflow-hidden rounded-[14px] border border-white/10">
      <svg viewBox="0 0 54 54" className="size-full" aria-hidden="true">
        <rect width="54" height="54" fill="#221e29" />
        <g stroke="rgba(255,255,255,0.07)" strokeWidth="1">
          <path d="M0 14h54M0 30h54M0 44h54M14 0v54M32 0v54M45 0v54" />
        </g>
        <path
          d="M9 46V29h21V13h14"
          fill="none"
          stroke="#9CC3FF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="13" r="4" fill="#9CC3FF" />
        <circle cx="9" cy="46" r="3" fill="#ffffff" />
      </svg>
    </div>
  )
}

/** Entry artifact — a real QR code on a white wallet tile. */
function QrTile({ src }: { src: string }) {
  return (
    <div className="flex size-[54px] items-center justify-center rounded-[14px] bg-white">
      <img src={src} alt="" draggable={false} className="size-[42px]" />
    </div>
  )
}

const RECEIPTS: { domain: string; content: ReceiptContent }[] = [
  {
    domain: 'Dining',
    content: {
      provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
      code: '#VLT-8127',
      title: 'Valette Restaurant',
      meta: ['Saturday · 7:30 PM · 2 guests'],
      progress: 0.24,
      status: 'Confirmed',
      next: 'Table at 7:30 PM · free to cancel until 5 PM',
    },
  },
  {
    domain: 'Ride',
    content: {
      provider: { name: 'Uber', icon: '/providers/uber.png' },
      code: 'UberX · $24.80',
      title: 'Arriving in 4 min',
      meta: ['Marcus · 4.9 ★ · Black Camry · 8GYT772'],
      progress: 0.45,
      status: 'En route',
      statusIcon: 'pulse',
      next: 'Pickup at 7:12 PM',
      accent: '#9CC3FF',
      art: <MapThumb />,
    },
  },
  {
    domain: 'Hotel',
    content: {
      provider: { name: 'Expedia', icon: '/providers/expedia.png' },
      code: '#EXP-99231',
      title: 'Hotel Healdsburg',
      meta: ['Jul 25–27 · 2 nights', 'King room · 2 guests'],
      progress: 0.12,
      status: 'Confirmed',
      next: 'Check-in Sat, 3:00 PM · free cancellation',
      accent: '#FCC72C',
      art: <QrTile src="/receipts/qr-expedia.svg" />,
    },
  },
  {
    domain: 'Tickets',
    content: {
      provider: { name: 'Ticketmaster', icon: '/providers/ticketmaster.png' },
      code: '#TM-448210',
      title: 'Warriors vs. Lakers',
      meta: ['Chase Center · Sat, Jul 25 · 7:30 PM', 'Sec 112 · Row 14 · Seats 5–6'],
      progress: 0.62,
      status: 'In hand',
      next: 'Gates at 6:00 PM',
      accent: '#FDB927',
      art: <QrTile src="/receipts/qr-ticketmaster.svg" />,
    },
  },
]

export function ReceiptGallery() {
  return (
    <div
      className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-5 pt-[calc(var(--safe-top)+18px)] pb-16"
      style={{ scrollbarWidth: 'none' }}
    >
      <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Receipt objects</h1>
      <p className="mt-1 text-[13px] text-ink-secondary">
        One object class, four domains — provider, payload, and a fulfillment track.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {RECEIPTS.map(({ domain, content }) => (
          <section key={domain} className="flex flex-col gap-2">
            <h2 className="text-[11px] font-medium tracking-[0.06em] text-ink-tertiary uppercase">
              {domain} · {content.provider.name}
            </h2>
            <ReceiptObject content={content} />
          </section>
        ))}
      </div>
    </div>
  )
}
