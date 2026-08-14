/**
 * Transaction prototype: a conversational exchange where the assistant
 * recommends one specific place. The user's ask sits in a black bubble, and
 * provider attribution chips (Yelp / Google Places / OpenTable) switch which
 * ranking — and whose branded star ratings — the card stack below presents.
 *
 * 2A morphs the dock into a follow-up pill.
 * 2C builds the conversation naturally: the pick turn stays, and the booking
 *    appends as new exchanges — each user input (spoken, typed, or a chip)
 *    lands as a bubble, and only the latest assistant turn carries the live
 *    draft object. Tapping the draft opens 2D's checkout sheet.
 * 2D opens a checkout screen.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckoutView } from './CheckoutView'
import { CompareView, type CompareOrigin } from './CompareView'
import { ConversationHeader } from './ConversationHeader'
import { PROVIDERS, PROVIDER_RESULTS, type ProviderId, type RankedResult } from './data'
import { CancelledDraftArtifact, DraftReservationCard } from './DraftReservationCard'
import { PlaceCardStack } from './PlaceCardStack'
import { PlaceDetailsView, type MorphOrigin } from './PlaceDetailsView'
import { DiningTicket } from './ReceiptGalleryTicket'
import {
  parseReservationUtterance,
  useReservationFlow,
  type ReservationSlots,
} from './reservationFlow'
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

/** How a 2C exchange resolved once the flow moved past it — snapshotted so
    the thread keeps honest history while new bookings append below. */
type ExchangeResolution =
  | { kind: 'cancelled'; place: string }
  | { kind: 'receipt'; place: string; slots: ReservationSlots }

/** One appended exchange in 2C's booking thread — the user's words and the
    assistant's reply, snapshotted at the moment they landed. */
type BookingExchange = {
  id: number
  user: string
  assistant: string
  resolution?: ExchangeResolution
}

/** The assistant's side of a draft turn, written from the slots' state. */
function draftAssistantText(place: string, slots: ReservationSlots, isUpdate: boolean) {
  const day = (slots.date ?? 'Saturday, Jul 25').split(',')[0]
  const ready = !!slots.time && !!slots.party
  if (!ready) {
    if (!slots.time && !slots.party)
      return `Happy to book ${place} — here's the draft. What time, and how many of you? You can also tap the card to fill it in.`
    if (!slots.time) return `Party of ${slots.party} — got it. What time should I put down?`
    return `${slots.time} — got it. How many should I book for?`
  }
  return isUpdate
    ? `Updated — ${day} at ${slots.time}, party of ${slots.party}. Confirm and I'll book it.`
    : `Here's your draft — ${day} at ${slots.time} for ${slots.party}. Confirm and I'll book it, or tap the card to adjust anything.`
}

/** The confirmed keepsake — dotted stitch, tilted 4E ticket, time sticker.
    Shared by the rewrite variants (2A/2D) and 2C's appended thread. */
