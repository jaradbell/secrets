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
import { FlightsView } from '../components/transaction/FlightsView'
import { MatchStyleProvider } from '../components/transaction/MatchRing'
import { ReservationProvider } from '../components/transaction/reservationFlow'
import { TransactionView } from '../components/transaction/TransactionView'
import { EmptyState } from '../components/voice/EmptyState'
import { GooLoader } from '../components/voice/GooLoader'
import { GooLoaderGooey } from '../components/voice/GooLoaderGooey'
import { GooLoaderRelay } from '../components/voice/GooLoaderRelay'
import { HomeStates } from '../components/voice/HomeStates'
import { ProjectGridHome } from '../components/home/ProjectGridHome'
import { MoodboardHome } from '../components/projects/MoodboardHome'
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
      // requireConfirm: even a full-context ask lands on the draft object —
      // the summary card carries the explicit go. Carries 7E's match
      // language: rank circles + percentages instead of bare 0–100 scores.
      <MatchStyleProvider style="number-chip">
        <ReservationProvider requireConfirm>
          {/* Default receipt: booking blooms into the full-screen
              confirmation, and Done lands back on the thread where the
              resolved turn holds the final ticket. */}
          <VoiceControl
            followUp="none"
            idleContent={<TransactionView variant="2c" />}
            // The voice-edit demo: once the draft is complete, each hold on
            // the orb speaks the next line — an edit first, then the line
            // carrying the booking verb commits the reservation.
            simulatedFollowUps={['Make it 8:00 PM instead', 'Party of 4 \u2014 book it']}
          />
        </ReservationProvider>
      </MatchStyleProvider>
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
    // Projects as a moodboard — each active project is a collage cluster
    // (photos, title bubble, provider stickers) anchored by a sticky note
    // that keeps the tasks legible: open-count badge, top 2–3 inline,
    // "+N more" for the long tail. Artifacts drag and snap home. A
    // segmented control up top switches between the Assistant home and
    // the board — the board unpins and drops off on the way out.
    id: 'projects-moodboard',
    tag: '5A',
    label: 'Moodboard',
    // Both faces sit on white canvas with the mesh pooled at the base,
    // behind the dock — the collage and the ticket stack carry the color.
    ambient: 'composer',
    // MoodboardHome hosts its own VoiceControl — the board's tool notch
    // summons search into the dock's hint slot.
    render: () => <MoodboardHome />,
  },
  {
    // Three rooms under one segmented pill — Todo (the board), Do (the
    // Assistant conversation, seated center as the implicit home) and
    // Decide (where open calls gather). Starting a conversation doesn't
    // page away: the pill itself morphs into the context chip carrying
    // the new conversation's name, and the floor develops in place. The
    // draft empty state keeps 5C's ask-anything grammar.
    id: 'project-grid-ask',
    tag: '5C',
    label: 'Todo · Do · Decide',
    ambient: 'composer',
    render: () => <ProjectGridHome chrome="trio" draftVariant="ask" />,
  },
  {
    // A two-place root (Assistant + Projects) where navigation lives
    // behind a drawer: the Assistant is home, and a bare handle in the top-left
    // slides out the menu — Projects, Conversations, and Archive open the
    // board to a shelf; New project is the same door as the grid's dashed
    // tile. The mesh stays poured at the base of the frame throughout —
    // no full-mesh flood at any altitude.
    id: 'project-grid-menu',
    tag: '5E',
    label: 'Menu',
    ambient: 'composer',
    render: () => <ProjectGridHome chrome="menu" />,
  },
  {
    // LogoGoo's liquid grammar as a loading indicator — bare ink blobs
    // budding in all directions on a fast beat. The loader is born on
    // mount; tap the stage to play its death and rebirth (the full arc it
    // runs as the pause between screens — see 1C's Files → thread jump).
    id: 'goo-loader',
    tag: '6A',
    label: 'Loader',
    ambient: 'composer',
    render: () => <LoaderArcDemo />,
  },
  {
    // The storyboard variant: a peanut rotates to aim at its partner, the
    // middle lobe hands off across the gap, the new pair rotates in turn,
    // and the lobe glides home. Same ink, same goo.
    id: 'goo-loader-relay',
    tag: '6B',
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
    tag: '6C',
    label: 'Gooey',
    ambient: 'composer',
    render: () => (
      <div className="relative flex h-full flex-1 items-center justify-center">
        <GooLoaderGooey size={110} />
      </div>
    ),
  },
  // Match score explorations — the 2D checkout flow duplicated three ways.
  // The flow, data, and components are shared; MatchStyleProvider swaps how
  // the assistant's match number reads on the map POIs, the compare list,
  // and the details view's ring.
  {
    // The score language as it ships in 2D: 0–100 chips and the white ring.
    id: 'match-scores-7a',
    tag: '7A',
    label: 'Current',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="score">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // Standing instead of score: POIs and rows carry 1, 2, 3… and the
    // details ring's label picks up the rank ("#1 Match Score").
    id: 'match-scores-7b',
    tag: '7B',
    label: 'Rankings',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="rank">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // Builds on 7B: circles take a solid hue sampled off the score
    // spectrum — blue → teal → green as the match climbs (weak matches go
    // colorless) — and the details ring strokes the full spectrum along
    // its arc.
    id: 'match-scores-7c',
    tag: '7C',
    label: 'Spectrum',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="gradient">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // The standing rides the row's photo as a corner badge (the
    // roommate-list motif) — the right rail stands down; map pins keep
    // the 7B rank circles.
    id: 'match-scores-7d',
    tag: '7D',
    label: 'Photo Rank',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="photo-rank">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // A bare rank numeral with the match percentage chipped beneath it in
    // the list; map POIs go simple white pills carrying both numbers.
    id: 'match-scores-7e',
    tag: '7E',
    label: 'Number + %',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="number-chip">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // 7D's photo badge paired with a compact progress meter on the right:
    // the rank rides the thumbnail while an ink ring carries the
    // percentage. Map pins keep the rank circles.
    id: 'match-scores-7f',
    tag: '7F',
    label: 'Photo + Meter',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="photo-ring">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // Badge and meter fused: the photo's rank circle wears its match arc
    // as an outline (no rail at all), with 7E's white pill POIs on the map.
    id: 'match-scores-7g',
    tag: '7G',
    label: 'Meter Badge',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="photo-meter">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // The combo capsule (rank dot + "% match") flies as a flag above each
    // row — the flight-results grammar ("Best", "Cheapest") — with 7E's
    // white pill POIs on the map.
    id: 'match-scores-7h',
    tag: '7H',
    label: 'Flag Chip',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="chip-above">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // 7E's compact column (rank circle + quiet percentage) leads the row
    // from the LEFT of the photo — the standing reads before the identity,
    // like a numbered leaderboard — with 7E's white pill POIs on the map.
    id: 'match-scores-7i',
    tag: '7I',
    label: 'Rank Left',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="rank-left">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  {
    // 7H's capsule tucked BELOW the row's content — the deal-tag grammar
    // (grocery apps' "$25 off" chips under each store): the result reads
    // first, the standing captions it. 7E's white pill POIs on the map.
    id: 'match-scores-7j',
    tag: '7J',
    label: 'Tag Below',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="chip-below">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
  // List result variants — the suggested-object moment (stacked result in
  // conversation) and its full results surface, per domain.
  {
    // Flights: the Figma ticket (node 2331:82360) as the object class —
    // airline chips source the deck, View More morphs the full list open.
    id: 'list-results-8a',
    tag: '8A',
    label: 'Flights',
    ambient: 'composer',
    render: () => (
      <ReservationProvider>
        <VoiceControl followUp="none" receipt={null} idleContent={<FlightsView />} />
      </ReservationProvider>
    ),
  },
  {
    // Places: the current restaurant treatment for the same two surfaces —
    // the thread's frosted card stack and the Compare map + list sheet.
    id: 'list-results-8b',
    tag: '8B',
    label: 'Places',
    ambient: 'composer',
    render: () => (
      <MatchStyleProvider style="score">
        <ReservationProvider>
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={<TransactionView variant="2d" />}
          />
        </ReservationProvider>
      </MatchStyleProvider>
    ),
  },
]

const GROUP_TITLES: Record<string, string> = {
  '1': 'Home',
  '2': 'Transaction',
  '3': 'Receipt',
  '4': 'Receipt Objects',
  '5': 'Projects',
  '6': 'Goo Loader',
  '7': 'Match Scores',
  '8': 'List Result Variants',
}

/** Prototypes bucketed by the number in their tag, in registry order. */
const PROTOTYPE_GROUPS = PROTOTYPES.reduce<
  { number: string; items: typeof PROTOTYPES }[]
>((groups, prototype) => {
  const number = prototype.tag.match(/^\d+/)?.[0] ?? prototype.tag
  const current = groups.at(-1)
  if (current?.number === number) current.items.push(prototype)
  else groups.push({ number, items: [prototype] })
  return groups
}, [])

const groupOf = (tag: string) => tag.match(/^\d+/)?.[0] ?? tag

/** Tag-6 stage: tap anywhere to kill the loader and watch it be reborn. */
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
  const activeGroup = groupOf(active.tag)

  // Only the section you're in starts open; jumping by hash opens its section.
  const [openGroups, setOpenGroups] = useState<string[]>([activeGroup])
  useEffect(() => {
    setOpenGroups((open) => (open.includes(activeGroup) ? open : [...open, activeGroup]))
  }, [activeGroup])

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
        <ol className="flex max-h-[80vh] flex-col gap-1.5 overflow-y-auto">
          {PROTOTYPE_GROUPS.map(({ number, items }) => {
            const title = GROUP_TITLES[number] ?? number
            const isOpen = openGroups.includes(number)

            // A section with no lettered directions (3. Receipt) is its own
            // link — nothing to disclose.
            if (items.length === 1 && items[0].tag === number) {
              const only = items[0]
              return (
                <li key={number}>
                  <a
                    href={`#${only.id}`}
                    className={`text-[13px] transition-colors duration-150 ${
                      only.id === active.id
                        ? 'font-medium text-ink'
                        : 'text-ink-tertiary hover:text-ink-secondary'
                    }`}
                  >
                    {number}. {title}
                  </a>
                </li>
              )
            }

            return (
              <li key={number}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenGroups((open) =>
                      open.includes(number)
                        ? open.filter((n) => n !== number)
                        : [...open, number],
                    )
                  }
                  className={`flex w-full items-center gap-1 text-left text-[13px] transition-colors duration-150 ${
                    number === activeGroup
                      ? 'text-ink-secondary'
                      : 'text-ink-tertiary hover:text-ink-secondary'
                  }`}
                >
                  <svg
                    viewBox="0 0 8 8"
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  >
                    <path d="M2.5 1 6 4 2.5 7" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  {number}. {title}
                </button>
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <ol className="overflow-hidden">
                    {items.map((p, i) => (
                      <li key={p.id} className={`pl-6 ${i === 0 ? 'pt-1' : 'pt-1.5'}`}>
                        <a
                          href={`#${p.id}`}
                          tabIndex={isOpen ? undefined : -1}
                          className={`text-[13px] transition-colors duration-150 ${
                            p.id === active.id
                              ? 'font-medium text-ink'
                              : 'text-ink-tertiary hover:text-ink-secondary'
                          }`}
                        >
                          {p.tag}. {p.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
