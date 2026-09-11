/**
 * The route on the glass — the celebration's story, drawn where an
 * in-flight display would put it: an arc that follows the window frame,
 * inset just inside the glass, from the left shoulder over the top to the
 * right. Origin dot and code at one end, destination at the other. On
 * departure a small airliner lifts off the origin and flies the arc, the
 * flown stretch brightening behind it; it descends into the destination,
 * whose dot lands as its code brightens — then the window dims and the
 * check takes over (see FlightPorthole). The route settles to half
 * strength above it, the keepsake of where you're going.
 *
 * The arc is an ellipse concentric with the glass's top cap (radii from
 * portholeGeometry, less an inset), so it reads as part of the frame. One
 * progress motion value drives the flown line, the plane's position and
 * heading (sampled from the path itself) and its fade, so nothing drifts.
 */
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'
import { CELEBRATION_EASE as EASE, FLIGHT_LAND, FLIGHT_T as T, LAND_FRAC } from './flightTimeline'
import { GLASS_H, GLASS_RX, GLASS_RY, GLASS_W } from './portholeGeometry'

const WHITE = '#fff'
const TRACK = 'rgba(255,255,255,0.34)'
const LINE = 2
/** Where the route rests once the window has flooded. */
const SETTLED = 0.5

/** How far inside the glass edge the arc runs. */
const INSET = 16
const RX = GLASS_RX - INSET
const RY = GLASS_RY - INSET
const CX = GLASS_W / 2
const CY = GLASS_RY
/** Each end leaves the frame this far above the top cap's horizontal. */
const END_DEG = 20
const END = (END_DEG * Math.PI) / 180
const FROM = { x: CX - RX * Math.cos(END), y: CY - RY * Math.sin(END) }
const TO = { x: CX + RX * Math.cos(END), y: CY - RY * Math.sin(END) }
const f = (n: number) => n.toFixed(2)
const ARC = `M${f(FROM.x)} ${f(FROM.y)} A${f(RX)} ${f(RY)} 0 0 1 ${f(TO.x)} ${f(TO.y)}`
/** Codes sit under their dots, nudged in from the glass edge. */
const CODE_DX = 6
const CODE_DY = 26
const DOT_R = 3.4

/** Off the origin briskly, settle onto the destination. */
const FLIGHT_EASE = [0.5, 0.05, 0.2, 1] as const
/**
 * Fractions of the flight: the plane starts descending into the pin
 * (fading, shrinking) at DESCEND, is gone by LAND, when the pin lands.
 */
const DESCEND = 0.72
const LAND = LAND_FRAC
/**
 * The arc's ends are steep; the plane follows the tangent at this fraction
 * so it climbs off the origin and descends into the destination without
 * ever pointing straight up.
 */
const HEADING_DAMP = 0.7

/**
 * Top-view airliner silhouette, nose to +x, in a 32 × 24 box — so a
 * heading of 0° is level flight to the right.
 */
const PLANE_D =
  'M30 12C30 11.1 29.2 10.4 27.6 10.3L17.2 10.3 10.4 1.8 8.6 1.8 12.9 10.3 8 10.3 5.4 6.6 4.1 6.6 5 10.5 4.2 11.2 4.2 12.8 5 13.5 4.1 17.4 5.4 17.4 8 13.7 12.9 13.7 8.6 22.2 10.4 22.2 17.2 13.7 27.6 13.7C29.2 13.6 30 12.9 30 12Z'

const fadeIn = (delay: number, duration = 0.45) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay, duration, ease: EASE },
})

/** A solid dot at each end of the route. */
function Dot({
  x,
  y,
  delay,
  landAt,
}: {
  x: number
  y: number
  delay: number
  /** Destination: the dot lands (pops in) at this time. Omit for the origin. */
  landAt?: number
}) {
  if (landAt === undefined) {
    return <motion.circle cx={x} cy={y} r={DOT_R} fill={WHITE} {...fadeIn(delay)} />
  }
  return (
    <motion.circle
      cx={x}
      cy={y}
      fill={WHITE}
      initial={{ r: 0 }}
      animate={{ r: [0, DOT_R * 1.35, DOT_R] }}
      transition={{ delay: landAt, duration: 0.4, ease: 'easeOut', times: [0, 0.55, 1] }}
    />
  )
}

