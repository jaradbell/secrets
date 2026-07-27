/**
 * 2C reservation module — the body that replaces the card stack inside the
 * assistant's original turn. Soft rounded rows for place / time / party,
 * provider-branded Book. Tapping a detail opens a bottom-sheet picker.
 * The X dismisses the flow and restores the stack.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PROVIDERS, PROVIDER_RESULTS } from './data'
import { useReservationFlow } from './reservationFlow'

const TIME_OPTIONS = ['6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM']
const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6]

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="#171717" strokeWidth="1.8" />
      <path
        d="M12 7.8V12l3 1.9"
        stroke="#171717"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GuestsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9.5" cy="8.5" r="3.25" stroke="#171717" strokeWidth="1.8" />
      <path
        d="M3.8 19c.7-3 3-4.7 5.7-4.7s5 1.7 5.7 4.7"
        stroke="#171717"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15.5 12.1c2 .4 3.9 1.9 4.6 4.6M14.6 5.6a3.25 3.25 0 0 1 0 5.8"
        stroke="#171717"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DetailRow({
  icon,
  value,
  placeholder,
  label,
  disabled,
  onOpen,
}: {
  icon: ReactNode
  value: string | null
  placeholder: string
  label: string
  disabled: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onOpen}
      className="flex w-full items-center gap-3.5 rounded-[26px] bg-black/[0.04] p-3.5 text-left outline-none transition-colors duration-150 active:bg-black/[0.07]"
    >
      <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={
            value
              ? 'truncate text-[14.5px] font-semibold text-ink'
              : 'truncate text-[14.5px] font-medium text-ink-tertiary'
          }
        >
          {value ?? placeholder}
        </span>
        <span className="text-[12.5px] text-ink-tertiary">{label}</span>
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#b3b3b3"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-1 shrink-0"
        aria-hidden="true"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </button>
  )
}

export function InlineConfirmCard() {
  const flow = useReservationFlow()
  const stage = flow?.stage ?? 'none'

  const [sheet, setSheet] = useState<'time' | 'party' | null>(null)
  const [pendingTime, setPendingTime] = useState<string | null>(null)
  const [pendingParty, setPendingParty] = useState<number | null>(null)

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

  const openSheet = (which: 'time' | 'party') => {
    setPendingTime(flow.slots.time ?? null)
    setPendingParty(flow.slots.party ?? null)
    setSheet(which)
  }

  const saveSheet = () => {
    if (sheet === 'time' && pendingTime) flow.fillSlots({ time: pendingTime })
    if (sheet === 'party' && pendingParty) flow.fillSlots({ party: pendingParty })
    setSheet(null)
  }

  const sheetOptions =
    sheet === 'time'
      ? TIME_OPTIONS.map((t) => ({
          key: t,
          label: t,
          selected: pendingTime === t,
          select: () => setPendingTime(t),
        }))
      : PARTY_OPTIONS.map((n) => ({
          key: String(n),
          label: n === 1 ? '1 guest' : `${n} guests`,
          selected: pendingParty === n,
          select: () => setPendingParty(n),
        }))

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center gap-3.5 rounded-[26px] bg-black/[0.04] p-3.5">
          <img
            src={place.image}
            alt=""
            draggable={false}
            className="size-[52px] shrink-0 rounded-full object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[14.5px] font-semibold text-ink">{place.name}</span>
            <span className="truncate text-[12.5px] text-ink-tertiary">
              {place.cuisine} &middot; {place.price}
            </span>
          </div>
          <button
            type="button"
            aria-label="Cancel reservation"
            onClick={() => flow.dismiss()}
            className="flex size-8 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-150 active:bg-black/[0.06]"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
                stroke="#8a8a8a"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <DetailRow
          icon={<ClockIcon />}
          value={flow.slots.time ?? null}
          placeholder="Add a time"
          label="Time"
          disabled={booking}
          onOpen={() => openSheet('time')}
        />
        <DetailRow
          icon={<GuestsIcon />}
          value={
            flow.slots.party
              ? flow.slots.party === 1
                ? '1 guest'
                : `${flow.slots.party} guests`
              : null
          }
          placeholder="Add guests"
          label="Party"
          disabled={booking}
          onOpen={() => openSheet('party')}
        />

        <button
          type="button"
          disabled={!ready || booking}
          onClick={() => flow.confirm()}
          className={`flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full text-[13.5px] font-semibold outline-none transition-all duration-200 ${
            ready || booking ? 'text-white active:brightness-95' : 'text-ink-tertiary'
          }`}
          style={{
            background: booking
              ? `color-mix(in srgb, ${provider.starColor} 82%, black)`
              : ready
                ? provider.starColor
                : 'rgba(0,0,0,0.05)',
          }}
        >
          <span
            className={`flex size-7 items-center justify-center rounded-full transition-colors duration-200 ${
              ready || booking ? 'bg-white' : 'bg-white/70'
            }`}
          >
            <img
              src={provider.icon}
              alt=""
              draggable={false}
              className={`size-[18px] transition-opacity duration-200 ${
                ready || booking ? '' : 'opacity-50'
              }`}
            />
          </span>
          {booking
            ? 'Booking with OpenTable\u2026'
            : ready
              ? `Book ${flow.slots.time} for ${flow.slots.party} on OpenTable`
              : 'Book with OpenTable'}
        </button>
      </div>

      {viewport &&
        createPortal(
          <AnimatePresence>
            {sheet && (
              <>
                <motion.div
                  key="sheet-backdrop"
                  className="absolute inset-0 z-[46] bg-black/35"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setSheet(null)}
                />
                <motion.div
                  key={`sheet-${sheet}`}
                  role="dialog"
                  aria-label={sheet === 'time' ? 'Choose a time' : 'Choose party size'}
                  className="absolute inset-x-2.5 bottom-2.5 z-[47] rounded-[32px] bg-white p-5 shadow-[0_30px_80px_-20px_rgba(10,8,14,0.4)]"
                  initial={{ y: '115%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '115%' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                >
                  <p className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                    {sheet === 'time' ? 'What time?' : 'How many guests?'}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-tertiary">
                    For your reservation at {place.name}.
                  </p>

                  <div className="mt-4 flex flex-col gap-1">
                    {sheetOptions.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={o.select}
                        className={`flex h-[48px] items-center justify-between rounded-[16px] px-4 outline-none transition-colors duration-150 ${
                          o.selected ? 'bg-black/[0.05]' : 'active:bg-black/[0.03]'
                        }`}
                      >
                        <span
                          className={`text-[14px] ${
                            o.selected ? 'font-semibold text-ink' : 'font-medium text-ink-secondary'
                          }`}
                        >
                          {o.label}
                        </span>
                        {o.selected && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-ink">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="m5 12.5 5 5L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={sheet === 'time' ? !pendingTime : !pendingParty}
                    onClick={saveSheet}
                    className={`mt-4 flex h-12 w-full items-center justify-center rounded-full text-[14px] font-semibold transition-colors duration-200 ${
                      (sheet === 'time' ? pendingTime : pendingParty)
                        ? 'bg-ink text-white active:bg-ink/85'
                        : 'bg-black/[0.06] text-ink-tertiary'
                    }`}
                  >
                    Save
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          viewport,
        )}
    </>
  )
}
