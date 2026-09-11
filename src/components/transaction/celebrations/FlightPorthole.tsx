/**
 * The airplane window — the flight celebration's hero object. A thick
 * graphite frame with a beveled well (the cabin is dimmed; the surface's
 * dark palette is the wall), and behind the glass a daylight sky: deep
 * blue overhead falling to a hazy horizon, a sun warming the top-left,
 * three parallax layers of turbulence-grown clouds drifting past.
 *
 * Choreography (delays off FLIGHT_T): the frame develops in from a blur
 * with the shade still drawn; the shade lifts and daylight spills onto the
 * cabin wall around the frame; the route appears on the glass and the
 * plane flies it, origin to destination (FlightRoute). On arrival the
 * window dims — a black overlay over the view, sky and clouds still faintly
 * there beneath it — the daylight on the wall goes out, and the check
 * draws large across the glass, the route resting above. As the tick
 * completes, the airline's color blooms on the wall behind the frame
 * (BrandGlow).
 */
import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'
import { BrandGlow } from './BrandGlow'
import { FlightRoute } from './FlightRoute'
import { CELEBRATION_EASE as EASE, FLIGHT_LAND, FLIGHT_T as T } from './flightTimeline'
import { FRAME, GLASS_H, GLASS_W, PORTHOLE_H, PORTHOLE_W, SHAPE, WELL } from './portholeGeometry'

type CloudLayer = {
  seed: number
  freq: [number, number]
  octaves: number
  /**
   * Alpha remap: a' = gain·a + bias. A low gain spreads the ramp over a wide
   * band of the noise, so cloud fades into sky with no edge — the mesh look.
   */
  gain: number
  bias: number
  /** Gaussian blur of the cloud mass itself, in px. */
  blur: number
  opacity: number
  /** Horizontal drift in px over the celebration (negative = leftward). */
  drift: number
  /** Vertical density profile as gradient stops [offset, alpha]. */
  band: [number, number][]
  /** Shadow tint under the white (volume). */
  shadow: string
  shadowDy: number
}

/**
 * Soft, mesh-gradient clouds: few octaves (no fine grain), a wide alpha
 * ramp and a heavy blur, so each layer is a field of large luminous blooms
 * dissolving into the blue rather than shapes with edges.
 */
const CLOUD_LAYERS: CloudLayer[] = [
  // Far haze — faint blooms high in the glass.
  {
    seed: 3,
    freq: [0.011, 0.02],
    octaves: 3,
    gain: 6,
    bias: -3.2,
    blur: 5,
    opacity: 0.5,
    drift: -12,
    band: [
      [0, 0],
      [0.12, 0.75],
      [0.4, 0.9],
      [0.62, 0],
    ],
    shadow: 'rgba(130,160,210,0.45)',
    shadowDy: 4,
  },
  // Mid — the body of the view.
  {
    seed: 8,
    freq: [0.0072, 0.013],
    octaves: 3,
    gain: 6.5,
    bias: -3.45,
    blur: 7,
    opacity: 0.92,
    drift: -24,
    band: [
      [0.18, 0],
      [0.45, 1],
      [0.8, 1],
      [1, 0.8],
    ],
    shadow: 'rgba(115,148,205,0.6)',
    shadowDy: 7,
  },
  // Near deck — bright, piled along the bottom.
  {
    seed: 5,
    freq: [0.0056, 0.0096],
    octaves: 3,
    gain: 6.5,
    bias: -3.55,
    blur: 9,
    opacity: 0.96,
    drift: -40,
    band: [
      [0.42, 0],
      [0.7, 0.95],
      [1, 1],
    ],
    shadow: 'rgba(105,140,200,0.65)',
    shadowDy: 9,
  },
]
/** Cloud mass extends past the glass so the blur has no edge to fade at. */
const CLOUD_PAD = 60

