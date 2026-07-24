import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { ReservationReceipt } from '../transaction/ReservationReceipt'
import { useReservationFlow, type ReservationSlots } from '../transaction/reservationFlow'
import { auraBus } from '../shared/auraBus'
import { EdgeAura } from './EdgeAura'
import { LiquidDistortion } from './LiquidDistortion'
import { useVoiceInput, type VoiceStatus } from './useVoiceInput'
import { VoiceGlyph } from './VoiceGlyph'
import { VoiceOrb } from './VoiceOrb'

const STATE_META: Record<VoiceStatus, { label: string }> = {
  idle: { label: 'Hold or tap to speak' },
  listening: { label: 'Listening\u2026' },
  thinking: { label: 'Thinking\u2026' },
  responding: { label: 'Responding' },
}

/** Orb diameter — thumb scale, comfortably tappable (≥ 44pt hit target). */
const ORB_SIZE = 72

/** Follow-up pill dimensions — the orb stretches into this affordance.
    Sized so the pill plus the cancel circle (56px + 8px gap) fits the
    frame's ~361px content width. */
const PILL_W = 296
const PILL_H = 64
const CANCEL_SIZE = 56

/** Presses shorter than this are taps (toggle); longer are hold-to-talk. */
const HOLD_MS = 450

const TIME_OPTIONS = ['6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM']
const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6]

/** Tappable slot chip inside the follow-up pill. Stops pointer propagation so
    a tap opens its popover instead of arming the mic on the pill body. */
function SlotToken({
  label,
  filled,
  onOpen,
}: {
  label: string
  filled: boolean
  onOpen: () => void
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      // Filled tokens stay quiet — a settled fact, not a call to action. The
      // value reads at full white; the empty placeholder sits dimmer. White
      // fill is reserved for the Book chip, the pill's one light source.
      className={`flex h-10 cursor-pointer items-center rounded-full px-4 text-[12px] font-medium whitespace-nowrap transition-colors duration-200 ${
        filled ? 'bg-white/12 text-white' : 'bg-white/15 text-white/60'
      }`}
    >
      {label}
    </span>
  )
}

