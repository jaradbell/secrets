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
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckoutView } from './CheckoutView'
import { ConversationHeader } from './ConversationHeader'
import { PROVIDERS, PROVIDER_RESULTS, type ProviderId, type RankedResult } from './data'
import { InlineConfirmCard } from './InlineConfirmCard'
import { PlaceCardStack } from './PlaceCardStack'
import { PlaceDetailsView, type MorphOrigin } from './PlaceDetailsView'
import { useReservationFlow } from './reservationFlow'

export type TransactionVariant = '2a' | '2c' | '2d'

function ProviderChips({
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

export function TransactionView({ variant = '2a' }: { variant?: TransactionVariant }) {
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

  // Close details the moment 2C's follow-up begins; booking lives in-thread.
  useEffect(() => {
    if (variant === '2c' && stage === 'followUp') setSelected(null)
  }, [variant, stage])

  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])

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
      {/* User turn */}
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
          Birthday dinner ideas for Saturday
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>

      {/* Assistant turn — one object. In 2C, booking rewrites this turn:
          prose updates, chips leave, stack becomes the reservation module.
          X on the place row dismisses back to this pick state. */}
      <div className="mt-2.5 flex flex-col gap-3.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={bookingTurn ? 'reserve' : 'pick'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="text-[14px] leading-relaxed text-ink"
          >
            {bookingTurn ? (
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
          {bookingTurn ? (
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
      </div>

      {viewport && createPortal(<ConversationHeader title="Sisters Birthday Weekend" />, viewport)}

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
