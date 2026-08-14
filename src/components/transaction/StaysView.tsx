/**
 * Stays list-result prototype (8D): the suggested-object moment for a
 * hotel / rental search. The user's ask lands in a bubble, marketplace
 * chips (Airbnb, Vrbo, Expedia) attribute whose inventory the answer
 * carries, and the assistant's lead listing fronts a swipeable card deck
 * (the Figma stay card, node 2377:73083, as the object class). "View
 * More" clip-morphs the full list open — the stays answer to the flights
 * prototype's full-results surface.
 */
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConversationHeader } from './ConversationHeader'
import { StayCardStack } from './StayCard'
import { PROVIDER_STAYS, StayChips, type StayProviderId } from './staysData'
import { StaysListView, type StaysListOrigin } from './StaysListView'

export function StaysView({ title = 'LA Long Weekend' }: { title?: string }) {
  const [provider, setProvider] = useState<StayProviderId>('airbnb')
  // The full list surface, morphed open from the View More pill. Provider
  // state is shared with the thread, so toggles carry both ways.
  const [listOrigin, setListOrigin] = useState<StaysListOrigin | null>(null)

  const stays = PROVIDER_STAYS[provider]
  const lead = stays[0]

  // Portal target for the header and list overlay — #app-screen keeps the
  // dock's orb above them (see TransactionView's note on stacking).
  const [screenEl, setScreenEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setScreenEl(document.getElementById('app-screen'))
  }, [])

  return (
    <div
      className="-mx-4 -mb-[190px] flex min-h-0 flex-col self-stretch justify-start overflow-x-hidden overflow-y-auto px-4 pt-[84px] pb-[220px]"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* User turn */}
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
          Find a place to stay in Los Angeles for the long weekend
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-ink-tertiary">just now</p>
      </div>

      {/* Assistant turn — prose, sourcing chips, then the card deck. */}
      <div className="mt-2.5 flex flex-col gap-3.5">
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">{lead.title}</span> is the best fit —{' '}
          {lead.specs.toLowerCase()}, rated {lead.rating} by {lead.reviews} guests, $
          {lead.price.toLocaleString()} for {lead.nights} nights. Book it, or see more
          places?
        </p>

        <StayChips active={provider} onSelect={setProvider} />

        <div className="mt-1">
          <StayCardStack key={provider} stays={stays} />
        </div>

        <button
          type="button"
          onClick={(e) => {
            if (!screenEl) return
            // The list surface clip-morphs open from this pill's exact
            // bounds, measured against the device frame.
            const v = screenEl.getBoundingClientRect()
            const b = e.currentTarget.getBoundingClientRect()
            setListOrigin({
              top: b.top - v.top,
              left: b.left - v.left,
              right: v.right - b.right,
              bottom: v.bottom - b.bottom,
            })
          }}
          className="mx-auto flex items-center gap-1.5 rounded-full bg-black/[0.05] px-4 py-2.5 text-[12px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
        >
          View More
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

      {screenEl && createPortal(<ConversationHeader title={title} />, screenEl)}

      {/* Full list — under the dock's orb, so voice stays live over it. */}
      {screenEl &&
        createPortal(
          <AnimatePresence>
            {listOrigin && (
              <StaysListView
                key="stays-list"
                origin={listOrigin}
                provider={provider}
                onSelectProvider={setProvider}
                onClose={() => setListOrigin(null)}
              />
            )}
          </AnimatePresence>,
          screenEl,
        )}
    </div>
  )
}
