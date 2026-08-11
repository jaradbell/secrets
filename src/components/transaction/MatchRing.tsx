/**
 * The assistant's match-score language, in two expressions, both in the
 * app's own ink-and-neutral palette rather than an accent color. The ring
 * is the hero treatment — big enough for its arc to mean something, it
 * crowns the details view in monochrome white with the "Match Score" label.
 * The chip is the compact one: an ink pill for list rows and map POIs
 * (the same weight as the active sort chip and the lead map pin), where a
 * 30px arc can't show the difference between 88 and 76 anyway and the
 * number does the work.
 *
 * Section 7 explores alternates via MatchStyleProvider:
 *   'score'       — the current language above (7A, and the default).
 *   'rank'        — POIs and rows carry the standing (1, 2, 3…) instead of
 *                   the 0–100 score; the details label picks it up (7B).
 *   'gradient'    — builds on rank: circles take a solid hue sampled off
 *                   the score spectrum (blue → teal → green; low scores go
 *                   colorless) and the details ring strokes the full
 *                   spectrum along its arc (7C).
 *   'photo-rank'  — the standing rides the row's photo as a corner badge,
 *                   the roommate-list motif; the rail stands down (7D).
 *   'number-chip' — a bare rank numeral with the match percentage chipped
 *                   beneath; POIs go white carrying both numbers (7E).
 */
import { createContext, useContext, useId, type ReactNode } from 'react'

export type MatchStyle = 'score' | 'rank' | 'gradient' | 'photo-rank' | 'number-chip'

const MatchStyleContext = createContext<MatchStyle>('score')

export function MatchStyleProvider({
  style,
  children,
}: {
  style: MatchStyle
  children: ReactNode
}) {
  return <MatchStyleContext.Provider value={style}>{children}</MatchStyleContext.Provider>
}

export const useMatchStyle = () => useContext(MatchStyleContext)

/** The score spectrum — hue travels blue → teal → green as the match
    climbs (the quality-meter grammar: green is a great fit, teal a good
    one, blue merely fine). Saturation and lightness hold still so the
    family stays coherent while the hue does the talking. */
const HUE_LOW = 212
const HUE_HIGH = 142

/** One hue off the spectrum at progress t (0 = floor, 1 = best). */
function spectrumHex(t: number): string {
  const h = HUE_LOW + (HUE_HIGH - HUE_LOW) * t
  return hslHex(h, 0.64, 0.47)
}

/** The details ring's stroke stops, tail → mid → tip: the arc sweeps the
    full spectrum, blue through teal into green. */
export const MATCH_GRADIENT = [spectrumHex(0), spectrumHex(0.5), spectrumHex(1)] as const

/** Scores below this stay colorless — a weak match doesn't earn a color. */
const COLOR_FLOOR = 65

/** The solid fill for a given score — one hue sampled off the spectrum,
    with a legible text color for it — or null below the floor (caller
    falls back to the neutral chip looks). */
export function matchFill(score: number): { bg: string; text: string } | null {
  if (score < COLOR_FLOOR) return null
  const t = Math.max(0, Math.min(1, (score - COLOR_FLOOR) / (92 - COLOR_FLOOR)))
  const bg = spectrumHex(t)
  const ch = (i: number) => parseInt(bg.slice(1 + i * 2, 3 + i * 2), 16)
  const yiq = (ch(0) * 299 + ch(1) * 587 + ch(2) * 114) / 1000
  return { bg, text: yiq > 165 ? '#0d0d0d' : '#ffffff' }
}

/** hsl() → hex, so spectrum stops are plain strings the SVG defs accept. */
function hslHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * v)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export type ChipLook = 'ink' | 'soft' | 'faint' | 'white'

/** The chip's volume follows the score — great matches go ink, good ones
    a soft neutral, the rest faint — so 88 never reads the same as 76, and
    only the standout carries button-weight. */
export function matchLook(score: number): ChipLook {
  if (score >= 85) return 'ink'
  if (score >= 75) return 'soft'
  return 'faint'
}

