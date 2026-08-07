/**
 * Conversation chrome pinned to the top of the frame: a collapse control on
 * the left, the context island in the center, and new-conversation + menu
 * affordances on the right.
 *
 * The island names the conversation and will eventually collect the
 * conversation's receipts — the ticket badge is the first hint of that.
 * Island visuals from Figma node 2377:73623 (frosted pill, white hairline,
 * soft 40px shadow, ticket badge in a quiet bordered disc).
 */
import type { ReactNode } from 'react'

/** Bare glyph button — 44px hit target, ink strokes, no container. */
function GlyphButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center outline-none transition-transform duration-200 ease-out active:scale-90"
    >
      {children}
    </button>
  )
}

export function ConversationHeader({
  title,
  onIslandTap,
  onCollapse,
}: {
  title: string
  /** Tapping the island opens the conversation's collected receipts. */
  onIslandTap?: () => void
  /** Collapse steps the user back up an altitude (1C: thread → home). */
  onCollapse?: () => void
}) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center px-4"
      style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}
    >
      {/* Protective scrim — the thread scrolls up behind the header, so a
          canvas fade keeps the chrome legible instead of colliding with
          cards and copy sliding beneath it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[116px]"
        style={{
          background:
            'linear-gradient(to bottom, #fcfcfc 0%, #fcfcfc 50%, rgba(252,252,252,0.75) 70%, rgba(252,252,252,0) 100%)',
        }}
      />
      {/* Collapse */}
      <div className="flex justify-start">
        <GlyphButton label="Collapse conversation" onClick={onCollapse}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M6 7.5 10 3.5 14 7.5M6 12.5 10 16.5 14 12.5"
              stroke="#171717"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </GlyphButton>
      </div>

      {/* Context island */}
      <button
        type="button"
        aria-label={`Conversation: ${title}`}
        onClick={onIslandTap}
        className="flex items-center gap-0.5 rounded-[24px] border border-white bg-[rgba(250,250,250,0.7)] py-[9px] pr-2 pl-3 shadow-[0px_2px_40px_0px_rgba(0,0,0,0.1)] outline-none backdrop-blur-[12px] transition-transform duration-200 ease-out active:scale-[0.97]"
      >
        <span className="w-[136px] overflow-hidden text-left text-[12px] font-medium tracking-[0.12px] text-ellipsis whitespace-nowrap text-[#171717]">
          {title}
        </span>
        {/* Receipts badge — where the conversation's receipts will collect. */}
        <span className="flex items-center rounded-[30px] border border-[#ececec] bg-[#f5f5f5] p-[3px]">
          <span className="flex size-[18px] items-center justify-center">
            <img src="/nav/ticket.svg" alt="" draggable={false} className="h-[9px] w-auto" />
          </span>
        </span>
      </button>

      {/* Menu */}
      <div className="flex items-center justify-end gap-1">
        <GlyphButton label="Menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="#171717" aria-hidden="true">
            <circle cx="4" cy="10" r="1.7" />
            <circle cx="10" cy="10" r="1.7" />
            <circle cx="16" cy="10" r="1.7" />
          </svg>
        </GlyphButton>
      </div>
    </div>
  )
}
