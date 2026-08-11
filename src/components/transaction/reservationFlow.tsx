/**
 * Reservation flow — the intent layer for facilitating a transaction.
 *
 * Everything funnels into one shape: tapping "Get reservation" produces an
 * intent with empty slots, press-and-holding it simulates a spoken utterance
 * with full context, and speaking during follow-up fills slots via the
 * transcript parser. Downstream UI (the follow-up pill, the receipt) never
 * knows which modality produced the intent.
 *
 * Stages: none → followUp (slot-filling → explicit confirm) → booking → receipt
 *              ↘ booking (full intent spoken up front) ↗
 *
 * Follow-up never auto-books: filling Time and Party is answering questions,
 * not pulling the trigger — the transaction waits for confirm(). The verb can
 * be spoken too: an utterance carrying confirm intent ("book it", "yes")
 * commits once the slots are complete, and an intent that arrives with full
 * context up front ("book it for 2 at 7:30") skips straight to booking.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ReservationSlots = { date?: string; time?: string; party?: number }
export type ReservationStage = 'none' | 'followUp' | 'booking' | 'receipt'

/** A conversational input (spoken or typed) that reached the flow — hosts
    that render the exchange as a thread show these as user bubbles. */
export type ReservationUtterance = { id: number; text: string }

type ReservationFlow = {
  stage: ReservationStage
  slots: ReservationSlots
  /** Place being booked, for the receipt. */
  place: string | null
  /** Conversational inputs consumed by this flow, in order. */
  utterances: ReservationUtterance[]
  /** Bumped every begin() — hosts key new intents off this, since begin can
      arrive mid-follow-up (a new place) or after a receipt (booking again)
      without the stage ever passing through 'none'. */
  beginCount: number
  /** Place whose details sheet is open — spoken intents from the resting
      orb attach to it. Null while browsing results. */
  focusedPlace: string | null
  setFocusedPlace: (place: string | null) => void
  /** True while a surface (e.g. the compare map) wants the orb's resting
      "Hold or tap to speak" hint dropped — the orb itself stays live. */
  hintSuppressed: boolean
  setHintSuppressed: (v: boolean) => void
  /** Open the flow with whatever context arrived with the intent. */
  begin: (slots?: ReservationSlots, place?: string) => void
  /** Merge slot values (from popovers or parsed speech). */
  fillSlots: (partial: ReservationSlots) => void
  /** Parse a spoken utterance for time / party and merge what's found. */
  fillFromUtterance: (text: string) => void
  /** The explicit "go" — commits the follow-up's slots to a booking. */
  confirm: () => void
  /** Close the receipt (or abort the flow) and reset. */
  dismiss: () => void
}

const Ctx = createContext<ReservationFlow | null>(null)

/** Null outside a ReservationProvider (e.g. the empty-state prototype). */
export const useReservationFlow = () => useContext(Ctx)

/** Simulated booking latency before the receipt takes over. */
const BOOKING_MS = 1500

/** The ask was anchored on Saturday, Jul 25 — spoken weekday mentions land
    in that prototype week. */
const DATE_LABELS: Record<string, string> = {
  saturday: 'Saturday, Jul 25',
  sunday: 'Sunday, Jul 26',
  monday: 'Monday, Jul 27',
  tuesday: 'Tuesday, Jul 28',
  wednesday: 'Wednesday, Jul 29',
  thursday: 'Thursday, Jul 30',
  friday: 'Friday, Jul 31',
}

/** Did the utterance carry the booking verb ("book it", "confirm", a plain
    "yes" to the agent's "Book it?"), as opposed to just answering slots? */
export function parseConfirmIntent(text: string): boolean {
  return /\b(book it|book the table|book that|confirm|go ahead|lock it in|make the reservation|yes|yeah|yep|do it)\b/i.test(
    text,
  )
}

