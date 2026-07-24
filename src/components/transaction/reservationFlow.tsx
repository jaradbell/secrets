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
 * not pulling the trigger — the transaction waits for confirm(). Only an
 * intent that arrives with full context ("book it for 2 at 7:30") skips
 * straight to booking, because the user already said the verb.
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

export type ReservationSlots = { time?: string; party?: number }
export type ReservationStage = 'none' | 'followUp' | 'booking' | 'receipt'

type ReservationFlow = {
  stage: ReservationStage
  slots: ReservationSlots
  /** Place being booked, for the receipt. */
  place: string | null
  /** Place whose details sheet is open — spoken intents from the resting
      orb attach to it. Null while browsing results. */
  focusedPlace: string | null
  setFocusedPlace: (place: string | null) => void
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

/** Prototype-grade slot extraction from a spoken utterance. */
export function parseReservationUtterance(text: string): ReservationSlots {
  const slots: ReservationSlots = {}

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

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<ReservationStage>('none')
  const [slots, setSlots] = useState<ReservationSlots>({})
  const [place, setPlace] = useState<string | null>(null)
  const [focusedPlace, setFocusedPlace] = useState<string | null>(null)
  const timersRef = useRef<number[]>([])

  useEffect(() => () => timersRef.current.forEach((id) => clearTimeout(id)), [])

  const toBooking = useCallback(() => {
    setStage('booking')
    timersRef.current.push(window.setTimeout(() => setStage('receipt'), BOOKING_MS))
  }, [])

  const begin = useCallback(
    (initial: ReservationSlots = {}, forPlace?: string) => {
      setSlots(initial)
      if (forPlace) setPlace(forPlace)
      if (initial.time && initial.party) toBooking()
      else setStage('followUp')
    },
    [toBooking],
  )

  const fillSlots = useCallback((partial: ReservationSlots) => {
    setSlots((s) => ({ ...s, ...partial }))
  }, [])

  const confirm = useCallback(() => toBooking(), [toBooking])

  const fillFromUtterance = useCallback(
    (text: string) => {
      const parsed = parseReservationUtterance(text)
      if (parsed.time || parsed.party) fillSlots(parsed)
    },
    [fillSlots],
  )

  const dismiss = useCallback(() => {
    setStage('none')
    setSlots({})
  }, [])

  return (
    <Ctx.Provider
      value={{
        stage,
        slots,
        place,
        focusedPlace,
        setFocusedPlace,
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
