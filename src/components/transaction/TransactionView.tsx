/**
 * Transaction prototype: a conversational exchange where the assistant
 * recommends one specific place. The user's ask sits in a black bubble, and
 * provider attribution chips (Yelp / Google Places / OpenTable) switch which
 * ranking — and whose branded star ratings — the card stack below presents.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PROVIDERS, PROVIDER_RESULTS, type ProviderId, type RankedResult } from './data'
import { PlaceCardStack } from './PlaceCardStack'
import { PlaceDetailsView, type MorphOrigin } from './PlaceDetailsView'

/** Provider attribution chips — the active one expands into a labeled pill. */
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
            // Figma: translucent capsule — 4% black fill, 20% white border,
            // 4px padding around a 32px logo disc (+ label pill when active).
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

export function TransactionView() {
  const [provider, setProvider] = useState<ProviderId>('yelp')
  const [selected, setSelected] = useState<{
    result: RankedResult
    origin: MorphOrigin
  } | null>(null)
  const results = PROVIDER_RESULTS[provider]
  const starColor = PROVIDERS.find((p) => p.id === provider)!.starColor

  // Portal target for the details overlay — resolved after mount (the frame
  // isn't in the DOM during the first render), then kept so AnimatePresence
  // stays alive through the overlay's exit animation.
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])

  // Measure the tapped card and its photo thumb so the details sheet can
  // clip open from the card's exact bounds while the photo flies from the
  // thumb's rect to the hero — all coordinates relative to the device frame.
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
    <div className="flex w-full flex-col self-stretch justify-center">
      {/* User turn — black bubble, right aligned. */}
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
          Birthday dinner ideas for Saturday
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>

      {/* Assistant turn. */}
      <div className="mt-5 flex flex-col gap-3.5">
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">Valette in Healdsburg</span> is my pick — special
          without being stuffy, and close to where you&rsquo;re staying. Book it, or see the
          other options?
        </p>
        <ProviderChips active={provider} onSelect={setProvider} />

        {/* Ranked results — remounts per provider so the deck resets to the
            top pick and the fan re-settles. */}
        <div className="mt-1">
          <PlaceCardStack
            key={provider}
            results={results}
            starColor={starColor}
            onSelect={openDetails}
          />
        </div>

        {/* Compare CTA */}
        <button
          type="button"
          className="mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-black/[0.05] px-4 py-2.5 text-[12px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
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
      </div>

      {/* Details overlay — clips open from the tapped card. Portalled into
          the device frame so it can cover the full screen. */}
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
    </div>
  )
}