/** Curved "threaded reply" arrow between the dots and the follow-up label. */
function ThreadArrow() {
  return (
    <svg
      className="mx-2.5 shrink-0"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 2.5v3a4 4 0 0 0 4 4h5.5M10 6l3.5 3.5L10 13"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The evoke control. The orb docks bottom-center in the thumb zone and runs
 * the idle → listening → thinking → responding loop. Tap toggles listening;
 * press-and-hold works like a walkie-talkie (release to send). While
 * listening the disc breathes with the live mic level, and the transcript
 * streams into the space above.
 *
 * When a reservation flow is active (transaction prototype), the orb morphs
 * into the follow-up pill — dots still animating, a threaded arrow into
 * "Follow-up", and Time / Party slot tokens. The user can hold the pill to
 * speak the missing details, or tap a token for a popover. Once the booking
 * completes, the pill's dark material expands to take over the frame as the
 * receipt.
 *
 * `idleContent` is a slot for whatever the prototype wants in the
 * conversation space while the session is at rest. `receipt` lets a
 * prototype supply its own receipt component (the receipt fork iterates on
 * a copy without touching the transaction prototype's).
 */
export function VoiceControl({
  idleContent,
  receipt: Receipt = ReservationReceipt,
}: {
  idleContent?: ReactNode
  receipt?: ComponentType<{ place: string; slots: ReservationSlots; onDone: () => void }>
}) {
  const { status, transcript, response, error, levelRef, start, finish } = useVoiceInput()
  const meta = STATE_META[status]

  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'
  // Stays pill-shaped through the receipt so the dock blurs out as the pill
  // (no snap back to the orb mid-handoff).
  const isPill = stage === 'followUp' || stage === 'booking' || stage === 'receipt'
  // Both slots filled during follow-up: don't auto-book — surface the
  // explicit "go" and wait for it.
  const ready = stage === 'followUp' && !!flow?.slots.time && !!flow?.slots.party

  // The aura keys on the press itself so the pour starts the instant the
  // thumb lands — getUserMedia can take hundreds of ms and the glow
  // shouldn't wait for it — and stays lit through the listening state.
  const [pressing, setPressing] = useState(false)
  const auraOn = pressing || status === 'listening'

  // The ambient mesh parts down the middle in step with the aura (read by
  // the background's draw loop through the shared bus).
  useEffect(() => {
    auraBus.active = auraOn
    return () => {
      auraBus.active = false
    }
  }, [auraOn])

  // A follow-up utterance completed (listening → thinking): mine it for
  // time / party and fill the slots. Tapping and speaking land in the same
  // place — both are natural-language input.
  const prevStatusRef = useRef(status)
  useEffect(() => {
    if (
      flow &&
      flow.stage === 'followUp' &&
      prevStatusRef.current === 'listening' &&
      status === 'thinking' &&
      transcript.trim()
    ) {
      flow.fillFromUtterance(transcript)
    }
    prevStatusRef.current = status
  }, [status, transcript, flow])

  // Slot popovers (time / party pickers) anchored above the pill.
  const [popover, setPopover] = useState<'time' | 'party' | null>(null)
  useEffect(() => {
    if (stage !== 'followUp') setPopover(null)
  }, [stage])

  const pressRef = useRef<{ at: number; startedListening: boolean } | null>(null)

  const onPointerDown = () => {
    if (stage === 'booking') return // mid-transaction; let it complete
    if (status === 'idle') {
      void start()
      pressRef.current = { at: Date.now(), startedListening: true }
      setPressing(true)
    } else if (status === 'listening') {
      pressRef.current = { at: Date.now(), startedListening: false }
      setPressing(true)
    }
    // thinking / responding: ignore presses and let the cycle complete
  }

  // Prototype shortcut: when a hold ends, assume the speech happened.
  // From the resting orb with a details sheet open, that's the whole ask
  // ("book it for 2 at 7:30") — the intent begins against the focused place
  // with context complete. Without a focused place the hold is just a normal
  // voice session. During follow-up, the utterance fills whatever slots are
  // still missing (real recognition, when it works, refines via the parse
  // effect).
  const simulateUtterance = () => {
    if (!flow) return
    if (flow.stage === 'none') {
      if (flow.focusedPlace) flow.begin({ time: '7:30 PM', party: 2 }, flow.focusedPlace)
    } else if (flow.stage === 'followUp') {
      const missing: { time?: string; party?: number } = {}
      if (!flow.slots.time) missing.time = '7:30 PM'
      if (!flow.slots.party) missing.party = 2
      if (missing.time || missing.party) flow.fillSlots(missing)
    }
  }

  const onPointerUp = () => {
    setPressing(false)
    const press = pressRef.current
    pressRef.current = null
    if (!press) return
    if (press.startedListening) {
      // Held like a walkie-talkie → send on release. A quick tap keeps
      // listening until the next tap (or until speech naturally ends).
      if (Date.now() - press.at > HOLD_MS) {
        finish()
        simulateUtterance()
      }
    } else {
      finish() // tapped while listening → stop
      simulateUtterance()
    }
  }

  const label =
    stage === 'followUp'
      ? status === 'listening'
        ? 'Listening\u2026'
        : ready
          ? 'Ready \u2014 book it, or adjust a detail'
          : 'Hold to speak \u2014 or tap a detail'
      : stage === 'booking'
        ? 'Booking\u2026'
        : (error ?? meta.label)

  // The agent's side of the follow-up — asks for whatever context is still
  // missing, and acknowledges once the intent is complete. Keyed copy so
  // each change develops in fresh above the pill.
  const followUpPrompt =
    stage === 'followUp' && flow
      ? ready
        ? `Great \u2014 ${flow.slots.time} for ${flow.slots.party}. Book it?`
        : !flow.slots.time && !flow.slots.party
          ? `Happy to book${flow.place ? ` ${flow.place}` : ''} \u2014 what time, and how many of you?`
          : !flow.slots.time
            ? `${flow.slots.party} of you \u2014 got it. What time works?`
            : `${flow.slots.time} \u2014 got it. How many should I book for?`
      : null

  // The prompt is transient: each new question holds the dock's text slot
  // for a few seconds, then dissolves and hands the slot back to the hint.
  const [promptShowing, setPromptShowing] = useState(false)
  useEffect(() => {
    if (!followUpPrompt) {
      setPromptShowing(false)
      return
    }
    setPromptShowing(true)
    const timer = window.setTimeout(() => setPromptShowing(false), 3000)
    return () => clearTimeout(timer)
  }, [followUpPrompt])

  const dockText = promptShowing && followUpPrompt ? followUpPrompt : label

  return (
    // No z-index on the root: the dock below carries its own high z so it
    // floats above full-frame overlays (e.g. the place details sheet), which
    // a stacking context here would trap it under.
    <div className="relative flex flex-1 flex-col px-4 pt-[var(--safe-top)] pb-[calc(var(--safe-bottom)+24px)]">
      {/* Siri-style edge glow — pours around the frame from press until the
          session ends. Above everything (details sheet z-30, dock z-40) but
          inert. */}
      <EdgeAura active={auraOn} levelRef={levelRef} />

      {/* Conversation space — the content slot persists through the whole
          session (with a liquid shimmer while the press is held); the live
          transcript / response float over it near the dock. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <LiquidDistortion
          active={auraOn}
          className="flex min-h-0 flex-1 items-center justify-center"
        >
          {idleContent}
        </LiquidDistortion>
        {(((status === 'listening' || status === 'thinking') && transcript) ||
          (status === 'responding' && response)) && (
          <p className="absolute inset-x-4 bottom-4 text-center text-[15px] leading-snug text-ink">
            {status === 'responding' ? response : transcript}
          </p>
        )}
      </div>

      {/* Protective scrim — a clean fade to the sheet color behind the dock
          and its support text, so the copy never collides with content
          scrolled beneath. Above the details sheet (z-30), below the dock
          (z-40). */}
      <AnimatePresence>
        {(stage === 'followUp' || stage === 'booking') && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[35] h-[260px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              background:
                'linear-gradient(to top, #fcfcfc 0%, #fcfcfc 55%, rgba(252,252,252,0.85) 75%, rgba(252,252,252,0) 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Dock — label + orb (or follow-up pill) in the thumb zone. Sits above
          overlays (details sheet is z-30) so the composer stays reachable
          everywhere. When the booking completes, the dark pill itself blooms
          out — swelling and dissolving into a soft blur — and the receipt's
          black fades in behind during the tail of the dissolve. */}
      <motion.div
        className="relative z-40 flex flex-col items-center gap-4"
        animate={
          stage === 'receipt'
            ? {
                opacity: [1, 1, 0],
                scale: [1, 1.16, 1.38],
                filter: ['blur(0px)', 'blur(12px)', 'blur(38px)'],
              }
            : { opacity: 1, scale: 1, filter: 'blur(0px)' }
        }
        transition={
          stage === 'receipt'
            ? { duration: 1.0, times: [0, 0.5, 1], ease: 'easeInOut' }
            : { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
        }
        style={{ pointerEvents: stage === 'receipt' ? 'none' : 'auto' }}
      >
        {/* Slot popovers — spring up from the pill. */}
        <AnimatePresence>
          {popover && flow && (
            <motion.div
              key={popover}
              initial={{ opacity: 0, scale: 0.88, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              // Anchored just above the pill, aligned toward its own token
              // (the pill is 324px wide, centered; tokens sit at its right).
              className={`absolute bottom-[74px] origin-bottom-right ${
                popover === 'time' ? 'right-[calc(50%-72px)]' : 'right-[calc(50%-150px)]'
              }`}
            >
              <div className="rounded-[22px] border border-white/10 bg-[#17141b] p-1.5 shadow-[0_24px_60px_-20px_rgba(10,8,14,0.65)]">
                {popover === 'time' ? (
                  <div className="flex flex-col">
                    {TIME_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          flow.fillSlots({ time: t })
                          setPopover(null)
                        }}
                        className={`h-10 rounded-[16px] px-7 text-[13px] font-medium whitespace-nowrap outline-none transition-colors duration-150 ${
                          flow.slots.time === t
                            ? 'bg-white text-ink'
                            : 'text-white/80 active:bg-white/10'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {PARTY_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          flow.fillSlots({ party: n })
                          setPopover(null)
                        }}
                        className={`flex size-10 items-center justify-center rounded-full text-[13px] font-medium outline-none transition-colors duration-150 ${
                          flow.slots.party === n
                            ? 'bg-white text-ink'
                            : 'text-white/80 active:bg-white/10'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The dock's single text slot. The agent's follow-up question takes
            it over transiently — develops in, holds a beat, dissolves — and
            the standard hint animates back in its place. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={dockText}
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            className={`pointer-events-none max-w-[300px] text-center text-[13px] font-medium tracking-[-0.01em] ${
              promptShowing ? 'text-ink' : 'text-ink-secondary'
            }`}
          >
            {dockText}
          </motion.p>
        </AnimatePresence>

        <div className="flex items-center justify-center">
        <motion.button
          type="button"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label={label}
          className="relative flex items-center justify-center rounded-full outline-none touch-none select-none"
          animate={{ width: isPill ? PILL_W : ORB_SIZE, height: isPill ? PILL_H : ORB_SIZE }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        >
          {/* The dark body — stretches from disc to pill with the button. */}
          <div className="pointer-events-none absolute inset-0">
            <VoiceOrb status={status} levelRef={levelRef} size="fill" />
          </div>

          {isPill && flow ? (
            <motion.span
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)', transition: { delay: 0.16 } }}
              className="relative flex w-full items-center pl-5 pr-3"
            >
              {stage === 'booking' || stage === 'receipt' ? (
                <span className="mx-auto text-[13px] font-medium whitespace-nowrap text-white/85">
                  Booking {flow.slots.time} for {flow.slots.party}&hellip;
                </span>
              ) : (
                <>
                  {!ready && (
                    <>
                      <ThreadArrow />
                      <span className="text-[12px] font-medium whitespace-nowrap text-white/60">
                        Follow-up
                      </span>
                    </>
                  )}
                  <span className="ml-auto flex items-center gap-1.5">
                    <SlotToken
                      label={flow.slots.time ?? 'Time'}
                      filled={!!flow.slots.time}
                      onOpen={() => setPopover((p) => (p === 'time' ? null : 'time'))}
                    />
                    <SlotToken
                      label={flow.slots.party ? `${flow.slots.party} guests` : 'Party'}
                      filled={!!flow.slots.party}
                      onOpen={() => setPopover((p) => (p === 'party' ? null : 'party'))}
                    />
                    {ready && (
                      // Both details are in — the explicit "go", terminal in
                      // the reading order and the pill's only white chip. (A
                      // span with button semantics: real <button>s can't
                      // nest inside the pill button.)
                      <motion.span
                        key="book"
                        role="button"
                        tabIndex={0}
                        initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.92 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          flow.confirm()
                        }}
                        className="flex h-10 cursor-pointer items-center rounded-full bg-white px-4 text-[13px] font-semibold whitespace-nowrap text-ink"
                      >
                        Book
                      </motion.span>
                    )}
                  </span>
                </>
              )}
            </motion.span>
          ) : (
            /* The verb, in light dots on the dark body — our own glyph with
               fully continuous motion (no lattice stepping). */
            <span className="pointer-events-none relative">
              <VoiceGlyph status={status} levelRef={levelRef} size={30} />
            </span>
          )}
        </motion.button>

        {/* Escape hatch — a sibling circle in the pill's material, outside
            the morph, that abandons the follow-up. Slides in once the pill
            has stretched; collapses away (width and margin to zero) so the
            group re-centers smoothly in both directions. */}
        <AnimatePresence>
          {stage === 'followUp' && flow && (
            <motion.button
              key="cancel"
              type="button"
              aria-label="Cancel reservation follow-up"
              initial={{ width: 0, marginLeft: 0, opacity: 0, scale: 0.6 }}
              animate={{
                width: CANCEL_SIZE,
                marginLeft: 8,
                opacity: 1,
                scale: 1,
                transition: {
                  delay: 0.16,
                  type: 'spring',
                  stiffness: 380,
                  damping: 30,
                },
              }}
              exit={{
                width: 0,
                marginLeft: 0,
                opacity: 0,
                scale: 0.6,
                transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
              }}
              whileTap={{ scale: 0.92 }}
              onClick={() => flow.dismiss()}
              className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#17141b] outline-none select-none"
              style={{ height: CANCEL_SIZE }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
        </div>
      </motion.div>

      {/* Transaction completed — black fades in behind the blurred-out pill. */}
      <AnimatePresence>
        {stage === 'receipt' && flow && (
          <Receipt
            place={flow.place ?? 'Valette Restaurant'}
            slots={flow.slots}
            onDone={flow.dismiss}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