function ConfirmedReceipt({
  place,
  slots,
}: {
  place: string
  slots: ReservationSlots
}) {
  return (
    <div className="relative mt-1 pb-2 pl-10">
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
            place={place.replace(/ Restaurant$/, '')}
            date={slots.date ?? 'Saturday, Jul 25'}
            time={slots.time ?? '7:30 PM'}
            party={slots.party ?? 2}
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
  // Compare — the map + list surface, morphed open from the Compare pill.
  // Provider state is shared with the thread, so toggles carry both ways.
  const [compare, setCompare] = useState<CompareOrigin | null>(null)
  const results = PROVIDER_RESULTS[provider]
  const starColor = PROVIDERS.find((p) => p.id === provider)!.starColor

  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'
  const confirming = stage === 'followUp' || stage === 'booking'
  // 2A/2D: once booked, the original turn resolves to confirmation + receipt.
  // 2C never rewrites that turn — the booking appends to the thread instead.
  const receiptTurn = stage === 'receipt'

  // Close details the moment a 2C intent begins; booking lives in-thread
  // (compare closes too — the appended draft is the destination). Keyed on
  // beginCount as well as stage: a re-begin mid-follow-up (or after a
  // receipt) never passes through 'none', but should still close the sheet.
  // And when any variant's booking lands, close whatever overlay carried it.
  useEffect(() => {
    if ((variant === '2c' && stage === 'followUp') || stage === 'receipt') setSelected(null)
    if ((variant === '2c' && stage === 'followUp') || stage === 'receipt') setCompare(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, stage, flow?.beginCount])

  // ── 2C's booking thread ────────────────────────────────────────────────
  // Each conversational input appends an exchange; the rule is that only
  // the LATEST assistant turn carries the live result object (draft card,
  // then the confirmed ticket) — earlier turns keep just their prose.
  const [exchanges, setExchanges] = useState<BookingExchange[]>([])
  // How many exchanges have their assistant reply revealed — the newest one
  // shows typing dots for a beat before its reply (and object) develop in.
  const [revealed, setRevealed] = useState(0)
  const exchangeIdRef = useRef(0)
  const revealTimerRef = useRef(0)
  useEffect(() => () => window.clearTimeout(revealTimerRef.current), [])

  const appendExchange = (user: string, assistant: string) => {
    setExchanges((xs) => {
      const next = [...xs, { id: ++exchangeIdRef.current, user, assistant }]
      window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = window.setTimeout(() => setRevealed(next.length), 1100)
      return next
    })
  }

  /** Stamp how an exchange ended — its object hardens into history. */
  const resolveExchange = (id: number, resolution: ExchangeResolution) =>
    setExchanges((xs) => xs.map((x) => (x.id === id ? { ...x, resolution } : x)))

  // Every begin() opens a new exchange — keyed on the flow's beginCount, not
  // stage transitions, because a fresh intent can arrive mid-follow-up (a
  // different place) or after a receipt (booking again) without the stage
  // ever visiting 'none'. Dismissal never clears the thread: a cancelled
  // draft leaves its artifact and later bookings append below.
  const seenBeginRef = useRef(0)
  useEffect(() => {
    if (variant !== '2c' || !flow) return
    if (flow.beginCount <= seenBeginRef.current) return
    seenBeginRef.current = flow.beginCount
    const place = flow.place ?? 'Valette Restaurant'
    const s = flow.slots
    const bits = `${s.date ? ` on ${s.date.split(',')[0]}` : ''}${
      s.time ? ` at ${s.time}` : ''
    }${s.party ? ` for ${s.party}` : ''}`
    appendExchange(`Book a table at ${place}${bits}`, draftAssistantText(place, s, false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow?.beginCount, variant])

  // A landed booking resolves the newest exchange into its receipt — place
  // and slots snapshotted, so the keepsake survives later bookings (and the
  // flow's own state moving on).
  useEffect(() => {
    if (variant !== '2c' || !flow || stage !== 'receipt') return
    setExchanges((xs) => {
      const last = xs[xs.length - 1]
      if (!last || last.resolution) return xs
      return [
        ...xs.slice(0, -1),
        {
          ...last,
          resolution: {
            kind: 'receipt',
            place: flow.place ?? 'Valette Restaurant',
            slots: { ...flow.slots },
          },
        },
      ]
    })
  }, [variant, stage, flow])

  // Conversational updates — spoken or typed words that reached the flow.
  // Each one that actually changes the draft appends a fresh exchange (the
  // previous object hides; the new reply carries the updated one). Direct
  // edits in the checkout sheet never land here: they mutate the same
  // draft in place, no new turn.
  const seenUtteranceRef = useRef(0)
  useEffect(() => {
    if (variant !== '2c' || !flow || !flow.utterances.length) return
    const fresh = flow.utterances.filter((u) => u.id > seenUtteranceRef.current)
    if (!fresh.length) return
    seenUtteranceRef.current = fresh[fresh.length - 1].id
    if (!exchanges.length) return
    const place = flow.place ?? 'Valette Restaurant'
    for (const u of fresh) {
      const parsed = parseReservationUtterance(u.text)
      if (!parsed.date && !parsed.time && !parsed.party) continue
      // An utterance can carry the booking verb along with its edits —
      // the flow is already mid-booking by the time we write the reply.
      const assistant =
        flow.stage === 'booking'
          ? `On it — booking ${place} for ${(flow.slots.date ?? 'Saturday, Jul 25').split(',')[0]} at ${flow.slots.time}, party of ${flow.slots.party}.`
          : draftAssistantText(place, flow.slots, true)
      appendExchange(u.text, assistant)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow?.utterances, variant])

  // Keep the newest turn on screen as the thread builds. The scroll pins to
  // the container's own bottom (scrollIntoView proved flaky against the
  // objects' entrance springs), re-asserting over a few frames so the turn
  // stays put while its card is still growing into its layout height.
  const threadScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (variant !== '2c' || !exchanges.length) return
    const timers = [120, 420, 800].map((ms) =>
      window.setTimeout(() => {
        const el = threadScrollRef.current
        el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [variant, exchanges.length, revealed, receiptTurn])

  // Portal target for the thread's overlays (header, trip file, details,
  // checkout). They land on #app-screen — inside the screen's own
  // stacking context — so the dock's z-40 orb stays above them; a
  // #app-viewport portal would paint over the whole screen, dock and all
  // (the screen went `isolate` for 5E's card move). Same box at rest, so
  // morph-origin measurements still line up.
  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setScreenEl(document.getElementById('app-screen'))
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

  // The details morph needs its origin geometry (card + photo rects). The
  // thread's stack finds them by data attribute; the compare sheet passes
  // its own row elements directly.
  const openDetailsFrom = (result: RankedResult, card: Element, thumb: Element) => {
    if (!screenEl) return
    const v = screenEl.getBoundingClientRect()
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

  const openDetails = (result: RankedResult) => {
    const card = document.querySelector(`[data-place-card="${result.place.id}"]`)
    const thumb = document.querySelector(`[data-place-thumb="${result.place.id}"]`)
    if (card && thumb) openDetailsFrom(result, card, thumb)
  }

  return (
    // The thread scrolls once the appended exchanges outgrow the frame; the
    // dock below stays pinned (it's a sibling of this content slot).
    // -mx-4/px-4: the scroller bleeds to the device frame's edges and keeps
    // the column via its own padding. Overflow clips at the padding box, so
    // wide soft layers (the card stack's ambient wash) can paint across the
    // gutters and run off the frame instead of being cut at the column edge.
    // -mb/pb pair: the scroller also bleeds beneath the dock, so scrolled
    // content rides under the progressive-blur scrim and melts out there
    // instead of hard-clipping at the dock's top edge.
    <div
      ref={threadScrollRef}
      className="-mx-4 -mb-[190px] flex min-h-0 flex-col self-stretch justify-start overflow-x-hidden overflow-y-auto px-4 pt-[84px] pb-[220px]"
      style={{ scrollbarWidth: 'none' }}
    >
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
            key={receiptTurn && variant !== '2c' ? 'confirmed' : 'pick'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="text-[14px] leading-relaxed text-ink"
          >
            {receiptTurn && flow && variant !== '2c' ? (
              <>
                You&rsquo;re all set —{' '}
                <span className="font-semibold">{flow.place ?? 'Valette Restaurant'}</span> is
                booked for {flow.slots.date?.split(',')[0] ?? 'Saturday'} at{' '}
                {flow.slots.time ?? '7:30 PM'}, party of {flow.slots.party ?? 2}. OpenTable sent
                the confirmation to your email.
              </>
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
          {receiptTurn && flow && variant !== '2c' ? (
            <motion.div
              key="receipt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
            >
              <ConfirmedReceipt place={flow.place ?? 'Valette Restaurant'} slots={flow.slots} />
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
                onClick={(e) => {
                  if (!screenEl) return
                  // The compare surface clip-morphs open from this pill's
                  // exact bounds, measured against the device frame.
                  const v = screenEl.getBoundingClientRect()
                  const b = e.currentTarget.getBoundingClientRect()
                  setCompare({
                    top: b.top - v.top,
                    left: b.left - v.left,
                    right: v.right - b.right,
                    bottom: v.bottom - b.bottom,
                  })
                }}
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

      {/* 2C's booking thread — the conversation builds naturally below the
          pick turn. Every conversational input lands as a user bubble; the
          assistant types, then replies. Only the LATEST turn carries the
          live object (draft card → confirmed ticket); earlier turns keep
          just their prose, so the thread reads as history. */}
      {variant === '2c' &&
        exchanges.map((ex, i) => {
          const latest = i === exchanges.length - 1
          const showAssistant = i < revealed
          const receiptRes = ex.resolution?.kind === 'receipt' ? ex.resolution : null
          const cancelledRes = ex.resolution?.kind === 'cancelled' ? ex.resolution : null
          // The live receipt waits out the full-screen takeover: while the
          // stage sits at 'receipt' the black surface owns the moment, and
          // Done (dismiss) is what reveals the resolved turn — so the
          // ticket animates in on the return, not before the cover. Old
          // receipts (no longer latest) are history and always show.
          const receiptShown =
            receiptRes && !(latest && stage === 'receipt') ? receiptRes : null
          return (
            <div key={ex.id} className="mt-6 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                className="flex flex-col items-end"
              >
                <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
                  {ex.user}
                </div>
                <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
              </motion.div>

              <div className="mt-2.5 flex flex-col gap-3">
                <AnimatePresence mode="wait" initial={false}>
                  {!showAssistant ? (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.25 }}
                    >
                      <TypingDots />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={cancelledRes ? 'cancelled' : receiptShown ? 'receipt' : 'reply'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4, transition: { duration: 0.16 } }}
                      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      className="flex flex-col gap-3"
                    >
                      <p className="text-[14px] leading-relaxed text-ink">
                        {receiptShown ? (
                          <>
                            You&rsquo;re all set —{' '}
                            <span className="font-semibold">{receiptShown.place}</span> is booked
                            for {receiptShown.slots.date?.split(',')[0] ?? 'Saturday'} at{' '}
                            {receiptShown.slots.time ?? '7:30 PM'}, party of{' '}
                            {receiptShown.slots.party ?? 2}. OpenTable sent the confirmation to
                            your email.
                          </>
                        ) : (
                          ex.assistant
                        )}
                      </p>

                      {/* The live object rides only the newest unresolved
                          turn, and only while the flow is in flight. */}
                      <AnimatePresence>
                        {latest && confirming && !ex.resolution && (
                          <DraftReservationCard
                            key="draft"
                            // Body tap: the restaurant itself — the same
                            // details view the stack opens (map, reviews,
                            // hours), morphed from the draft card's geometry.
                            onOpenDetails={(card, thumb) => {
                              const name = flow?.place
                              const result =
                                results.find((r) => r.place.name === name) ??
                                PROVIDER_RESULTS.yelp.find((r) => r.place.name === name) ??
                                results[0]
                              openDetailsFrom(result, card, thumb)
                            }}
                            onCancelled={() =>
                              resolveExchange(ex.id, {
                                kind: 'cancelled',
                                place: flow?.place ?? 'Valette Restaurant',
                              })
                            }
                          />
                        )}
                      </AnimatePresence>
                      {/* Resolved turns keep their objects as history — the
                          cancelled draft's tombstone, the booking's ticket —
                          even as the thread grows past them. */}
                      {cancelledRes && <CancelledDraftArtifact place={cancelledRes.place} />}
                      {receiptShown && (
                        <ConfirmedReceipt place={receiptShown.place} slots={receiptShown.slots} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </motion.div>
      )}
      </AnimatePresence>

      {screenEl &&
        createPortal(
          <ConversationHeader
            title={title}
            onIslandTap={onIslandTap ?? (() => tripFileBus.open())}
            onCollapse={onCollapse}
          />,
          screenEl,
        )}

      {/* Trip file — receipts fanned + tasks listed over the blurred thread.
          Above the header (z-20), below the dock (z-40) so the orb-turned-X
          stays live. */}
      {screenEl &&
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
          screenEl,
        )}

      {/* Compare — map + detented results sheet, under details (z-30) so a
          tapped row can morph open above it, and under the dock's orb. */}
      {screenEl &&
        createPortal(
          <AnimatePresence>
            {compare && (
              <CompareView
                key="compare"
                origin={compare}
                provider={provider}
                onSelectProvider={setProvider}
                onClose={() => setCompare(null)}
                onOpenPlace={openDetailsFrom}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}

      {screenEl &&
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
          screenEl,
        )}

      {variant === '2d' &&
        screenEl &&
        createPortal(
          <AnimatePresence>{confirming && <CheckoutView key="checkout" />}</AnimatePresence>,
          screenEl,
        )}

    </div>
  )
}