/** Prototype-grade slot extraction from a spoken utterance. */
export function parseReservationUtterance(text: string): ReservationSlots {
  const slots: ReservationSlots = {}

  const day = text.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|tomorrow|tonight|today)\b/i,
  )
  if (day) {
    const raw = day[1].toLowerCase()
    const key = raw === 'tomorrow' ? 'sunday' : raw === 'tonight' || raw === 'today' ? 'saturday' : raw
    slots.date = DATE_LABELS[key]
  }

  const party =
    text.match(/\b(?:for|party of|table for)\s+(\d{1,2})\b/i) ??
    text.match(/\b(\d{1,2})\s+(?:people|guests|of us)\b/i)
  if (party) {
    const n = parseInt(party[1], 10)
    if (n >= 1 && n <= 20) slots.party = n
  }

  const time =
    text.match(/\b(\d{1,2}):(\d{2})\s*(pm|am)?\b/i) ??
    text.match(/\b(\d{1,2})\s*(pm|am)\b/i)
  if (time) {
    const h = parseInt(time[1], 10)
    if (h >= 1 && h <= 12) {
      const minutes = /^\d{2}$/.test(time[2] ?? '') ? time[2] : '00'
      const meridiem = (time[3] ?? time[2] ?? 'pm').toString().toLowerCase() === 'am' ? 'AM' : 'PM'
      slots.time = `${h}:${minutes} ${meridiem}`
    }
  }

  return slots
}

export function ReservationProvider({
  children,
  requireConfirm = false,
}: {
  children: ReactNode
  /** A full-context intent ("book it for 2 at 7:30") normally skips straight
      to booking. With requireConfirm the flow always lands on follow-up — the
      draft object carries the explicit go (2C's summary-card pattern). */
  requireConfirm?: boolean
}) {
  const [stage, setStage] = useState<ReservationStage>('none')
  const [slots, setSlots] = useState<ReservationSlots>({})
  const [place, setPlace] = useState<string | null>(null)
  const [utterances, setUtterances] = useState<ReservationUtterance[]>([])
  const [beginCount, setBeginCount] = useState(0)
  const [focusedPlace, setFocusedPlace] = useState<string | null>(null)
  const [hintSuppressed, setHintSuppressed] = useState(false)
  const timersRef = useRef<number[]>([])
  const utteranceIdRef = useRef(0)

  useEffect(() => () => timersRef.current.forEach((id) => clearTimeout(id)), [])

  const toBooking = useCallback(() => {
    setStage('booking')
    timersRef.current.push(window.setTimeout(() => setStage('receipt'), BOOKING_MS))
  }, [])

  const begin = useCallback(
    (initial: ReservationSlots = {}, forPlace?: string) => {
      setSlots(initial)
      setUtterances([])
      setBeginCount((c) => c + 1)
      if (forPlace) setPlace(forPlace)
      if (initial.time && initial.party && !requireConfirm) toBooking()
      else setStage('followUp')
    },
    [toBooking, requireConfirm],
  )

  const fillSlots = useCallback((partial: ReservationSlots) => {
    setSlots((s) => ({ ...s, ...partial }))
  }, [])

  const confirm = useCallback(() => toBooking(), [toBooking])

  const fillFromUtterance = useCallback(
    (text: string) => {
      const parsed = parseReservationUtterance(text)
      if (parsed.date || parsed.time || parsed.party) fillSlots(parsed)
      setUtterances((u) => [...u, { id: ++utteranceIdRef.current, text }])
      // The booking verb commits — but only once the merged slots are
      // complete; "book it" with holes left is still just slot-filling talk.
      const next = { ...slots, ...parsed }
      if (parseConfirmIntent(text) && next.time && next.party) toBooking()
    },
    [fillSlots, slots, toBooking],
  )

  const dismiss = useCallback(() => {
    setStage('none')
    setSlots({})
    setUtterances([])
  }, [])

  return (
    <Ctx.Provider
      value={{
        stage,
        slots,
        place,
        utterances,
        beginCount,
        focusedPlace,
        setFocusedPlace,
        hintSuppressed,
        setHintSuppressed,
        begin,
        fillSlots,
        fillFromUtterance,
        confirm,
        dismiss,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}
