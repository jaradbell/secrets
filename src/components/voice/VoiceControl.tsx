import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { ReservationReceipt } from '../transaction/ReservationReceipt'
import { useReservationFlow, type ReservationSlots } from '../transaction/reservationFlow'
import { auraBus } from '../shared/auraBus'
import { tripFileBus, useTripFileOpen } from '../shared/tripFileBus'
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

/** Inline dock (details view): the orb stretches into a compact "Follow-up"
    pill docked right. Expanding glides it left into a disc and deals the
    suggestion chips out of its trailing edge toward the right. */
const INLINE_ORB = 56
const INLINE_PILL_W = 150

/** Follow-up pill dimensions — the orb stretches into this affordance.
    Sized so the pill plus the cancel circle (56px + 8px gap) fits the
    frame's ~361px content width. */
const PILL_W = 296
const PILL_H = 64
const CANCEL_SIZE = 56

/** How the dock presents the reservation follow-up:
    - 'pill': the orb stretches into the slot-token pill (2A)
    - 'none': the orb stays put; confirmation lives elsewhere (2C / 2D) */
export type FollowUpMode = 'pill' | 'none'

/** A tappable chip in the inline dock's expandable suggestion tray. */
export type DockSuggestion = {
  id: string
  label: string
  icon?: ReactNode
  /** 'reserve' funnels into the reservation flow against the focused place;
      everything else is an inert prototype action. */
  kind?: 'reserve'
}

/** Presses shorter than this are taps (toggle); longer are hold-to-talk. */
const HOLD_MS = 450

/** The dock's flanking buttons (opt-in via dockAux) — compose and type,
    small dark discs beside the orb. Sized well under the 72px orb so the
    mic keeps clear primacy in the row. */
const AUX_SIZE = 43
const AUX_GAP = 16

/** One flank — a quiet dark disc in the orb's own material, white glyph.
    Absolutely hung off the row's center so the orb's pill/inline morphs
    never have to negotiate layout with it. */
function AuxButton({
  side,
  label,
  onTap,
  children,
}: {
  side: 'left' | 'right'
  label: string
  onTap?: () => void
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onTap}
      className="absolute top-1/2 flex items-center justify-center rounded-full bg-[#17141b] shadow-[0_10px_26px_-10px_rgba(20,16,28,0.55)] outline-none"
      style={{
        width: AUX_SIZE,
        height: AUX_SIZE,
        y: '-50%',
        [side === 'left' ? 'right' : 'left']: `calc(50% + ${ORB_SIZE / 2 + AUX_GAP}px)`,
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.button>
  )
}

function PlusGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  )
}

function KeyboardGlyph() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.75" y="6" width="18.5" height="12.5" rx="2.6" />
      <path d="M6.4 9.6h.01M10.15 9.6h.01M13.9 9.6h.01M17.65 9.6h.01M6.4 12.4h.01M10.15 12.4h.01M13.9 12.4h.01M17.65 12.4h.01" />
      <path d="M8 15.2h8" />
    </svg>
  )
}

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

