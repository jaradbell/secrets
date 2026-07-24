import { useEffect, useState, type ReactNode } from 'react'
import { MobileAppShell } from '../components/shell/MobileAppShell'
import { ReservationReceipt as ReceiptReservationReceipt } from '../components/receipt/ReservationReceipt'
import { TransactionView as ReceiptTransactionView } from '../components/receipt/TransactionView'
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
  label: string
  ambient: 'full' | 'composer'
  render: () => ReactNode
}[] = [
  {
    id: 'empty-state',
    label: 'Empty State',
    ambient: 'full',
    render: () => <VoiceControl idleContent={<EmptyState />} />,
  },
  {
    id: 'transaction',
    label: 'Transaction',
    ambient: 'composer',
    render: () => (
      <ReservationProvider>
        <VoiceControl idleContent={<TransactionView />} />
      </ReservationProvider>
    ),
  },
  {
    // 1:1 fork of Transaction (components copied to src/components/receipt/)
    // — a sandbox to build on without touching the transaction prototype.
    id: 'receipt',
    label: 'Receipt',
    ambient: 'composer',
    render: () => (
      <ReservationProvider>
        <VoiceControl receipt={ReceiptReservationReceipt} idleContent={<ReceiptTransactionView />} />
      </ReservationProvider>
    ),
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
          {PROTOTYPES.map((p, i) => {
            const isActive = p.id === active.id
            return (
              <li key={p.id}>
                <a
                  href={`#${p.id}`}
                  className={`text-[13px] transition-colors duration-150 ${
                    isActive
                      ? 'font-medium text-ink'
                      : 'text-ink-tertiary hover:text-ink-secondary'
                  }`}
                >
                  {i + 1}. {p.label}
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
