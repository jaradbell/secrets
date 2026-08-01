import { useEffect, useState, type ReactNode } from 'react'
import { MobileAppShell } from '../components/shell/MobileAppShell'
import { RECEIPT_DOCK_SUGGESTIONS } from '../components/receipt/dockSuggestions'
import { ReservationReceipt as ReceiptReservationReceipt } from '../components/receipt/ReservationReceipt'
import { TransactionView as ReceiptTransactionView } from '../components/receipt/TransactionView'
import { ReceiptGallery } from '../components/transaction/ReceiptGallery'
import { ReceiptGalleryConversation } from '../components/transaction/ReceiptGalleryConversation'
import { ReceiptGalleryExpressive } from '../components/transaction/ReceiptGalleryExpressive'
import { ReceiptGalleryTicket } from '../components/transaction/ReceiptGalleryTicket'
import { ReceiptGalleryWallet } from '../components/transaction/ReceiptGalleryWallet'
import { ReservationProvider } from '../components/transaction/reservationFlow'
import { TransactionView } from '../components/transaction/TransactionView'
import { EmptyState } from '../components/voice/EmptyState'
import { VoiceControl } from '../components/voice/VoiceControl'

/**
 * Prototype registry. Each entry renders the full screen content inside the
 * device frame — shared components (shell, background, voice control) stay
 * common, and each prototype fills the slots it cares about.
 */
const PROTOTYPES: {
  id: string
  /** Outline marker in the switcher ("1", "2A", …). */
  tag: string
  label: string
  ambient: 'full' | 'composer'
  render: () => ReactNode
}[] = [
  {
    id: 'empty-state',
    tag: '1',
    label: 'Empty State',
    ambient: 'full',
    render: () => <VoiceControl idleContent={<EmptyState />} />,
  },
  // Transaction directions — one codebase, four presentations of the
  // follow-up/confirmation moment (the flow state machine is shared).
  {
    id: 'transaction-2a',
    tag: '2A',
    label: 'Composer Transform',
    ambient: 'composer',
    render: () => (
      <ReservationProvider>
        <VoiceControl
          followUp="pill"
          receipt={null}
          idleContent={<TransactionView variant="2a" />}
        />
      </ReservationProvider>
    ),
  },
  {
    id: 'transaction-2c',
    tag: '2C',
    label: 'Return to Conversation',
    ambient: 'composer',
    render: () => (
      <ReservationProvider>
        <VoiceControl
          followUp="none"
          receipt={null}
          idleContent={<TransactionView variant="2c" />}
        />
      </ReservationProvider>
    ),
  },
  {
    id: 'transaction-2d',
    tag: '2D',
    label: 'Checkout',
    ambient: 'composer',
    render: () => (
      <ReservationProvider>
        <VoiceControl
          followUp="none"
          receipt={null}
          idleContent={<TransactionView variant="2d" />}
        />
      </ReservationProvider>
    ),
  },
  {
    // 1:1 fork of Transaction (components copied to src/components/receipt/)
    // — a sandbox to build on without touching the transaction prototype.
    id: 'receipt',
    tag: '3',
    label: 'Receipt',
    ambient: 'composer',
    render: () => (
      <ReservationProvider>
        <VoiceControl
          receipt={ReceiptReservationReceipt}
          idleContent={<ReceiptTransactionView />}
          hideHintWhenFocused
          suggestions={RECEIPT_DOCK_SUGGESTIONS}
        />
      </ReservationProvider>
    ),
  },
  // Receipt object directions — the in-thread receipt card generalized
  // across domains (dining / ride / hotel / tickets), two treatments.
  {
    id: 'receipt-objects',
    tag: '4A',
    label: 'Object Class',
    ambient: 'composer',
    render: () => <ReceiptGallery />,
  },
  {
    id: 'receipt-objects-4b',
    tag: '4B',
    label: 'Expressive',
    ambient: 'composer',
    render: () => <ReceiptGalleryExpressive />,
  },
  {
    id: 'receipt-objects-4c',
    tag: '4C',
    label: 'In Conversation',
    ambient: 'composer',
    render: () => <ReceiptGalleryConversation />,
  },
  {
    id: 'receipt-objects-4d',
    tag: '4D',
    label: 'Wallet',
    ambient: 'composer',
    render: () => <ReceiptGalleryWallet />,
  },
  {
    id: 'receipt-objects-4e',
    tag: '4E',
    label: 'Ticket',
    ambient: 'composer',
    render: () => <ReceiptGalleryTicket />,
  },
]

/** Active prototype id, synced with the URL hash so refresh/share keeps place. */
function useActivePrototype() {
  const read = () => window.location.hash.slice(1) || PROTOTYPES[0].id
  const [id, setId] = useState(read)
  useEffect(() => {
    const onHash = () => setId(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return id
}

export function App() {
  const activeId = useActivePrototype()
  const active = PROTOTYPES.find((p) => p.id === activeId) ?? PROTOTYPES[0]

  return (
    <>
      <MobileAppShell key={active.id} ambient={active.ambient}>
        {active.render()}
      </MobileAppShell>

      {/* Table of contents — prototype switcher beside the frame. */}
      <nav
        aria-label="Prototypes"
        className="fixed right-10 top-1/2 z-20 hidden -translate-y-1/2 lg:block"
      >
        <p className="mb-3 text-[11px] font-medium tracking-[0.08em] uppercase text-ink-tertiary">
          Prototypes
        </p>
        <ol className="flex flex-col gap-1.5">
          {PROTOTYPES.map((p) => {
            const isActive = p.id === active.id
            const isSub = p.tag.length > 1
            return (
              <li key={p.id} className={isSub ? 'pl-3' : ''}>
                {/* Group headings above the first lettered direction. */}
                {p.tag === '2A' && (
                  <p className="-ml-3 mb-1 text-[13px] text-ink-tertiary">2. Transaction</p>
                )}
                {p.tag === '4A' && (
                  <p className="-ml-3 mb-1 text-[13px] text-ink-tertiary">4. Receipt Objects</p>
                )}
                <a
                  href={`#${p.id}`}
                  className={`text-[13px] transition-colors duration-150 ${
                    isActive
                      ? 'font-medium text-ink'
                      : 'text-ink-tertiary hover:text-ink-secondary'
                  }`}
                >
                  {p.tag}. {p.label}
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