/** Dark options panel for the pill's slot popovers. */
function PopoverPanel({
  which,
  time,
  party,
  onPickTime,
  onPickParty,
}: {
  which: 'time' | 'party'
  time?: string
  party?: number
  onPickTime: (t: string) => void
  onPickParty: (n: number) => void
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[#17141b] p-1.5 shadow-[0_24px_60px_-20px_rgba(10,8,14,0.65)]">
      {which === 'time' ? (
        <div className="flex flex-col">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPickTime(t)}
              className={`h-10 rounded-[16px] px-7 text-[13px] font-medium whitespace-nowrap outline-none transition-colors duration-150 ${
                time === t ? 'bg-white text-ink' : 'text-white/80 active:bg-white/10'
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
              onClick={() => onPickParty(n)}
              className={`flex size-10 items-center justify-center rounded-full text-[13px] font-medium outline-none transition-colors duration-150 ${
                party === n ? 'bg-white text-ink' : 'text-white/80 active:bg-white/10'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
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
  followUp = 'pill',
  receipt: Receipt = ReservationReceipt,
  hideHintWhenFocused = false,
  dockHint,
  dockAux = false,
  onPlus,
  suggestions,
  onUtterance,
}: {
  idleContent?: ReactNode
  followUp?: FollowUpMode
  /** Full-screen surface for the completed transaction. Pass null to skip
      the takeover entirely — the prototype's own content renders the receipt
      in place (e.g. the in-thread receipt card) and the dock stays live. */
  receipt?: ComponentType<{ place: string; slots: ReservationSlots; onDone: () => void }> | null
  /** Drop the resting "Hold or tap to speak" hint while a details sheet has
      focus (the sheet's own affordances carry the moment). */
  hideHintWhenFocused?: boolean
  /** Replaces the resting "Hold or tap to speak" text with the host's own
      chrome (e.g. a floating search chip) — same slot, same airspace. Voice
      states ("Listening…", follow-up prompts) still take the slot over. */
  dockHint?: ReactNode
  /** Flank the orb with compose (+) and type (keyboard) discs — dark
      circles in the orb's material. They stand down whenever the dock
      leaves plain-orb shape (pill morph, inline dock, trip file). */
  dockAux?: boolean
  /** What the + flank does (5A raises the board's composer). Omitted,
      the disc is furniture — 5E's is. */
  onPlus?: () => void
  /** Opt-in inline dock: while a details sheet has focus, the orb morphs
      into a compact "Follow-up" pill docked right. A tap glides it left and
      deals these chips out of its wake (hold still pours into listening);
      tapping again or away tucks them back in. */
  suggestions?: DockSuggestion[]
  /** A resting utterance completed (listening → thinking) and no flow was
      there to consume it — the host can act on the words (5B's grid births
      a project from them; its draft floor takes a name). */
  onUtterance?: (transcript: string) => void
}) {
  const { status, transcript, response, error, levelRef, start, finish } = useVoiceInput()
  const meta = STATE_META[status]

  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'
  // Trip file open (header island tapped): the orb becomes the close
  // affordance — a quiet dark X disc — and voice input stands down.
  const tripOpen = useTripFileOpen()
  // Without a takeover surface, the receipt lives in the content and the
  // dock carries on — no bloom-out, pill resolves back to the orb.
  const receiptTakeover = stage === 'receipt' && Receipt !== null
  // Dock shape per mode. 'pill' morphs the orb into the slot pill (and stays
  // pill through booking/receipt-takeover so the dock blurs out without
  // snapping back). 'none' keeps the orb throughout — the confirmation UI
  // lives out in the content.
  const isPill =
    followUp === 'pill' && (stage === 'followUp' || stage === 'booking' || receiptTakeover)
  // Both slots filled during follow-up: don't auto-book — surface the
  // explicit "go" and wait for it.
  const ready = stage === 'followUp' && !!flow?.slots.time && !!flow?.slots.party

  // Inline dock: only while a details sheet has focus and no flow is in
  // flight — the moment a chip (or utterance) starts one, the bar exits and
  // the orb slides back to center for the pill morph.
  const inline = !!suggestions?.length && !!flow?.focusedPlace && stage === 'none'
  const [expanded, setExpanded] = useState(false)
  // The tray starts dealt out whenever the inline dock appears (drilling in,
  // or returning from a dismissed follow-up); collapsing it — tap the disc
  // or tap away — is the user's move. Any active voice state retracts it.
  useEffect(() => {
    setExpanded(inline && status === 'idle')
  }, [inline, status])

  // Tap-away collapse, without blocking: a passive listener retracts the
  // tray on any press outside the dock, and the press still lands where it
  // was aimed (scrolling the sheet or tapping Back shouldn't need two taps).
  const dockRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!(inline && expanded)) return
    const onPress = (e: PointerEvent) => {
      if (dockRef.current?.contains(e.target as Node)) return
      setExpanded(false)
    }
    document.addEventListener('pointerdown', onPress)
    return () => document.removeEventListener('pointerdown', onPress)
  }, [inline, expanded])

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

  // An utterance completed (listening → thinking). Mid-follow-up the flow
  // consumes it — mine it for time / party and fill the slots. At rest it
  // goes to the host's onUtterance, if it wants the words. Tapping and
  // speaking land in the same place — both are natural-language input.
  const prevStatusRef = useRef(status)
  useEffect(() => {
    const uttered =
      prevStatusRef.current === 'listening' && status === 'thinking' && transcript.trim()
    if (uttered) {
      if (flow && flow.stage === 'followUp') {
        flow.fillFromUtterance(transcript)
      } else if (stage === 'none') {
        onUtterance?.(transcript.trim())
      }
    }
    prevStatusRef.current = status
  }, [status, transcript, flow, stage, onUtterance])

  // Slot popovers (time / party pickers) anchored above the pill.
  const [popover, setPopover] = useState<'time' | 'party' | null>(null)
  useEffect(() => {
    if (stage !== 'followUp') setPopover(null)
  }, [stage])

  const pressRef = useRef<{ at: number; startedListening: boolean } | null>(null)

  // Inline pill presses split at HOLD_MS: a quick tap toggles the suggestion
  // tray (it can't arm the mic, so listening only starts once the hold is
  // committed), while holding past the threshold pours into listening.
  const inlinePressRef = useRef<{ timer: number; held: boolean } | null>(null)

  const onPointerDown = () => {
    if (tripOpen) return // the X handles the press on release
    if (stage === 'booking') return // mid-transaction; let it complete
    if (inline) {
      if (status !== 'idle') return
      const press = { timer: 0, held: false }
      press.timer = window.setTimeout(() => {
        press.held = true
        setExpanded(false)
        void start()
        setPressing(true)
      }, HOLD_MS)
      inlinePressRef.current = press
      return
    }
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
      // Slots already complete and nothing was actually heard — treat the
      // hold as the "book it". With a real transcript, defer to the parse
      // effect so "make it Sunday" edits instead of booking.
      else if (!transcript.trim()) flow.confirm()
    }
  }

  const onPointerUp = () => {
    if (tripOpen) {
      tripFileBus.close()
      return
    }
    setPressing(false)
    const inlinePress = inlinePressRef.current
    if (inlinePress) {
      inlinePressRef.current = null
      window.clearTimeout(inlinePress.timer)
      if (inlinePress.held) {
        // Held like a walkie-talkie → send on release.
        finish()
        simulateUtterance()
      } else {
        setExpanded((e) => !e)
      }
      return
    }
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

  // A cancelled press never toggles the tray — just tidy up.
  const onPointerCancel = () => {
    const inlinePress = inlinePressRef.current
    if (inlinePress) {
      inlinePressRef.current = null
      window.clearTimeout(inlinePress.timer)
      setPressing(false)
      if (inlinePress.held) finish()
      return
    }
    onPointerUp()
  }

  // NBSP keeps the text slot's height (and the orb's position) stable.
  const restingHint =
    hideHintWhenFocused && flow?.focusedPlace && status === 'idle' && !error
      ? '\u00A0' // details sheet has focus — its affordances carry the moment
      : (error ?? meta.label)
  const label =
    stage === 'followUp'
      ? status === 'listening'
        ? 'Listening\u2026'
        : ready
          ? 'Ready \u2014 book it, or adjust a detail'
          : '\u00A0' // the follow-up affordances speak for themselves
      : stage === 'booking'
        ? 'Booking\u2026'
        : restingHint

  // The agent's side of the follow-up — asks for whatever context is still
  // missing, and acknowledges once the intent is complete. Keyed copy so
  // each change develops in fresh above the pill.
  const followUpPrompt =
    stage === 'followUp' && flow
      ? ready
        ? `Great \u2014 ${flow.slots.date ? `${flow.slots.date}, ` : ''}${flow.slots.time} for ${flow.slots.party}. Book it?`
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

  // While the trip file is up the fan carries its own captions — the dock
  // goes quiet (NBSP keeps the slot's height so the button doesn't shift).
  const dockText = tripOpen ? '\u00A0' : promptShowing && followUpPrompt ? followUpPrompt : label

  return (
    // No z-index on the root: the dock below carries its own high z so it
    // floats above full-frame overlays (e.g. the place details sheet), which
    // a stacking context here would trap it under.
    // min-h-0 keeps the column inside the fixed frame even when the content
    // slot wants more room (long threads scroll; the dock stays pinned).
    <div className="relative flex min-h-0 flex-1 flex-col px-4 pt-[var(--safe-top)] pb-[calc(var(--safe-bottom)+24px)]">
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
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[35]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              // Sized to the dock it protects: the pill stands taller than
              // the bare orb, which needs less — scrolled content clears the
              // fade sooner and stays interactive.
              height: followUp === 'none' ? 200 : 260,
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
        ref={dockRef}
        className="relative z-40 flex flex-col items-center gap-4"
        animate={
          receiptTakeover
            ? {
                opacity: [1, 1, 0],
                scale: [1, 1.16, 1.38],
                filter: ['blur(0px)', 'blur(12px)', 'blur(38px)'],
              }
            : { opacity: 1, scale: 1, filter: 'blur(0px)' }
        }
        transition={
          receiptTakeover
            ? { duration: 1.0, times: [0, 0.5, 1], ease: 'easeInOut' }
            : { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
        }
        style={{ pointerEvents: receiptTakeover ? 'none' : 'auto' }}
      >
        {/* Slot popovers — spring up from the pill (2A). */}
        <AnimatePresence>
          {popover && flow && followUp === 'pill' && (
            <motion.div
              key={popover}
              initial={{ opacity: 0, scale: 0.88, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              // Anchored just above the pill, aligned toward its own token
              // (the pill is centered; tokens sit at its right).
              className={`absolute origin-bottom-right ${
                popover === 'time' ? 'right-[calc(50%-72px)]' : 'right-[calc(50%-150px)]'
              }`}
              style={{ bottom: PILL_H + 10 }}
            >
              <PopoverPanel
                which={popover}
                time={flow.slots.time}
                party={flow.slots.party}
                onPickTime={(t) => {
                  flow.fillSlots({ time: t })
                  setPopover(null)
                }}
                onPickParty={(n) => {
                  flow.fillSlots({ party: n })
                  setPopover(null)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The dock's single text slot. The agent's follow-up question takes
            it over transiently — develops in, holds a beat, dissolves — and
            the standard hint animates back in its place. A host-provided
            dockHint (the floating search chip) owns the slot at rest; voice
            states still take it over. In the inline dock the bar carries the
            text instead. */}
        {!inline && (
          <div className={`flex items-center justify-center ${dockHint ? 'min-h-10' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
              {dockHint && stage === 'none' && status === 'idle' && !error && !tripOpen ? (
                <motion.div
                  key="dock-hint"
                  initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
                  transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                  className="flex justify-center"
                >
                  {dockHint}
                </motion.div>
              ) : (
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
              )}
          </AnimatePresence>
          </div>
        )}

        <div
          className={`relative flex items-center ${
            inline ? (expanded ? 'w-full justify-start' : 'w-full justify-end') : 'justify-center'
          }`}
        >
        {/* The flanks — present only while the dock is a plain orb, so
            the pill morph and inline dock keep their stage to themselves. */}
        <AnimatePresence>
          {dockAux && !isPill && !inline && !tripOpen && (
            <AuxButton key="aux-plus" side="left" label="New" onTap={onPlus}>
              <PlusGlyph />
            </AuxButton>
          )}
          {dockAux && !isPill && !inline && !tripOpen && (
            <AuxButton key="aux-keys" side="right" label="Type instead">
              <KeyboardGlyph />
            </AuxButton>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          // Position-only layout animation so the button glides between the
          // right-docked "Follow-up" pill and the left-anchored disc.
          layout={suggestions?.length ? 'position' : false}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          aria-label={tripOpen ? 'Close receipts' : label.trim() || 'Voice input'}
          aria-expanded={inline ? expanded : undefined}
          className="relative flex shrink-0 items-center justify-center overflow-hidden outline-none touch-none select-none"
          // Capsule: never animate radius — an over-large value clamps to
          // half the shorter side, so width/height springs stretch a perfect
          // pill instead of warping through mismatched corner radii.
          style={{ borderRadius: 9999 }}
          animate={{
            width: isPill ? PILL_W : inline ? (expanded ? INLINE_ORB : INLINE_PILL_W) : ORB_SIZE,
            height: isPill ? PILL_H : inline ? INLINE_ORB : ORB_SIZE,
          }}
          whileTap={{ scale: 0.96 }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 24,
            layout: { type: 'spring', stiffness: 280, damping: 24 },
          }}
        >
          {/* The dark body — stretches from disc to pill with the button
              (radius rides along via inherit). */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ borderRadius: 'inherit' }}
          >
            <VoiceOrb status={status} levelRef={levelRef} size="fill" />
            {/* Trip file: the orb's living material settles under a quiet
                dark disc — the close control shouldn't feel like a mic. */}
            <motion.div
              className="absolute inset-0"
              style={{ borderRadius: 'inherit', background: '#17141b' }}
              initial={false}
              animate={{ opacity: tripOpen ? 1 : 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {isPill && flow ? (
            <motion.span
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)', transition: { delay: 0.16 } }}
              // The wider left inset suits the arrow + label; once the chips
              // span the pill (ready) the insets match.
              className={`relative flex w-full items-center ${ready ? 'px-3' : 'pl-5 pr-3'}`}
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
                  {/* Once ready the tokens row takes the full pill width so
                      the Book chip stretches into the space the follow-up
                      label vacated. */}
                  <span className={`ml-auto flex items-center gap-1.5 ${ready ? 'w-full' : ''}`}>
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
                        className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full bg-white px-4 text-[13px] font-semibold whitespace-nowrap text-ink"
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
               fully continuous motion (no lattice stepping). Inline, the
               pill carries its name beside the dots; the label melts away
               as the pill condenses to a disc. */
            <span className="pointer-events-none relative flex items-center gap-2">
              {/* Dots ↔ X: the verb swaps to the close glyph while the trip
                  file is up, with a quarter-turn so the change reads. */}
              <span className="relative flex items-center justify-center">
                <motion.span
                  className="flex items-center"
                  initial={false}
                  animate={{
                    opacity: tripOpen ? 0 : 1,
                    rotate: tripOpen ? 90 : 0,
                    scale: tripOpen ? 0.5 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                >
                  <VoiceGlyph status={status} levelRef={levelRef} size={inline ? 22 : 30} />
                </motion.span>
                <motion.span
                  className="absolute inset-0 flex items-center justify-center"
                  initial={false}
                  animate={{
                    opacity: tripOpen ? 1 : 0,
                    rotate: tripOpen ? 0 : -90,
                    scale: tripOpen ? 1 : 0.5,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path
                      d="M4 4 14 14M14 4 4 14"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.span>
              </span>
              <AnimatePresence initial={false}>
                {inline && !expanded && (
                  <motion.span
                    key="follow-up"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{
                      opacity: 1,
                      filter: 'blur(0px)',
                      transition: { delay: 0.1, duration: 0.24 },
                    }}
                    exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } }}
                    className="text-[13px] font-medium whitespace-nowrap text-white/70"
                  >
                    Follow-up
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          )}
        </motion.button>

          {/* Suggestion chips — dealt out of the button's trailing edge as it
              glides left. Natural order, staggered rightward so "Get
              reservation" emerges first; the hand bleeds off the right frame
              edge and dissolves back into the disc when scrolled left. */}
          <AnimatePresence initial={false}>
            {inline && expanded && suggestions && (
              <motion.div
                key="chips"
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: -32,
                  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="-my-2 -mr-4 ml-3 min-w-0 flex-1 overflow-x-auto py-2"
                style={{
                  scrollbarWidth: 'none',
                  maskImage:
                    'linear-gradient(to right, transparent 0, black 20px, black 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0, black 20px, black 100%)',
                }}
              >
                <div className="flex w-max items-center gap-2 pl-5">
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={s.id}
                      type="button"
                      initial={{ opacity: 0, x: -40, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: 1,
                        transition: {
                          delay: 0.06 + 0.045 * i,
                          type: 'spring',
                          stiffness: 380,
                          damping: 26,
                        },
                      }}
                      onClick={() => {
                        if (s.kind === 'reserve' && flow?.focusedPlace) {
                          flow.begin({}, flow.focusedPlace)
                        }
                        setExpanded(false)
                      }}
                      className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-[14px] leading-[18px] text-white outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
                      style={{ height: INLINE_ORB }}
                    >
                      {s.icon}
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Escape hatch — a sibling circle in the pill's material, outside
            the morph, that abandons the follow-up. Slides in once the pill
            has stretched; collapses away (width and margin to zero) so the
            group re-centers smoothly in both directions. */}
        <AnimatePresence>
          {stage === 'followUp' && followUp === 'pill' && flow && (
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
        {receiptTakeover && Receipt && flow && (
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