function Clouds({ layer, index, animate }: { layer: CloudLayer; index: number; animate: boolean }) {
  const id = useId()
  const filterId = `${id}f`
  const maskId = `${id}m`
  const gradId = `${id}g`
  // Three glass-widths so drift never shows an edge.
  const w = GLASS_W * 3
  const h = GLASS_H
  // Reduced motion: park each layer mid-drift and leave it there.
  const x = animate ? layer.drift : layer.drift * 0.5
  return (
    <motion.svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="absolute top-0"
      style={{ left: -GLASS_W, willChange: 'transform', opacity: layer.opacity }}
      initial={{ x: animate ? 0 : x }}
      animate={{ x }}
      transition={{ duration: 30, ease: 'linear' }}
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${layer.freq[0]} ${layer.freq[1]}`}
            numOctaves={layer.octaves}
            seed={layer.seed + index * 17}
            result="noise"
          />
          {/* White wherever the noise clears the threshold. */}
          <feColorMatrix
            in="noise"
            type="matrix"
            values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${layer.gain} ${layer.bias}`}
            result="cloud"
          />
          <feGaussianBlur in="cloud" stdDeviation={layer.blur} result="soft" />
          {/* Same mass, tinted and dropped a few px: the shaded underside. */}
          <feFlood floodColor={layer.shadow} result="tint" />
          <feComposite in="tint" in2="soft" operator="in" result="tinted" />
          <feOffset in="tinted" dx="0" dy={layer.shadowDy} result="shadow" />
          <feGaussianBlur in="shadow" stdDeviation={layer.blur * 1.5} result="shadowSoft" />
          <feMerge>
            <feMergeNode in="shadowSoft" />
            <feMergeNode in="soft" />
          </feMerge>
        </filter>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          {layer.band.map(([offset, alpha]) => (
            <stop key={offset} offset={offset} stopColor="#fff" stopOpacity={alpha} />
          ))}
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <rect width={w} height={h} fill={`url(#${gradId})`} />
        </mask>
      </defs>
      <rect
        x={0}
        y={-CLOUD_PAD}
        width={w}
        height={h + 2 * CLOUD_PAD}
        fill="#fff"
        filter={`url(#${filterId})`}
        mask={`url(#${maskId})`}
      />
    </motion.svg>
  )
}

function Sky({ animate }: { animate: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Daylight: zenith blue → horizon haze. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #276cc8 0%, #4390de 22%, #78b6ee 48%, #b2d8f7 70%, #e2f0fc 88%, #f4f9fe 100%)',
        }}
      />
      {/* Sun, top-left, with its warm haze. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 22% 10%, rgba(255,253,245,1) 0%, rgba(255,248,222,0.92) 7%, rgba(255,240,200,0.45) 17%, rgba(255,236,200,0.14) 30%, rgba(255,255,255,0) 48%)',
        }}
      />
      {CLOUD_LAYERS.map((layer, i) => (
        <Clouds key={i} layer={layer} index={i} animate={animate} />
      ))}
      {/* Horizon glow — the deck catches the light. */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: 'linear-gradient(to top, rgba(255,255,255,0.35), rgba(255,255,255,0))',
        }}
      />
    </div>
  )
}

/** How dark the window goes for the check: the view stays faintly visible. */
const DIM = 0.66

/** The takeover: on arrival the window dims for the check. */
function Dim({ at, instant }: { at: number; instant: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 bg-black"
      initial={{ opacity: instant ? DIM : 0 }}
      animate={{ opacity: DIM }}
      transition={{ delay: at, duration: instant ? 0 : 0.6, ease: 'easeOut' }}
    />
  )
}

/** The check, drawn large across the dimmed glass. Sits a little below
 *  center so the route's crown at the top has room. */
function BigCheck({ at }: { at: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-9">
      <motion.svg
        width="96"
        height="96"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.3))' }}
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: at, duration: 0.55, ease: EASE }}
      >
        <motion.path
          d="M5 12.5 10 17.5 19 7"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: at + 0.05, duration: 0.6, ease: EASE }}
        />
      </motion.svg>
    </div>
  )
}

