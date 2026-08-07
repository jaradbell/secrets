import { useEffect, useState, type ReactNode } from 'react'
import { AltitudeHome } from '../components/home/AltitudeHome'
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
import { GooLoader } from '../components/voice/GooLoader'
import { GooLoaderGooey } from '../components/voice/GooLoaderGooey'
import { GooLoaderRelay } from '../components/voice/GooLoaderRelay'
import { HomeStates } from '../components/voice/HomeStates'
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
    tag: '1A',
    label: 'Empty State',
    ambient: 'full',
    render: () => <VoiceControl idleContent={<EmptyState />} />,
  },
  {
    // The home once the user has history — upcoming receipts, active
    // projects, and connect-apps stacked on a vertical axis behind the
    // trip file's notch rail.
    id: 'home-states',
    tag: '1B',
    label: 'Returning User',
    ambient: 'full',
    render: () => <VoiceControl idleContent={<HomeStates />} />,
  },
  {
    // The altitude model end to end: 1B's home with its Files state wired
    // as doorways — a project's trip file pulls up in place, a thread row
    // drops into the 2D booking conversation. AltitudeHome overrides the
    // shell's ambient per altitude via the ambientBus.
    id: 'file-room',
    tag: '1C',
    label: 'Files',
    ambient: 'composer',
    render: () => <AltitudeHome />,
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
  {
    // LogoGoo's liquid grammar as a loading indicator — bare ink blobs
    // budding in all directions on a fast beat. The loader is born on
    // mount; tap the stage to play its death and rebirth (the full arc it
    // runs as the pause between screens — see 1C's Files → thread jump).
    id: 'goo-loader',
    tag: '5A',
    label: 'Loader',
    ambient: 'composer',
    render: () => <LoaderArcDemo />,
  },
  {
    // The storyboard variant: a peanut rotates to aim at its partner, the
    // middle lobe hands off across the gap, the new pair rotates in turn,
    // and the lobe glides home. Same ink, same goo.
    id: 'goo-loader-relay',
    tag: '5B',
    label: 'Relay',
    ambient: 'composer',
    render: () => (
      <div className="relative flex h-full flex-1 items-center justify-center">
        <GooLoaderRelay size={110} />
      </div>
    ),
  },
  {
    // Faithful take on Alexis Doreau's "Loader Gooey effect" (dribbble
    // shot 2150230) in our ink: half-turn spins over the top, the lobe
    // hops its old host on the way out, jelly squash-and-stretch all over.
    id: 'goo-loader-gooey',
    tag: '5C',
    label: 'Gooey',
    ambient: 'composer',
    render: () => (
      <div className="relative flex h-full flex-1 items-center justify-center">
        <GooLoaderGooey size={110} />
      </div>
    ),
  },
]

/** Tag-5 stage: tap anywhere to kill the loader and watch it be reborn. */
function LoaderArcDemo() {
  const [generation, setGeneration] = useState(0)
  const [exiting, setExiting] = useState(false)
  return (
    <button
      type="button"
      aria-label="Replay the loader's death and rebirth"
      className="relative flex h-full flex-1 cursor-pointer items-center justify-center"
      onClick={() => setExiting(true)}
    >
      <GooLoader
        key={generation}
        size={96}
        exiting={exiting}
        onExited={() => {
          setExiting(false)
          setGeneration((g) => g + 1)
        }}
      />
    </button>
  )
}

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
                {p.tag === '1A' && (
                  <p className="-ml-3 mb-1 text-[13px] text-ink-tertiary">1. Home</p>
                )}
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