const LOOKS: Record<ChipLook, string> = {
  ink: 'bg-ink text-white',
  soft: 'bg-black/[0.08] text-ink',
  faint: 'bg-black/[0.04] text-ink-secondary',
  /** Map POIs over busy streets — solid white, ink number. */
  white: 'bg-white text-ink',
}

export function MatchChip({
  score,
  look,
  className = '',
}: {
  score: number
  /** Defaults to the score's own tier; the map passes ink/white explicitly. */
  look?: ChipLook
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold ${LOOKS[look ?? matchLook(score)]} ${className}`}
    >
      {score}
    </span>
  )
}

/** The rank expression of the chip — a true circle carrying the standing
    (1, 2, 3…). Neutral looks by default; the gradient style passes a fill
    sampled from the ramp instead. */
export function RankChip({
  rank,
  look,
  fill,
  size = 27,
  className = '',
}: {
  rank: number
  /** Neutral fallback when no fill applies — same vocabulary as MatchChip. */
  look?: ChipLook
  /** Solid ramp color (from matchFill); null/undefined falls back to look. */
  fill?: { bg: string; text: string } | null
  size?: number
  className?: string
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${
        fill ? '' : LOOKS[look ?? 'white']
      } ${className}`}
      style={{ width: size, height: size, ...(fill ? { background: fill.bg, color: fill.text } : null) }}
    >
      {rank}
    </span>
  )
}

export function MatchRing({
  score,
  size,
  stroke,
  color,
  track,
  gradient,
  children,
}: {
  score: number
  size: number
  stroke: number
  /** Arc color — white/95 on the dark hero, ink on light surfaces. */
  color: string
  /** Track color behind the arc — white/20 on the dark hero, light on white. */
  track: string
  /** Gradient stops for the arc (the 7C treatment) — overrides color. Two
      stops read [tail, tip]; three read [tail, mid, tip]. */
  gradient?: readonly string[]
  /** What sits in the middle — typically the score. */
  children: ReactNode
}) {
  const gradId = useId().replace(/:/g, '')
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = score / 100
  const arc = { cx: size / 2, cy: size / 2, r, fill: 'none', strokeWidth: stroke } as const
  /* Normalized [tail, mid, tip] — the two halves meet at mid. */
  const stops = gradient
    ? gradient.length >= 3
      ? [gradient[0], gradient[1], gradient[2]]
      : [gradient[0], mixHex(gradient[0], gradient[1]), gradient[1]]
    : null
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle {...arc} stroke={track} />
        {stops ? (
          /* A single linear gradient can't run *along* a circle — it would
             put the start color at both ends of the sweep. So the arc is
             drawn as two geometric halves, each with its own linear ramp
             (tail→mid, mid→tip): the classic SVG conic approximation. In
             local coords the dash starts at 3 o'clock and runs clockwise,
             so half A is the bottom semicircle (right-to-left) and half B
             the top (left-to-right); the caps at 9 o'clock share the mid
             color, hiding the seam. */
          <>
            <defs>
              <linearGradient id={`${gradId}a`} x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={stops[0]} />
                <stop offset="100%" stopColor={stops[1]} />
              </linearGradient>
              <linearGradient id={`${gradId}b`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={stops[1]} />
                <stop offset="100%" stopColor={stops[2]} />
              </linearGradient>
            </defs>
            <circle
              {...arc}
              stroke={`url(#${gradId}a)`}
              strokeLinecap="round"
              strokeDasharray={`${c * Math.min(p, 0.5)} ${c}`}
            />
            {p > 0.5 && (
              <circle
                {...arc}
                stroke={`url(#${gradId}b)`}
                strokeLinecap="round"
                strokeDasharray={`${c * (p - 0.5)} ${c}`}
                strokeDashoffset={-c * 0.5}
              />
            )}
          </>
        ) : (
          <circle
            {...arc}
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </div>
  )
}

/** Even mix of two hex colors — the seam color where the arc's halves meet. */
function mixHex(a: string, b: string): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2]
    .map((i) => Math.round((ch(a, i) + ch(b, i)) / 2).toString(16).padStart(2, '0'))
    .join('')}`
}