export function FlightPorthole({
  fromCode,
  toCode,
  brandColors,
}: {
  fromCode: string
  toCode: string
  /** The airline's palette — what the wall glows once the check completes. */
  brandColors: string[]
}) {
  const reduced = useReducedMotion() ?? false
  // Reduced motion: the route is already flown, so the window dims and the
  // check draws as soon as the window has developed.
  const shadeAt = reduced ? T.windowIn + 0.05 : T.shadeUp
  const dimAt = reduced ? T.windowIn + 0.3 : FLIGHT_LAND
  const checkAt = reduced ? T.windowIn + 0.5 : T.checkIn
  // The tick finishes its stroke ~0.65s after it starts (BigCheck).
  const glowAt = checkAt + 0.55
  // Daylight on the wall: in with the shade, then out as the window dims —
  // handing the wall to the brand glow.
  const spillIn = shadeAt + 0.15
  const spillOut = dimAt + 0.25
  const spillSpan = glowAt + 0.3 - spillIn

  return (
    <motion.div
      className="relative"
      style={{ width: PORTHOLE_W, height: PORTHOLE_H }}
      initial={{ opacity: 0, scale: 0.92, filter: 'blur(16px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ delay: T.windowIn, duration: T.windowInDur, ease: EASE }}
    >
      {/* The airline's colors on the wall, once the check has landed. */}
      <BrandGlow colors={brandColors} at={glowAt} reduced={reduced} />

      {/* Daylight spilling onto the cabin wall once the shade is up. */}
      <motion.div
        aria-hidden="true"
        className="absolute -inset-20 rounded-[50%]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(125,180,245,0.6) 0%, rgba(125,180,245,0.26) 45%, rgba(125,180,245,0) 100%)',
          filter: 'blur(20px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          delay: spillIn,
          duration: spillSpan,
          times: [0, Math.min(1.1, spillOut - spillIn) / spillSpan, (spillOut - spillIn) / spillSpan, 1],
          ease: ['easeOut', 'linear', 'easeInOut'],
        }}
      />

      {/* Outer frame — graphite, lit from the top-left. */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: SHAPE,
          background: 'linear-gradient(155deg, #55505d 0%, #332f39 40%, #1f1c23 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.5), 0 30px 60px -24px rgba(0,0,0,0.75)',
        }}
      />
      {/* Bevel well — the frame's inner lip turning in toward the glass. */}
      <div
        className="absolute"
        style={{
          inset: FRAME,
          borderRadius: SHAPE,
          background: 'linear-gradient(155deg, #15131a 0%, #2a2730 55%, #433e4a 100%)',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.6)',
        }}
      />

      {/* Glass */}
      <div
        className="absolute overflow-hidden"
        style={{ inset: FRAME + WELL, borderRadius: SHAPE }}
      >
        <Sky animate={!reduced} />

        {/* Frame depth on the glass, and a diagonal sheen. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: SHAPE,
            boxShadow:
              'inset 0 22px 40px -12px rgba(5,20,60,0.5), inset 0 -12px 28px -10px rgba(255,255,255,0.25), inset 0 0 0 1px rgba(255,255,255,0.22)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(112deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.16) 47%, rgba(255,255,255,0.05) 52%, rgba(255,255,255,0) 60%)',
          }}
        />

        {/* On arrival the view dims for the check. */}
        <Dim at={dimAt} instant={reduced} />

        {/* Your route, drawn on the glass; the plane flies it. */}
        <FlightRoute fromCode={fromCode} toCode={toCode} reduced={reduced} />

        <BigCheck at={checkAt} />

        {/* The window shade — drawn at first, then lifted into the frame. */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #e6e4e9 0%, #d3d0d7 60%, #bfbcc5 100%)',
            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
          initial={{ y: 0 }}
          animate={{ y: '-104%' }}
          transition={{ delay: shadeAt, duration: reduced ? 0 : T.shadeDur, ease: [0.6, 0, 0.2, 1] }}
        >
          {/* Finger tab */}
          <div
            className="absolute bottom-[14px] left-1/2 h-[7px] w-[44px] -translate-x-1/2 rounded-full"
            style={{
              background: 'linear-gradient(180deg, #a9a5b0, #8f8b97)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 1px rgba(0,0,0,0.25)',
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
