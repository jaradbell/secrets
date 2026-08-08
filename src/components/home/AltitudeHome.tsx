/**
 * 1C — the altitude model, end to end. Two levels on one vertical axis:
 *
 *   Home — where the app always lands (1B's HomeStates). The notch rail
 *   cycles its states; the Files state holds every project and loose
 *   thread. Every row is a doorway into its conversation — projects and
 *   loose threads alike drop into the 2D booking thread at its latest
 *   state.
 *   Thread — the 2D transaction conversation, checkout and all. The
 *   header's collapse chevron is plain back — it returns to the home you
 *   came from. The island still opens the conversation's own trip file.
 *
 * (The project container floor lives in 5B's grid, which demonstrates
 * grid → project home → conversation with the same history-based back.)
 *
 * Altitude drives the shell's ambient through the ambientBus — full mesh
 * at home, composer band in a thread — so descending reads as the ambient
 * settling down behind the composer.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ambientBus } from '../shared/ambientBus'
import { tripFileBus } from '../shared/tripFileBus'
import { ReservationProvider } from '../transaction/reservationFlow'
import { TransactionView } from '../transaction/TransactionView'
import { GooTransition } from '../voice/GooTransition'
import { HomeStates } from '../voice/HomeStates'
import { VoiceControl } from '../voice/VoiceControl'

/** Files-state row ids → the conversation each one opens. */
const THREAD_TITLES: Record<string, string> = {
  sisters: 'Sisters Birthday Weekend',
  investors: 'Dinner with investors',
  kyoto: 'Kyoto in the fall',
  gift: 'Gift ideas for Mom',
  espresso: 'Best espresso near the office',
}

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

  // Never leak an open trip file across altitudes (or out of the demo).
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
    tripFileBus.close()
    setPending({ level: 'home' })
  }

  return (
    <>
      {level === 'home' ? (
        <VoiceControl
          key="home"
          idleContent={
            <HomeStates
              onOpenProject={(id) => enterThread(THREAD_TITLES[id] ?? id)}
              onOpenThread={(id) => enterThread(THREAD_TITLES[id] ?? id)}
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
    </>
  )
}
