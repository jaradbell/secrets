/**
 * 2C draft reservation object — the summary card the assistant's turn
 * carries while the booking is still provisional. Light where the confirmed
 * ticket is dark: white surface, dashed "Draft" badge, the reservation's
 * facts as stacked ledger rows (a pattern that keeps scaling as fields
 * grow), and the explicit go in the provider's brand color.
 *
 * Two grains of the summary → details grammar:
 * - a field row opens just that field's picker sheet (calendar / time /
 *   party — the same options the checkout edits), and
 * - the card body opens the restaurant itself — the full place details
 *   view (map, reviews, hours), morphed from this card.
 * Spoken or typed follow-ups rewrite the same slots from the thread.
 */
import { Squircle } from '@squircle-js/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarPicker, PARTY_OPTIONS, TIME_OPTIONS } from './CheckoutView'
import { PROVIDERS, PROVIDER_RESULTS } from './data'
import { useReservationFlow } from './reservationFlow'

const EASE = [0.32, 0.72, 0, 1] as const

/** The ask's own day — shown until the user changes it (checkout's default). */
const ASK_DATE = 'Saturday, Jul 25'

type FieldSheet = 'date' | 'time' | 'party'

const SHEET_TITLES: Record<FieldSheet, string> = {
  date: 'Choose a date',
  time: 'What time?',
  party: 'How many guests?',
}

/** What's left behind after a cancel — a quiet tombstone where the draft
    stood. Dashed like the Draft badge was: the object never hardened into
    a booking, and now it never will. */
