/**
 * 1C — the altitude model, end to end. Two levels on one vertical axis,
 * with file surfaces as overlays:
 *
 *   Home — where the app always lands (1B's HomeStates). The notch rail
 *   cycles its states; the Files state holds every project and loose
 *   thread. Tapping the Sisters project pulls its trip file up right
 *   there; tapping "Dinner with investors" drops into its thread.
 *   Thread — the 2D transaction conversation, checkout and all. The
 *   header's collapse chevrons climb back up to the home; the island
 *   still opens the conversation's own trip file.
 *
 * A project's trip file rides the tripFileBus so the dock orb morphs into
 * the X for free (same grammar as inside a thread: any file surface up =
 * X to close). Altitude drives the shell's ambient through the ambientBus
 * — full mesh at home, composer band in a thread — so descending reads as
 * the ambient settling down behind the composer.
 */
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ambientBus } from '../shared/ambientBus'
import { tripFileBus, useTripFileOpen } from '../shared/tripFileBus'
import { ReservationProvider } from '../transaction/reservationFlow'
import { TransactionView } from '../transaction/TransactionView'
import { TripFile, type TripTask } from '../transaction/TripFile'
import { GooTransition } from '../voice/GooTransition'
import { HomeStates } from '../voice/HomeStates'
import { VoiceControl } from '../voice/VoiceControl'

/** The Sisters project's ledger as seen from the Files state — all booked,
    one loose end. (Inside the thread, TransactionView derives this from
    live flow state instead.) */
const SISTERS_TASKS: TripTask[] = [
  {
    id: 'flights',
    label: 'Book flights to SFO',
    state: 'done',
    receiptId: 'flight',
    provider: { name: 'United', icon: '/providers/united.png' },
  },
  {
    id: 'hotel',
    label: 'Reserve a hotel',
    state: 'done',
    receiptId: 'hotel',
    provider: { name: 'Expedia', icon: '/providers/expedia.png' },
  },
  {
    id: 'dinner',
    label: 'Book a dinner reservation',
    state: 'done',
    receiptId: 'dining',
    provider: { name: 'OpenTable', icon: '/providers/opentable.svg' },
  },
  { id: 'cake', label: 'Order a birthday cake', state: 'todo' },
]

export function AltitudeHome() {
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])

  const [level, setLevel] = useState<'home' | 'thread'>('home')
  const [threadTitle, setThreadTitle] = useState('Dinner with investors')

  // Drive the shell's ambient with altitude: full mesh at home, composer
  // band in a thread. The shell crossfades; clear the override on unmount.
  useEffect(() => {
    ambientBus.set(level === 'home' ? 'full' : 'composer')
  }, [level])
  useEffect(() => () => ambientBus.set(null), [])

  // The Sisters project's trip file, opened from the Files state. It rides
  // the trip-file channel (dock X, quiet hint). Never leak the flag.
  const projectOpen = useTripFileOpen()
  useEffect(() => () => tripFileBus.close(), [])

  // Altitude changes pass through the goo: a veil rises, the loader is
  // born and beats while the destination mounts underneath (the "loading
  // messages" pause), then it collapses and the veil melts away. The
  // pending target commits mid-transition via onSwap.
  const [pending, setPending] = useState<{ level: 'home' | 'thread'; title?: string } | null>(
    null,
  )

  const enterThread = (title: string) => {
    if (pending) return
    tripFileBus.close()
    setPending({ level: 'thread', title })
  }
  const collapseHome = () => {
    if (pending) return
    setPending({ level: 'home' })
  }

  return (
    <>
      {level === 'home' ? (
        <VoiceControl
          key="home"
          idleContent={
            <HomeStates
              onOpenProject={(id) => {
                if (id === 'sisters') tripFileBus.open()
                else if (id === 'investors') enterThread('Dinner with investors')
              }}
              onOpenThread={(id) =>
                enterThread(
                  id === 'gift' ? 'Gift ideas for Mom' : 'Best espresso near the office',
                )
              }
            />
          }
        />
      ) : (
        <ReservationProvider key="thread">
          <VoiceControl
            followUp="none"
            receipt={null}
            idleContent={
              <TransactionView variant="2d" title={threadTitle} onCollapse={collapseHome} />
            }
          />
        </ReservationProvider>
      )}

      {/* The liquid pause between altitudes — loader born under a veil,
          screen swapped beneath it, loader dies, veil melts. */}
      {viewport &&
        createPortal(
          pending && (
            <GooTransition
              onSwap={() => {
                if (pending.title) setThreadTitle(pending.title)
                setLevel(pending.level)
              }}
              onDone={() => setPending(null)}
            />
          ),
          viewport,
        )}

      {/* The Sisters project's trip file, pulled up over the home. */}
      {viewport &&
        level === 'home' &&
        createPortal(
          <AnimatePresence>
            {projectOpen && (
              <TripFile
                key="project"
                tasks={SISTERS_TASKS}
                onViewInThread={() => enterThread('Sisters Birthday Weekend')}
                onJumpToThread={() => enterThread('Sisters Birthday Weekend')}
                onClose={() => tripFileBus.close()}
              />
            )}
          </AnimatePresence>,
          viewport,
        )}
    </>
  )
}
