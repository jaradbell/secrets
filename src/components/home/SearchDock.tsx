/**
 * The board's search, moved to the thumb: a floating frosted chip in the
 * dock's hint slot (where "Hold or tap to speak" used to sit). Tapping it
 * slides an iOS keyboard up from the frame's bottom edge with a search
 * field riding on top — keys type for real, so the grid filters live
 * behind the overlay while you spell.
 *
 * Dismissal keeps the filter (tap away, or the search key); Cancel clears
 * it. With a query applied, the resting chip wears the words and grows a
 * small clear button.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const EASE = [0.32, 0.72, 0, 1] as const

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

/** iOS's field-clearing affordance — the small gray disc with an ×. */
function ClearButton({ onClear, size = 16 }: { onClear: () => void; size?: number }) {
  return (
    <button
      type="button"
      aria-label="Clear search"
      onPointerDown={(e) => {
        // Clear without letting the press bubble into the chip/field tap.
        e.stopPropagation()
        e.preventDefault()
        onClear()
      }}
      // The click that follows the press would still bubble into the chip
      // and reopen the sheet — swallow it too.
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[rgba(23,23,23,0.22)] outline-none"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  )
}

/* ── The keyboard ─────────────────────────────────────────────────────── */

const ROW_1 = [...'qwertyuiop']
const ROW_2 = [...'asdfghjkl']
const ROW_3 = [...'zxcvbnm']

/** One key. Pointer-down (not click) so typing feels immediate, the way a
    real keyboard commits on touch. */
function Key({
  children,
  onPress,
  label,
  dark = false,
  active = false,
  grow = 1,
  className = '',
}: {
  children: ReactNode
  onPress?: () => void
  label: string
  /** The gray function keys (shift, delete, 123, search). */
  dark?: boolean
  /** Latched state (shift armed) — renders as a lit white key. */
  active?: boolean
  grow?: number
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        onPress?.()
      }}
      className={`flex h-[42px] items-center justify-center rounded-[5.5px] shadow-[0_1px_0_rgba(0,0,0,0.30)] outline-none select-none active:brightness-90 ${
        dark && !active ? 'bg-[#abb0ba]' : 'bg-white'
      } ${className}`}
      style={{ flex: grow, touchAction: 'none' }}
    >
      {children}
    </button>
  )
}

function ShiftGlyph({ armed }: { armed: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill={armed ? '#0a0a0a' : 'none'}
      stroke="#0a0a0a"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.5 4 12h4.5v7h7v-7H20L12 3.5Z" />
    </svg>
  )
}

function BackspaceGlyph() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0a0a0a"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5h11a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H9l-6.5-7L9 5Z" />
      <path d="m12.5 9.5 5 5m0-5-5 5" />
    </svg>
  )
}

/** The iOS light keyboard, faked flat: translucent gray tray, white letter
    keys, gray function keys, the return key labeled "search" (going blue
    once there's something to search). Letters follow a one-shot shift. */
function IOSKeyboard({
  onChar,
  onBackspace,
  onSearch,
  searchable,
}: {
  onChar: (ch: string) => void
  onBackspace: () => void
  onSearch: () => void
  /** Whether the return key is live (query non-empty) — flips it blue. */
  searchable: boolean
}) {
  const [shift, setShift] = useState(false)
  const type = (ch: string) => {
    onChar(shift ? ch.toUpperCase() : ch)
    setShift(false)
  }
  const letter = (ch: string) => (
    <Key key={ch} label={ch} onPress={() => type(ch)}>
      <span className="text-[21px] leading-none text-[#0a0a0a]">
        {shift ? ch.toUpperCase() : ch}
      </span>
    </Key>
  )
  return (
    <div
      className="flex flex-col gap-[10px] bg-[rgba(209,212,218,0.94)] px-[3px] pt-2 backdrop-blur-xl"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 6px)' }}
    >
      <div className="flex gap-[6px]">{ROW_1.map(letter)}</div>
      <div className="flex gap-[6px] px-[18px]">{ROW_2.map(letter)}</div>
      <div className="flex gap-[6px]">
        <Key label="Shift" dark active={shift} grow={1.35} onPress={() => setShift((s) => !s)}>
          <ShiftGlyph armed={shift} />
        </Key>
        <div className="flex flex-[7.6] gap-[6px]">{ROW_3.map(letter)}</div>
        <Key label="Delete" dark grow={1.35} onPress={onBackspace}>
          <BackspaceGlyph />
        </Key>
      </div>
      <div className="flex gap-[6px]">
        <Key label="Numbers" dark grow={1.3}>
          <span className="text-[15px] leading-none text-[#0a0a0a]">123</span>
        </Key>
        <Key label="Space" grow={5.4} onPress={() => onChar(' ')}>
          <span className="text-[15px] leading-none text-[#0a0a0a]">space</span>
        </Key>
        <Key
          label="Search"
          dark={!searchable}
          grow={1.9}
          onPress={onSearch}
          className={searchable ? '!bg-[#007aff]' : ''}
        >
          <span
            className={`text-[15px] leading-none ${searchable ? 'text-white' : 'text-[#0a0a0a]'}`}
          >
            search
          </span>
        </Key>
      </div>
    </div>
  )
}

