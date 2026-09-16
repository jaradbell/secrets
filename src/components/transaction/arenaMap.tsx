/**
 * The arena bowl — 8C's answer to the flight's basemap, drawn once and
 * shared. Three seating rings around the court in a 393×290 hero frame
 * (the sheet covers the hero from y≈196, so the story composes above that
 * line and the outer bowl crops off the top like a map running past its
 * frame). A listing's `SeatSpot` lights its section: a run on one ring,
 * the marker at its middle, and a section pill.
 *
 *   ArenaHero  — the ticket sheet's full-bleed hero: bowl, lit section,
 *                dotted stitch from the court, marker, and section pill.
 *   ArenaThumb — the listing card's thumbnail: the whole bowl in a small
 *                frame with the section lit, nothing else.
 */
import { motion } from 'framer-motion'

/** Where a section sits: the lit run (an SVG path in hero coordinates),
    its midpoint (the marker), and where the section pill can sit clear of
    the rings. `width` overrides the run's stroke (floor seats are thin). */
export type SeatSpot = {
  d: string
  cx: number
  cy: number
  label: { x: number; y: number }
  width?: number
}

/** The court's center — where the stitch starts. */
export const COURT_CENTER = { x: 196, y: 80 }

/** Rings, aisles, and the court — the bowl's fixed geometry. */
function Bowl({ floor = '#eef0f2' }: { floor?: string }) {
  return (
    <>
      {/* Bowl rings, outer to lower. */}
      <rect x="36" y="-51" width="320" height="262" rx="92" stroke="#e0e4e8" strokeWidth="30" />
      <rect x="74" y="-15" width="244" height="190" rx="66" stroke="#d2d8de" strokeWidth="28" />
      <rect x="110" y="19" width="172" height="122" rx="44" stroke="#c3cad2" strokeWidth="24" />
      {/* Aisle seams — quiet radial breaks in the bowl. */}
      {[52, 128, 196, 264, 340].map((x) => (
        <path key={x} d={`M${x} -70V230`} stroke={floor} strokeWidth="3" opacity="0.55" />
      ))}
      {/* The court. */}
      <rect x="136" y="44" width="120" height="72" rx="7" fill="#e8c894" />
      <rect x="136" y="44" width="120" height="72" rx="7" stroke="#c49a5c" strokeWidth="1.5" />
      <path d="M196 44v72" stroke="#c49a5c" strokeWidth="1.5" />
      <circle cx="196" cy="80" r="11" stroke="#c49a5c" strokeWidth="1.5" />
      <rect x="136" y="66" width="22" height="28" stroke="#c49a5c" strokeWidth="1.5" />
      <rect x="234" y="66" width="22" height="28" stroke="#c49a5c" strokeWidth="1.5" />
    </>
  )
}

/** The lit section — a run of the ring in the sheet's gold. */
function LitRun({ spot, animate = true }: { spot: SeatSpot; animate?: boolean }) {
  return (
    <motion.path
      d={spot.d}
      stroke="#f6c944"
      strokeWidth={spot.width ?? 24}
      strokeLinecap="round"
      initial={animate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }}
    />
  )
}

export function ArenaHero({ spot, section }: { spot: SeatSpot; section: string }) {
  // The stitch bends toward the seat from the court's center — a quadratic
  // whose control point pulls a little toward the court, so the dotted line
  // leaves the floor before it heads out into the bowl.
  const ctrl = {
    x: (COURT_CENTER.x + spot.cx) / 2 + (spot.cy - COURT_CENTER.y) * 0.25,
    y: (COURT_CENTER.y + spot.cy) / 2 - (spot.cx - COURT_CENTER.x) * 0.25,
  }
  // The stitch stops short of the marker so the dots don't pile on it.
  const dx = spot.cx - COURT_CENTER.x
  const dy = spot.cy - COURT_CENTER.y
  const len = Math.hypot(dx, dy) || 1
  const end = { x: spot.cx - (dx / len) * 8, y: spot.cy - (dy / len) * 8 }
  const pillW = 30 + section.length * 7.5
  // Side-bowl labels sit near the frame's edge — keep the pill a clear
  // margin in from either side so it never kisses the screen.
  const labelX = Math.min(Math.max(spot.label.x, pillW / 2 + 14), 393 - pillW / 2 - 14)

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 393 290" fill="none" aria-hidden="true">
      <rect width="393" height="290" fill="#eef0f2" />
      <Bowl />
      <LitRun spot={spot} />
      {/* Dotted stitch from the court out to your seats. */}
      <motion.path
        d={`M${COURT_CENTER.x} ${COURT_CENTER.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`}
        stroke="#171717"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
      />
      <circle cx={COURT_CENTER.x} cy={COURT_CENTER.y} r="4.5" fill="#171717" stroke="#fff" strokeWidth="2" />
      <motion.circle
        cx={spot.cx}
        cy={spot.cy}
        r="4.5"
        fill="#171717"
        stroke="#fff"
        strokeWidth="2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.25 }}
      />
      {/* The section pill — white so it reads wherever the ring leaves room. */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.15, duration: 0.3 }}
      >
        <rect
          x={labelX - pillW / 2}
          y={spot.label.y - 9}
          width={pillW}
          height="18"
          rx="9"
          fill="#ffffff"
          stroke="rgba(0,0,0,0.08)"
        />
        <text
          x={labelX}
          y={spot.label.y + 4}
          textAnchor="middle"
          fill="#171717"
          style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em' }}
        >
          SEC {section}
        </text>
      </motion.g>
    </svg>
  )
}

/** The listing card's thumbnail — the whole bowl framed, the section lit. */
export function ArenaThumb({ spot, className }: { spot: SeatSpot; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="16 -71 361 302"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <Bowl floor="#ffffff" />
      <LitRun spot={spot} animate={false} />
    </svg>
  )
}