export function CancelledDraftArtifact({ place }: { place: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      className="flex w-fit items-center gap-2 rounded-full border border-dashed px-3.5 py-2"
      style={{ borderColor: 'rgba(0,0,0,0.18)' }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9a9a9a"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M5.8 5.8 18.2 18.2" />
      </svg>
      <span className="text-[12px] text-ink-tertiary">
        Checkout cancelled &mdash; {place.replace(/ Restaurant$/, '')} draft discarded
      </span>
    </motion.div>
  )
}

export function DraftReservationCard({
  onOpenDetails,
  onCancelled,
}: {
  /** Card-body tap — the host morphs the place details view open from this
      card's geometry (the card element and its photo thumb). */
  onOpenDetails: (card: Element, thumb: Element) => void
  /** The user confirmed the cancel — the host leaves its artifact in the
      thread while this card (and the flow) dissolve. */
  onCancelled?: () => void
}) {
  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'

  // Field sheets ride the viewport (above the dock) like the checkout's
  // own calendar. Any stage change tucks an open sheet away.
  const [sheet, setSheet] = useState<FieldSheet | null>(null)
  // X pressed: the card itself transforms into the cancel confirmation.
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])
  useEffect(() => {
    if (stage !== 'followUp') setSheet(null)
  }, [stage])

  if (!flow) return null

  const booking = stage === 'booking'
  const ready = !!flow.slots.time && !!flow.slots.party
  const place =
    PROVIDER_RESULTS.yelp.find((r) => r.place.name === flow.place)?.place ??
    PROVIDER_RESULTS.yelp[0].place
  const provider = PROVIDERS.find((p) => p.id === 'opentable')!
  const brand = provider.starColor

  const fields: { id: FieldSheet; label: string; value: string | null }[] = [
    { id: 'date', label: 'Date', value: flow.slots.date ?? ASK_DATE },
    { id: 'time', label: 'Time', value: flow.slots.time ?? null },
    {
      id: 'party',
      label: 'Party',
      value: flow.slots.party
        ? flow.slots.party === 1
          ? '1 guest'
          : `${flow.slots.party} guests`
        : null,
    },
  ]

  // Picking applies immediately and the sheet slides away — a direct edit
  // of the same draft, no new conversation turn.
  const pick = (partial: Parameters<typeof flow.fillSlots>[0]) => {
    flow.fillSlots(partial)
    setSheet(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96, filter: 'blur(8px)' }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.45, ease: EASE },
      }}
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(6px)', transition: { duration: 0.2 } }}
    >
      {/* Squircle clipping swallows box-shadow — the shadow rides a wrapper. */}
      <div style={{ filter: 'drop-shadow(0 14px 30px rgba(20,16,28,0.14))' }}>
        <Squircle
          cornerRadius={26}
          cornerSmoothing={1}
          className="overflow-hidden bg-white"
          // Summary → details: the body is one tap target — it opens the
          // restaurant's full details view, morphing from this card.
          onClick={
            booking || confirmingCancel
              ? undefined
              : (e) => {
                  const card = e.currentTarget as Element
                  const thumb = card.querySelector('[data-draft-thumb]')
                  if (thumb) onOpenDetails(card, thumb)
                }
          }
          role="button"
          aria-label="View restaurant details"
        >
          <AnimatePresence mode="wait" initial={false}>
          {confirmingCancel ? (
            /* The X transforms the card itself into the confirmation —
               same object, graver question. Nothing is discarded until
               the user says so. */
            <motion.div
              key="cancel-confirm"
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              transition={{ duration: 0.22, ease: EASE }}
              className="flex flex-col gap-4 px-5 pt-4.5 pb-5"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.14)]">
                  <img
                    src={provider.icon}
                    alt=""
                    draggable={false}
                    className="size-7 object-contain"
                  />
                </span>
                <span className="text-[12.5px] font-semibold text-ink">OpenTable</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-[15.5px] leading-tight font-semibold tracking-[-0.01em] text-ink">
                  Cancel this reservation?
                </p>
                <p className="text-[12.5px] leading-relaxed text-ink-tertiary">
                  The draft for {place.name} will be discarded &mdash; nothing has been booked
                  yet.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmingCancel(false)
                  }}
                  className="flex h-11 flex-1 items-center justify-center rounded-full bg-black/[0.05] text-[13px] font-semibold text-ink outline-none transition-colors duration-150 active:bg-black/[0.09]"
                >
                  Keep draft
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancelled?.()
                    flow.dismiss()
                  }}
                  className="flex h-11 flex-1 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white outline-none transition-colors duration-150 active:bg-ink/85"
                >
                  Cancel booking
                </button>
              </div>
            </motion.div>
          ) : (
          <motion.div
            key="draft-body"
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex flex-col gap-4 px-5 pt-4.5 pb-4"
          >
            {/* Provider lockup + draft badge + cancel */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.14)]">
                  <img
                    src={provider.icon}
                    alt=""
                    draggable={false}
                    className="size-7 object-contain"
                  />
                </span>
                <span className="text-[12.5px] font-semibold text-ink">OpenTable</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="flex h-6 items-center rounded-full border border-dashed px-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase"
                  style={{ borderColor: 'rgba(0,0,0,0.22)', color: 'rgba(0,0,0,0.45)' }}
                >
                  Draft
                </span>
                <button
                  type="button"
                  aria-label="Cancel reservation"
                  disabled={booking}
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmingCancel(true)
                  }}
                  className="flex size-6 items-center justify-center rounded-full outline-none transition-colors duration-150 active:bg-black/[0.06]"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
                      stroke="#9a9a9a"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </span>
            </div>

            {/* The place */}
            <div className="flex items-center gap-3">
              <img
                src={place.image}
                alt=""
                draggable={false}
                data-draft-thumb
                className="size-11 shrink-0 rounded-[14px] object-cover"
              />
              <div className="flex min-w-0 flex-col gap-[2px]">
                <p className="truncate text-[15.5px] leading-tight font-semibold tracking-[-0.01em] text-ink">
                  {place.name}
                </p>
                <p className="truncate text-[12px] text-ink-tertiary">
                  {place.cuisine} &middot; {place.price}
                </p>
              </div>
            </div>

            {/* The facts — stacked ledger rows (label left, value right),
                a pattern that keeps scaling as the object grows fields.
                Empty slots read as asks; each row opens its own picker. */}
            <div className="flex flex-col rounded-[16px] bg-black/[0.03]">
              {fields.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  disabled={booking}
                  aria-label={`Edit ${f.label.toLowerCase()}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSheet(f.id)
                  }}
                  className={`mx-0 flex h-[42px] items-center justify-between gap-3 px-4 text-left outline-none transition-colors duration-150 active:bg-black/[0.04] ${
                    i > 0 ? 'border-t border-black/[0.05]' : 'rounded-t-[16px]'
                  } ${i === fields.length - 1 ? 'rounded-b-[16px]' : ''}`}
                >
                  <span className="text-[12px] text-ink-tertiary">{f.label}</span>
                  {f.value ? (
                    <span className="truncate text-[13.5px] font-semibold text-ink">
                      {f.value}
                    </span>
                  ) : (
                    <span className="text-[13.5px] font-medium text-ink-tertiary">
                      Add&hellip;
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* The go — brand-colored once the draft is complete. */}
            <button
              type="button"
              disabled={!ready || booking}
              onClick={(e) => {
                e.stopPropagation()
                flow.confirm()
              }}
              className={`flex h-12 w-full items-center justify-center rounded-full text-[13.5px] font-semibold outline-none transition-all duration-200 ${
                ready || booking ? 'text-white active:brightness-95' : 'text-ink-tertiary'
              }`}
              style={{
                background: booking
                  ? `color-mix(in srgb, ${brand} 82%, black)`
                  : ready
                    ? brand
                    : 'rgba(0,0,0,0.05)',
              }}
            >
              {booking
                ? 'Confirming\u2026'
                : ready
                  ? 'Confirm reservation'
                  : 'Add a time and party size'}
            </button>

            <p className="-mt-1 text-center text-[10.5px] text-ink-tertiary">
              Tap the card for restaurant details &middot; free to cancel until 5 PM
            </p>
          </motion.div>
          )}
          </AnimatePresence>
        </Squircle>
      </div>

      {/* Field sheets — one field, one sheet. Same materials as the
          checkout's calendar: scrim, rounded-top surface, brand-colored
          selection. Picking applies and dismisses in one move. */}
      {viewport &&
        createPortal(
          <AnimatePresence>
            {sheet && (
              <>
                <motion.div
                  key="field-scrim"
                  className="absolute inset-0 z-[46] bg-[rgba(20,16,28,0.28)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setSheet(null)}
                />
                <motion.div
                  key={`field-sheet-${sheet}`}
                  role="dialog"
                  aria-label={SHEET_TITLES[sheet]}
                  className="absolute inset-x-0 bottom-0 z-[47] rounded-t-[28px] bg-[#fcfcfc] px-5 pt-3 shadow-[0_-24px_70px_-24px_rgba(20,16,28,0.45)]"
                  style={{ paddingBottom: 'calc(var(--safe-bottom) + 22px)' }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.42, ease: EASE }}
                >
                  <div aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-black/12" />
                  <p className="mt-4 px-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                    {SHEET_TITLES[sheet]}
                  </p>

                  {sheet === 'date' && (
                    <div className="mt-2">
                      <CalendarPicker
                        selected={flow.slots.date ?? ASK_DATE}
                        brand={brand}
                        disabled={booking}
                        onPick={(label) => pick({ date: label })}
                      />
                    </div>
                  )}

                  {sheet === 'time' && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_OPTIONS.map((t) => {
                        const selected = flow.slots.time === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => pick({ time: t })}
                            className={`h-11 rounded-[14px] text-[13px] font-medium outline-none transition-colors duration-150 ${
                              selected
                                ? 'text-white'
                                : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                            }`}
                            style={selected ? { background: brand } : undefined}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {sheet === 'party' && (
                    <div className="mt-4 grid grid-cols-6 gap-2">
                      {PARTY_OPTIONS.map((n) => {
                        const selected = flow.slots.party === n
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => pick({ party: n })}
                            className={`flex h-12 items-center justify-center rounded-[14px] text-[13.5px] font-medium outline-none transition-colors duration-150 ${
                              selected
                                ? 'text-white'
                                : 'bg-black/[0.04] text-ink active:bg-black/[0.09]'
                            }`}
                            style={selected ? { background: brand } : undefined}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          viewport,
        )}
    </motion.div>
  )
}