/* ── The dock ─────────────────────────────────────────────────────────── */

/** The blinking insertion point — iOS blue, stepped (not faded) blink. */
function Caret() {
  return (
    <motion.span
      aria-hidden
      className="inline-block h-[18px] w-[2px] shrink-0 rounded-full bg-[#007aff]"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1.1, times: [0, 0.5, 0.5, 1], repeat: Infinity }}
    />
  )
}

export function SearchDock({
  query,
  onQuery,
  placeholder = 'Search projects and threads',
  openOnMount = false,
  open: openProp,
  onOpenChange,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder?: string
  /** Rise with the keyboard already up — for hosts that summon search
      from their own affordance (5C's tool notch) rather than the chip. */
  openOnMount?: boolean
  /** Controlled open — hosts that own the search affordance (5A's tool
      notch) pass both, so dismissing the sheet can also put the chip
      away. Omit both and the chip manages itself. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [openState, setOpenState] = useState(openOnMount)
  const open = openProp ?? openState
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setOpenState(v)
    onOpenChange?.(v)
  }
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])

  const applied = query.trim()

  return (
    <>
      {/* The resting chip — rides the dock's hint slot. With a filter
          applied it wears the words and a clear affordance; while the
          keyboard is up it stands down (the field carries the moment). */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={applied ? `Search: ${applied}` : 'Search'}
        animate={open ? { opacity: 0, y: 6, scale: 0.92 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="flex h-10 items-center gap-2 rounded-full border border-white bg-[rgba(250,250,250,0.75)] px-4 shadow-[0px_2px_24px_rgba(0,0,0,0.10)] backdrop-blur-[12px] outline-none transition-transform duration-200 ease-out active:scale-[0.96]"
        style={{ pointerEvents: open ? 'none' : 'auto' }}
      >
        <SearchIcon className="shrink-0 text-ink-secondary" />
        <span
          className={`max-w-44 truncate text-[13px] font-medium tracking-[-0.01em] ${
            applied ? 'text-ink' : 'text-ink-secondary'
          }`}
        >
          {applied || 'Search'}
        </span>
        {applied && <ClearButton onClear={() => onQuery('')} />}
      </motion.button>

      {/* The open state — portaled to the frame so the keyboard rises from
          the device's own bottom edge, over the dock. */}
      {viewport &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                {/* Tap-away — keeps the filter, just puts the keyboard down.
                    A whisper of white toward the bottom keeps the field
                    legible over busy cards without dimming the results. */}
                <motion.button
                  key="search-veil"
                  type="button"
                  aria-label="Dismiss search"
                  className="absolute inset-0 z-[55] cursor-default outline-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  onClick={() => setOpen(false)}
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(252,252,252,0) 45%, rgba(252,252,252,0.55) 100%)',
                  }}
                />
                <div
                  key="search-sheet"
                  className="absolute inset-x-0 bottom-0 z-[56] flex flex-col"
                >
                  {/* The field — same frosted grammar as the chip it grew
                      from, on its own spring (a beat behind the keyboard,
                      with a little overshoot) so the rise reads as two
                      materials, not one sliding slab. A frosted projection
                      pools beneath it, lifting the field off busy artwork. */}
                  <motion.div
                    className="relative"
                    initial={{ opacity: 0, y: 72, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      y: 48,
                      scale: 0.96,
                      transition: { duration: 0.18, ease: 'easeIn' },
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 28,
                      mass: 0.9,
                      delay: 0.05,
                    }}
                    style={{ transformOrigin: '50% 100%' }}
                  >
                    {/* The projection — a progressive frost rising from the
                        keyboard's edge, fully soft at the top so it never
                        draws a line across the board. */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 -top-9 -bottom-1 backdrop-blur-[10px]"
                      style={{
                        WebkitMaskImage:
                          'linear-gradient(to top, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)',
                        maskImage:
                          'linear-gradient(to top, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)',
                        background:
                          'linear-gradient(to top, rgba(250,250,250,0.85) 40%, rgba(250,250,250,0) 100%)',
                      }}
                    />
                    <div className="relative flex items-center gap-3 px-3 pb-2.5">
                      <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-white bg-[rgba(252,252,252,0.92)] px-4 shadow-[0_10px_36px_-6px_rgba(0,0,0,0.22)] backdrop-blur-[12px]">
                        <SearchIcon className="shrink-0 text-ink-tertiary" />
                        <span className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap">
                          {query ? (
                            <span className="truncate text-[15px] tracking-[-0.01em] text-ink">
                              {query}
                            </span>
                          ) : null}
                          <Caret />
                          {!query && (
                            <span className="truncate text-[15px] tracking-[-0.01em] text-ink-tertiary">
                              {placeholder}
                            </span>
                          )}
                        </span>
                        {query && <ClearButton size={18} onClear={() => onQuery('')} />}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onQuery('')
                          setOpen(false)
                        }}
                        className="shrink-0 text-[15px] tracking-[-0.01em] text-[#007aff] outline-none active:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  >
                    <IOSKeyboard
                      onChar={(ch) => onQuery(query + ch)}
                      onBackspace={() => onQuery(query.slice(0, -1))}
                      onSearch={() => setOpen(false)}
                      searchable={!!applied}
                    />
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          viewport,
        )}
    </>
  )
}
