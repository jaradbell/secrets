/**
 * Transaction prototype: a conversational exchange where the assistant
 * recommends one specific place. The user's ask sits in a black bubble, and
 * provider attribution chips (Yelp / Google Places / OpenTable) switch which
 * ranking — and whose branded star ratings — the card stack below presents.
 *
 * 2A morphs the dock into a follow-up pill.
 * 2C rewrites the assistant's original turn in place (stack → reservation).
 * 2D opens a checkout screen.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckoutView } from './CheckoutView'
import { ConversationHeader } from './ConversationHeader'
import { PROVIDERS, PROVIDER_RESULTS, type ProviderId, type RankedResult } from './data'
import { InlineConfirmCard } from './InlineConfirmCard'
import { PlaceCardStack } from './PlaceCardStack'
import { PlaceDetailsView, type MorphOrigin } from './PlaceDetailsView'
import { DiningTicket } from './ReceiptGalleryTicket'
import { useReservationFlow } from './reservationFlow'
import { tripFileBus, useTripFileOpen } from '../shared/tripFileBus'
import { TripFile, type TripTask } from './TripFile'

export type TransactionVariant = '2a' | '2c' | '2d'

/** Assistant typing — three quiet dots while the new thread "thinks". */
function TypingDots() {
  return (
    <div className="flex h-8 w-fit items-center gap-1 rounded-full bg-black/[0.06] px-3.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink/40"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export function ProviderChips({
  active,
  onSelect,
}: {
  active: ProviderId
  onSelect: (id: ProviderId) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {PROVIDERS.map((p) => {
        const isActive = p.id === active
        return (
          <motion.button
            key={p.id}
            type="button"
            layout
            onClick={() => onSelect(p.id)}
            aria-pressed={isActive}
            aria-label={p.name}
            className="flex items-center rounded-full border border-white/20 p-1 outline-none"
            style={{ background: 'rgba(0,0,0,0.04)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-white">
              <img
                src={p.icon}
                alt=""
                draggable={false}
                className="h-[18px] w-[18px] object-contain"
              />
            </span>
            {isActive && (
              <motion.span
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-1 flex h-8 items-center rounded-full bg-white/80 px-3 text-[12px] font-medium tracking-[0.2px] whitespace-nowrap text-ink"
              >
                {p.name}
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

export function TransactionView({
  variant = '2a',
  title = 'Sisters Birthday Weekend',
  onCollapse,
  onIslandTap,
}: {
  variant?: TransactionVariant
  /** The island's conversation name (1C threads carry their own). */
  title?: string
  /** Wires the header's collapse chevrons (1C: back up to the home). */
  onCollapse?: () => void
  /** Overrides the island tap — 5B opens the project container instead
      of the default receipts fan. */
  onIslandTap?: () => void
}) {
  const [provider, setProvider] = useState<ProviderId>('yelp')
  const [selected, setSelected] = useState<{
    result: RankedResult
    origin: MorphOrigin
  } | null>(null)
  const results = PROVIDER_RESULTS[provider]
  const starColor = PROVIDERS.find((p) => p.id === provider)!.starColor

  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'
  const confirming = stage === 'followUp' || stage === 'booking'
  // 2C: the original assistant turn rewrites itself — no second message.
  const bookingTurn = variant === '2c' && confirming
  // All variants: once booked, the turn resolves to confirmation + receipt.
  const receiptTurn = stage === 'receipt'

  // Close details the moment 2C's follow-up begins; booking lives in-thread.
  // And when any variant's booking lands, close whatever overlay carried it —
  // the confirmed thread is the destination.
  useEffect(() => {
    if ((variant === '2c' && stage === 'followUp') || stage === 'receipt') setSelected(null)
  }, [variant, stage])

  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])

  // Trip file — the island's receipts view. Close it when this prototype
  // unmounts so the flag never leaks into the next one.
  const tripOpen = useTripFileOpen()
  useEffect(() => () => tripFileBus.close(), [])

  // The trip's to-dos. State is derived, not maintained: the dinner task
  // completes itself the moment the reservation flow produces a receipt.
  const tasks = useMemo<TripTask[]>(() => {
    const opentable = PROVIDERS.find((p) => p.id === 'opentable')!
    return [
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
      stage === 'receipt'
        ? {
            id: 'dinner',
            label: 'Book the birthday dinner',
            state: 'done' as const,
            receiptId: 'dining',
            provider: { name: 'OpenTable', icon: opentable.icon },
          }
        : {
            id: 'dinner',
            label: 'Book the birthday dinner',
            state: 'active' as const,
          },
      {
        id: 'cake',
        label: 'Order a birthday cake',
        state: 'todo',
        seed: 'Order a birthday cake for Saturday',
      },
    ]
  }, [stage])

  // Tapping the in-flight task lands you back on its turn: the file tucks
  // down, and once the thread has un-blurred the turn pulses to catch the
  // eye. Timers ride a ref so a quick re-open doesn't strand a highlight.
  const [highlightTurn, setHighlightTurn] = useState(false)
  const highlightTimers = useRef<number[]>([])
  useEffect(() => () => highlightTimers.current.forEach(clearTimeout), [])
  const jumpToDinnerTurn = () => {
    tripFileBus.close()
    highlightTimers.current.forEach(clearTimeout)
    highlightTimers.current = [
      window.setTimeout(() => setHighlightTurn(true), 450),
      window.setTimeout(() => setHighlightTurn(false), 2600),
    ]
  }

  // Tapping an untouched task spawns a new thread in the project: the main
  // exchange gives way to a seeded user turn, the assistant types, then a
  // first reply lands. The breadcrumb returns to the weekend thread.
  const [sideThread, setSideThread] = useState<{ seed: string } | null>(null)
  const [sideReply, setSideReply] = useState(false)
  useEffect(() => {
    if (!sideThread) {
      setSideReply(false)
      return
    }
    const t = window.setTimeout(() => setSideReply(true), 1900)
    return () => clearTimeout(t)
  }, [sideThread])
  const startCakeThread = (task: TripTask) => {
    tripFileBus.close()
    if (task.seed) setSideThread({ seed: task.seed })
  }

  const openDetails = (result: RankedResult) => {
    const card = document.querySelector(`[data-place-card="${result.place.id}"]`)
    const thumb = document.querySelector(`[data-place-thumb="${result.place.id}"]`)
    if (!viewport || !card || !thumb) return
    const v = viewport.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    const t = thumb.getBoundingClientRect()
    setSelected({
      result,
      origin: {
        card: {
          top: c.top - v.top,
          left: c.left - v.left,
          right: v.right - c.right,
          bottom: v.bottom - c.bottom,
        },
        thumb: {
          top: t.top - v.top,
          left: t.left - v.left,
          width: t.width,
          height: t.height,
        },
        frameWidth: v.width,
      },
    })
  }

  return (
    <div className="flex w-full flex-col self-stretch justify-start pt-[84px]">
      <AnimatePresence mode="wait" initial={false}>
      {sideThread ? (
        /* A new thread in the project — spawned from an untouched to-do in
           the trip file. Seeded user turn, assistant types, first reply
           lands; the breadcrumb returns to the weekend thread. */
        <motion.div
          key="side-thread"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col"
        >
          <button
            type="button"
            onClick={() => setSideThread(null)}
            className="mb-4 flex items-center gap-1.5 self-start text-[12px] font-medium text-ink-tertiary outline-none transition-colors duration-150 active:text-ink"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m15 5-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sisters Birthday Weekend
          </button>

          <div className="flex flex-col items-end">
            <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
              {sideThread.seed}
            </div>
            <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
          </div>

          <div className="mt-2.5">
            <AnimatePresence mode="wait" initial={false}>
              {sideReply ? (
                <motion.p
                  key="reply"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  className="text-[14px] leading-relaxed text-ink"
                >
                  On it — looking at bakeries near Healdsburg that can do a Saturday pickup.
                  Does she have a favorite flavor?
                </motion.p>
              ) : (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25 }}
                >
                  <TypingDots />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : (
      <motion.div
        key="main-thread"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-col"
      >
      {/* User turn */}
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
          Birthday dinner ideas for Saturday
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>

      {/* Assistant turn — one object. In 2C, booking rewrites this turn:
          prose updates, chips leave, stack becomes the reservation module.
          X on the place row dismisses back to this pick state. A wash pulses
          over the whole turn when the trip file lands you here. */}
      <motion.div
        className="-mx-2 mt-2.5 flex flex-col gap-3.5 rounded-[20px] px-2"
        initial={false}
        animate={
          highlightTurn
            ? { backgroundColor: ['rgba(147,124,224,0.16)', 'rgba(147,124,224,0)'] }
            : { backgroundColor: 'rgba(147,124,224,0)' }
        }
        transition={{ duration: 1.9, ease: 'easeOut' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={receiptTurn ? 'confirmed' : bookingTurn ? 'reserve' : 'pick'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="text-[14px] leading-relaxed text-ink"
          >
            {receiptTurn && flow ? (
              <>
                You&rsquo;re all set —{' '}
                <span className="font-semibold">{flow.place ?? 'Valette Restaurant'}</span> is
                booked for {flow.slots.date?.split(',')[0] ?? 'Saturday'} at{' '}
                {flow.slots.time ?? '7:30 PM'}, party of {flow.slots.party ?? 2}. OpenTable sent
                the confirmation to your email.
              </>
            ) : bookingTurn ? (
              <>Here&rsquo;s your reservation — confirm the details and I&rsquo;ll book it.</>
            ) : (
              <>
                <span className="font-semibold">Valette in Healdsburg</span> is my pick — special
                without being stuffy, and close to where you&rsquo;re staying. Book it, or see the
                other options?
              </>
            )}
          </motion.p>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {receiptTurn && flow ? (
            <motion.div
              key="receipt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              className="relative mt-1 pb-2 pl-10"
            >
              {/* A dotted thread ties the confirmation prose toward its
                  keepsake — trailing off before the card, like a stitch. */}
              <svg
                aria-hidden="true"
                className="absolute top-[-4px] left-[9px]"
                width="40"
                height="52"
                viewBox="0 0 40 52"
                fill="none"
              >
                <motion.path
                  d="M2 1 C 3 18, 7 34, 22 44"
                  stroke="rgba(23,23,23,0.3)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="0.1 6.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
                />
              </svg>

              {/* The keepsake, tossed into the thread rather than set on the
                  margin — smaller, off the left edge, settling into a lazy
                  tilt (the snapshot-pile grammar, not a layout block). */}
              <motion.div
                className="relative mt-6 w-fit"
                initial={{ opacity: 0, y: 16, rotate: 0, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, rotate: -3.5, scale: 1 }}
                transition={{ type: 'spring', stiffness: 190, damping: 20, delay: 0.2 }}
              >
                {/* 4E ticket scaled down uniformly — the width is pinned to
                    the keepsake's full-size design (gallery: 393 viewport −
                    2×21 gutters) and zoom shrinks both axes together, so the
                    proportions never drift from the original typeset. The
                    hero wants the display name, so the generic suffix drops
                    ("Valette Restaurant" → "Valette"). */}
                <div style={{ zoom: 0.62, width: 351 }}>
                  <DiningTicket
                    index={0}
                    place={(flow.place ?? 'Valette Restaurant').replace(/ Restaurant$/, '')}
                    date={flow.slots.date ?? 'Saturday, Jul 25'}
                    time={flow.slots.time ?? '7:30 PM'}
                    party={flow.slots.party ?? 2}
                  />
                </div>

                {/* Corner sticker — the one thing the ticket can't say:
                    how far away the event is. Receipt objects are alive;
                    relative time is their voice (coarse while far out,
                    sharpening as it nears — "Tonight · 7:30", "In 45 min").
                    Counter-tilted, landing a beat after the ticket settles. */}
                <motion.span
                  className="absolute -top-2.5 -right-3 flex items-center gap-1.5 rounded-full bg-ink py-[7px] pr-3.5 pl-3 text-[11.5px] font-medium tracking-[0.01em] text-white shadow-[0_4px_16px_rgba(0,0,0,0.28)]"
                  initial={{ opacity: 0, scale: 0.6, rotate: 12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.55 }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7.5V12l3 2" />
                  </svg>
                  In 2 days
                </motion.span>
              </motion.div>
            </motion.div>
          ) : bookingTurn ? (
            <motion.div
              key="booking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="mt-1"
            >
              <InlineConfirmCard />
            </motion.div>
          ) : (
            <motion.div
              key="pick"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col gap-3.5"
            >
              <ProviderChips active={provider} onSelect={setProvider} />
              <div className="mt-1">
                <PlaceCardStack
                  key={provider}
                  results={results}
                  starColor={starColor}
                  onSelect={openDetails}
                />
              </div>
              <button
                type="button"
                className="mx-auto flex items-center gap-1.5 rounded-full bg-black/[0.05] px-4 py-2.5 text-[12px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
              >
                Compare restaurants
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9a9a9a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </motion.div>
      )}
      </AnimatePresence>

      {viewport &&
        createPortal(
          <ConversationHeader
            title={title}
            onIslandTap={onIslandTap ?? (() => tripFileBus.open())}
            onCollapse={onCollapse}
          />,
          viewport,
        )}

      {/* Trip file — receipts fanned + tasks listed over the blurred thread.
          Above the header (z-20), below the dock (z-40) so the orb-turned-X
          stays live. */}
      {viewport &&
        createPortal(
          <AnimatePresence>
            {tripOpen && (
              <TripFile
                tasks={tasks}
                onJumpToThread={jumpToDinnerTurn}
                onStartThread={startCakeThread}
                onViewInThread={jumpToDinnerTurn}
                onClose={() => tripFileBus.close()}
              />
            )}
          </AnimatePresence>,
          viewport,
        )}

      {viewport &&
        createPortal(
          <AnimatePresence>
            {selected && (
              <PlaceDetailsView
                key={selected.result.place.id}
                result={selected.result}
                origin={selected.origin}
                onClose={() => setSelected(null)}
              />
            )}
          </AnimatePresence>,
          viewport,
        )}

      {variant === '2d' &&
        viewport &&
        createPortal(
          <AnimatePresence>{confirming && <CheckoutView key="checkout" />}</AnimatePresence>,
          viewport,
        )}
    </div>
  )
}