function Code({
  x,
  y,
  delay,
  landAt,
  children,
}: {
  x: number
  y: number
  delay: number
  /** Destination: reads at half strength until the plane lands there. */
  landAt?: number
  children: ReactNode
}) {
  const text = {
    x,
    y,
    textAnchor: 'middle' as const,
    fill: WHITE,
    style: { fontSize: 11, fontWeight: 500, letterSpacing: '0.1em' },
  }
  if (landAt === undefined) {
    return (
      <motion.text {...text} {...fadeIn(delay)}>
        {children}
      </motion.text>
    )
  }
  const total = landAt + 0.35 - delay
  return (
    <motion.text
      {...text}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.62, 0.62, 1] }}
      transition={{
        delay,
        duration: total,
        times: [0, 0.45 / total, (landAt - delay) / total, 1],
        ease: ['easeOut', 'linear', 'easeOut'],
      }}
    >
      {children}
    </motion.text>
  )
}

export function FlightRoute({
  fromCode,
  toCode,
  reduced,
}: {
  fromCode: string
  toCode: string
  /** Reduced motion: the route is simply there, already flown. */
  reduced: boolean
}) {
  const land = reduced ? undefined : T.depart + T.flightDur * LAND

  // 0 → 1 over the flight. Drives the flown line directly, and the plane
  // through the path geometry below.
  const trackRef = useRef<SVGPathElement>(null)
  const progress = useMotionValue(reduced ? 1 : 0)
  const planeX = useMotionValue(FROM.x)
  const planeY = useMotionValue(FROM.y)
  const heading = useMotionValue(0)
  const planeOpacity = useTransform(progress, [0, 0.06, DESCEND, LAND], [0, 1, 1, 0])
  const planeScale = useTransform(progress, [DESCEND, LAND], [1, 0.7])

  useMotionValueEvent(progress, 'change', (p) => {
    const path = trackRef.current
    if (!path) return
    const total = path.getTotalLength()
    const at = p * total
    const here = path.getPointAtLength(at)
    const behind = path.getPointAtLength(Math.max(0, at - 0.5))
    const ahead = path.getPointAtLength(Math.min(total, at + 0.5))
    planeX.set(here.x)
    planeY.set(here.y)
    heading.set(
      ((Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI) * HEADING_DAMP,
    )
  })

  useEffect(() => {
    if (reduced) return
    const controls = animate(progress, 1, {
      delay: T.depart,
      duration: T.flightDur,
      ease: FLIGHT_EASE,
    })
    return () => controls.stop()
  }, [progress, reduced])

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      initial={{ opacity: reduced ? SETTLED : 1 }}
      animate={{ opacity: SETTLED }}
      transition={{ delay: FLIGHT_LAND + 0.3, duration: 0.7, ease: 'easeOut' }}
    >
      <svg
        viewBox={`0 0 ${GLASS_W} ${GLASS_H}`}
        className="absolute inset-0 h-full w-full"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(6,20,50,0.35))' }}
        fill="none"
      >
        {/* The track: the whole route, following the frame. */}
        <motion.path
          ref={trackRef}
          d={ARC}
          stroke={TRACK}
          strokeWidth={LINE}
          strokeLinecap="round"
          {...fadeIn(T.routeIn, 0.6)}
        />
        {/* The flown route, bright, keeping pace with the plane. */}
        <motion.path
          d={ARC}
          stroke={WHITE}
          strokeWidth={LINE}
          strokeLinecap="round"
          style={{ pathLength: progress, filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))' }}
        />
        <Dot x={FROM.x} y={FROM.y} delay={T.routeIn} />
        <Dot x={TO.x} y={TO.y} delay={T.routeIn + 0.2} landAt={land} />
        <Code x={FROM.x + CODE_DX} y={FROM.y + CODE_DY} delay={T.routeIn + 0.05}>
          {fromCode}
        </Code>
        <Code x={TO.x - CODE_DX} y={TO.y + CODE_DY} delay={T.routeIn + 0.25} landAt={land}>
          {toCode}
        </Code>
      </svg>

      {/* The plane: centered on the sampled path point, heading along it. */}
      {!reduced && (
        <motion.div
          className="absolute left-0 top-0 flex size-7 items-center justify-center"
          style={{
            margin: -14,
            x: planeX,
            y: planeY,
            rotate: heading,
            opacity: planeOpacity,
            scale: planeScale,
            filter: 'drop-shadow(0 2px 3px rgba(6,20,50,0.6))',
          }}
        >
          <svg width="26" height="19.5" viewBox="0 0 32 24">
            <path d={PLANE_D} fill={WHITE} stroke={WHITE} strokeWidth={0.6} strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  )
}
