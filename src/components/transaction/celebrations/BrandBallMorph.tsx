/**
 * The brand ball — 8B's place-booking celebration. One continuous line
 * of ink, three provider endings, and a cartoon's sense of weight:
 *
 *   1  A flat 2D ball in the provider's color drops in — stretching
 *      as it falls, squashing on impact, each bounce slapping a
 *      little ripple off the floor.
 *   2  On the last impact its shape TRANSFORMS into the check: the
 *      ball is literally a zero-length stroke with round caps on the
 *      check's corner, and it unrolls both ways into the mark while
 *      the stroke thins from ball-width to check-width. The finished
 *      check lands with a wobble — booked.
 *   3  A breath.
 *   4  Then it REDRAWS itself into the provider's logo: the line
 *      drains toward the check's tip, the gathered ink HOPS across
 *      to the logo's first point, and the mark draws itself out of
 *      it — Google's G runs around in its four colors and finishes
 *      with the bar; OpenTable's ring unrolls and seats its dot;
 *      Yelp's burst blooms straight out of the ink. Every finale
 *      pops, and a handful of brand-color confetti rides the pop.
 *
 * The drop, unroll, drain, hop, and logo strokes are one rAF loop of
 * closed-form math against BRAND_T; the wobbles, pops, springs, and
 * confetti are Framer delays off the same clock.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProviderId } from '../data'
import {
  BRAND_T as T,
  brandBallY,
  brandSquash,
  clamp01,
  easeOutCubic,
  prog,
  sceneNow,
} from './brandTimeline'

/** The hero's px box; the mark's permanent center within it. */
const W = 340
const H = 230
const CX = 170
const CY = 112
/** The act's canvas runs far past the layout box so the launch can
    start below the screen's bottom edge (the takeover clips it). */
const ACT_H = 780

/** The ball (also the ink dot's cap diameter at rest). */
const BALL_R = 20

// ── The check: 2E's 24-box geometry × 5.2, centered on (CX, CY) ─────────
const A = { x: 133.6, y: 113.3 }
const B = { x: 159.6, y: 139.3 } // the corner — where the ball lands
const C = { x: 206.4, y: 84.7 } // the tip — where the ink drains to
const CHECK_D = `M${A.x} ${A.y} L${B.x} ${B.y} L${C.x} ${C.y}`
const L1 = Math.hypot(B.x - A.x, B.y - A.y) // 36.77
const L2 = Math.hypot(C.x - B.x, C.y - B.y) // 71.91
const LEN = L1 + L2
const CHECK_W = 9

/** The floor line the ball bounces on (its contact point). */
const FLOOR_Y = B.y + BALL_R

/** bounceOut's impact times, in scene seconds — ripples fire on these. */
const IMPACTS = [0.3636, 0.7273, 0.9091].map((p) => T.fallStart + p * T.fallDur)

/** A stroke of the logo plan: drawn in sequence by the shared ink. */
type Stroke = { d: string; len: number; color: string; w: number }

// ── Google's G: four arcs + the bar, drawn counterclockwise from the
//    opening — exactly how the mark is built. r 34, stroke 15. ──────────
const GR = 34
const gp = (deg: number) => {
  const a = (deg * Math.PI) / 180
  return `${(CX + GR * Math.cos(a)).toFixed(2)} ${(CY - GR * Math.sin(a)).toFixed(2)}`
}
const QUARTER = (GR * Math.PI) / 2 // 53.41
const G_STROKES: Stroke[] = [
  { d: `M${gp(45)} A${GR} ${GR} 0 0 0 ${gp(135)}`, len: QUARTER, color: '#EA4335', w: 15 },
  { d: `M${gp(135)} A${GR} ${GR} 0 0 0 ${gp(225)}`, len: QUARTER, color: '#FBBC04', w: 15 },
  { d: `M${gp(225)} A${GR} ${GR} 0 0 0 ${gp(315)}`, len: QUARTER, color: '#34A853', w: 15 },
  {
    d: `M${gp(315)} A${GR} ${GR} 0 0 0 ${gp(360)} L${CX + 2} ${CY}`,
    len: QUARTER / 2 + (GR - 2),
    color: '#4285F4',
    w: 15,
  },
]

// ── OpenTable: the ring unrolls from where the ink arrives (its left
//    point); the seat dot springs out after. ×3 the real 48-box mark. ───
const OTR = 25.5
const OT_STROKES: Stroke[] = [
  {
    d: `M${CX - OTR} ${CY} A${OTR} ${OTR} 0 1 0 ${CX + OTR} ${CY} A${OTR} ${OTR} 0 1 0 ${CX - OTR} ${CY}`,
    len: 2 * Math.PI * OTR,
    color: '#DA3743',
    w: 15,
  },
]

/** Yelp's real burst (public/providers/yelp.svg inline, 24-box). */
const YELP_BURST =
  'm7.6885 15.1415-3.6715.8483c-.3769.0871-.755.183-1.1452.155-.2611-.0188-.5122-.0414-.7606-.213a1.179 1.179 0 0 1-.331-.3594c-.3486-.5519-.3656-1.3661-.3697-2.0004a6.2874 6.2874 0 0 1 .3314-2.0642 1.857 1.857 0 0 1 .1073-.2474 2.3426 2.3426 0 0 1 .1255-.2165 2.4572 2.4572 0 0 1 .1563-.1975 1.1736 1.1736 0 0 1 .399-.2831 1.082 1.082 0 0 1 .4592-.0837c.2355.0016.5139.052.91.1734.0555.0191.1237.0382.1856.0572.3277.1013.7048.2404 1.1499.3987.6863.2404 1.3663.487 2.0463.7397l1.2117.4423c.2217.0807.4363.18.6412.297.174.0984.3273.2298.4512.387a1.217 1.217 0 0 1 .192.4309 1.2205 1.2205 0 0 1-.872 1.4522c-.0468.0151-.0852.0239-.1085.0293l-1.105.2553-.0031-.001zM18.8208 7.565a1.8506 1.8506 0 0 0-.2042-.1754 2.4082 2.4082 0 0 0-.2077-.1394 2.3607 2.3607 0 0 0-.2269-.109 1.1705 1.1705 0 0 0-.482-.0796 1.0862 1.0862 0 0 0-.4498.1263c-.2107.1048-.4388.2732-.742.5551-.042.0417-.0947.0886-.142.133-.2502.2351-.5286.5252-.8599.863a114.6363 114.6363 0 0 0-1.5166 1.5629l-.8962.9293a4.1897 4.1897 0 0 0-.4466.5483 1.541 1.541 0 0 0-.2364.5459 1.2199 1.2199 0 0 0 .0107.4518l.0046.02a1.218 1.218 0 0 0 1.4184.923 1.162 1.162 0 0 0 .1105-.0213l4.7781-1.104c.3766-.087.7587-.1667 1.097-.3631.2269-.1316.4428-.262.5909-.5252a1.1793 1.1793 0 0 0 .1405-.4683c.0733-.6512-.2668-1.3908-.5403-1.963a6.2792 6.2792 0 0 0-1.2001-1.7103zM8.9703.0754a8.6724 8.6724 0 0 0-.83.1564c-.2754.066-.548.1383-.8146.2236-.868.2844-2.0884.8063-2.295 1.8065-.1165.5655.1595 1.1439.3737 1.66.2595.6254.614 1.1889.9373 1.7777.8543 1.5545 1.7245 3.0993 2.5922 4.6457.259.4617.5416 1.0464 1.043 1.2856a1.058 1.058 0 0 0 .1013.0383c.2248.0851.4699.1016.7041.0471a4.3015 4.3015 0 0 0 .0418-.0097 1.2136 1.2136 0 0 0 .5658-.3397 1.1033 1.1033 0 0 0 .079-.0822c.3463-.435.3454-1.0833.3764-1.6134.1042-1.771.2139-3.5423.3009-5.3142.0332-.6712.1055-1.3333.0655-2.0096-.0328-.5579-.0368-1.1984-.3891-1.6563-.6218-.8073-1.9476-.741-2.8523-.6158zm2.084 15.9505a1.1053 1.1053 0 0 0-1.2306-.4145 1.1398 1.1398 0 0 0-.1526.0633 1.4806 1.4806 0 0 0-.2171.1354c-.1992.1475-.3668.3392-.5196.5315-.0386.049-.074.1143-.12.1562l-.7686 1.0573a113.9168 113.9168 0 0 0-1.2913 1.789c-.278.3895-.5184.7184-.7083 1.0094-.036.0547-.0734.116-.1075.1647-.2277.3522-.3566.6092-.4228.8381a1.0945 1.0945 0 0 0-.046.4721c.0211.1655.0768.3246.1635.467.046.0715.0957.1406.1487.207a2.334 2.334 0 0 0 .1754.1825 1.843 1.843 0 0 0 .2108.1732c.5304.369 1.1112.6342 1.722.8391a6.0958 6.0958 0 0 0 1.5716.3004c.091.0046.1821.0025.2728-.006a2.3878 2.3878 0 0 0 .2506-.0351 2.3862 2.3862 0 0 0 .2447-.071 1.1927 1.1927 0 0 0 .4175-.2658c.1127-.113.1994-.249.2541-.3989.0889-.2214.1473-.5026.1857-.92.0034-.0593.0118-.1305.0177-.1958.0304-.3463.0443-.7531.0666-1.2315.0375-.7357.067-1.4681.0903-2.2026 0 0 .0495-1.3053.0494-1.306.0113-.3008.002-.6342-.0814-.9336a1.396 1.396 0 0 0-.1756-.4054zm8.6754 2.0439c-.1605-.176-.3878-.3514-.7462-.5682-.0518-.0288-.1124-.0674-.1684-.1009-.2985-.1795-.658-.3684-1.078-.5965a120.7615 120.7615 0 0 0-1.9427-1.042l-1.1515-.6107c-.0597-.0175-.1203-.0607-.1766-.0878-.2212-.1058-.4558-.2045-.6992-.2498a1.4915 1.4915 0 0 0-.2545-.0265 1.1527 1.1527 0 0 0-.1648.01 1.1077 1.1077 0 0 0-.9227.9133 1.4186 1.4186 0 0 0 .0159.439c.0563.3065.1932.6096.3346.875l.615 1.1526c.3422.65.6884 1.2963 1.0435 1.9406.229.4202.4196.7799.5982 1.078.0338.056.0721.1163.1011.1682.2173.3584.392.584.569.7458.1146.1107.252.195.4026.247.1583.0525.326.071.4919.0546a2.368 2.368 0 0 0 .251-.0435c.0817-.022.1622-.048.241-.0784a1.863 1.863 0 0 0 .2475-.1143 6.1018 6.1018 0 0 0 1.2818-.9597c.4596-.4522.8659-.9454 1.182-1.51.044-.08.0819-.163.1138-.2483a2.49 2.49 0 0 0 .0773-.2411c.0186-.083.033-.1669.0429-.2513a1.188 1.188 0 0 0-.0565-.491 1.0933 1.0933 0 0 0-.248-.4041z'
const YELP_SCALE = 3.4

/** Per provider: ink color, where the ink hops to start the logo, the
    logo's stroke plan (empty = Framer finale), confetti palette. */
const BRANDS: Record<
  ProviderId,
  { ink: string; anchor: { x: number; y: number }; strokes: Stroke[]; confetti: string[] }
> = {
  yelp: {
    ink: '#FF1A1A',
    anchor: { x: CX, y: CY },
    strokes: [],
    confetti: ['#FF1A1A', '#ff7a45', '#ffffff', '#ffb199'],
  },
  google: {
    ink: '#4285F4',
    anchor: { x: CX + GR * Math.cos(Math.PI / 4), y: CY - GR * Math.sin(Math.PI / 4) },
    strokes: G_STROKES,
    confetti: ['#4285F4', '#EA4335', '#FBBC04', '#34A853'],
  },
  opentable: {
    ink: '#DA3743',
    anchor: { x: CX - OTR, y: CY },
    strokes: OT_STROKES,
    confetti: ['#DA3743', '#ff8896', '#ffffff'],
  },
}

const smooth = (p: number) => p * p * (3 - 2 * p)
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

// ── The goo ──────────────────────────────────────────────────────────────

/** Droplets trailing the launch — they can't keep up, and fall back
    off-screen. Positions sampled off the launch's own math. */
function LaunchTrail({ ink }: { ink: string }) {
  const drops = [
    { delay: 0.92, cx: B.x - 4, from: 264, r: 4.5 },
    { delay: 1.05, cx: B.x + 3, from: 132, r: 3.4 },
  ]
  return (
    <>
      {drops.map((d, i) => (
        <motion.circle
          key={i}
          cx={d.cx}
          r={d.r}
          fill={ink}
          initial={{ cy: d.from, opacity: 0 }}
          animate={{ cy: d.from + 560, opacity: [0, 0.9, 0.9, 0] }}
          transition={{
            delay: d.delay,
            duration: 0.55,
            ease: 'easeIn',
            opacity: { delay: d.delay, duration: 0.55, times: [0, 0.1, 0.75, 1] },
          }}
        />
      ))}
    </>
  )
}

/** Impact splashes: droplets thrown off the bounce that fall back in. */
function SplashDrops({ ink }: { ink: string }) {
  const bursts: Array<{ at: number; dx: number; up: number; r: number }> = [
    { at: IMPACTS[0], dx: -23, up: 36, r: 4 },
    { at: IMPACTS[0], dx: 18, up: 27, r: 3.4 },
    { at: IMPACTS[0], dx: -5, up: 46, r: 2.8 },
    { at: IMPACTS[1], dx: -14, up: 22, r: 3 },
    { at: IMPACTS[1], dx: 11, up: 17, r: 2.5 },
  ]
  return (
    <>
      {bursts.map((d, i) => (
        <motion.circle
          key={i}
          r={d.r}
          fill={ink}
          initial={{ cx: B.x, cy: FLOOR_Y - 2, opacity: 0 }}
          animate={{
            cx: B.x + d.dx,
            cy: [FLOOR_Y - 2, FLOOR_Y - d.up, FLOOR_Y + 1],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            delay: d.at,
            duration: 0.48,
            cy: { delay: d.at, duration: 0.48, times: [0, 0.52, 1], ease: ['easeOut', 'easeIn'] },
            opacity: { delay: d.at, duration: 0.48, times: [0, 0.08, 0.8, 1] },
          }}
        />
      ))}
    </>
  )
}


// ── The playful layer ────────────────────────────────────────────────────

/** A flat ripple slapped off the floor at each bounce, sized to it. */
function BounceRipples({ ink }: { ink: string }) {
  const sizes = [36, 24, 14]
  return (
    <>
      {IMPACTS.map((at, i) => (
        <motion.ellipse
          key={i}
          cx={B.x}
          cy={FLOOR_Y}
          fill="none"
          stroke={ink}
          initial={{ rx: 8, ry: 2.5, opacity: 0, strokeWidth: 3.5 }}
          animate={{
            rx: sizes[i],
            ry: sizes[i] * 0.22,
            opacity: [0, 0.55, 0],
            strokeWidth: 1,
          }}
          transition={{ delay: at, duration: 0.4, ease: 'easeOut', opacity: { times: [0, 0.15, 1], delay: at, duration: 0.4 } }}
        />
      ))}
    </>
  )
}

/** Brand-color confetti riding the finale's pop. */
function Confetti({ at, colors }: { at: number; colors: string[] }) {
  const parts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + (i % 3) * 0.4
    const d = 64 + ((i * 37) % 46)
    return {
      x: Math.cos(a) * d,
      y: Math.sin(a) * d * 0.85,
      c: colors[i % colors.length],
      rect: i % 3 === 0,
      r: 2.6 + ((i * 29) % 10) / 4,
      spin: 140 + ((i * 53) % 220),
      delay: ((i * 7) % 4) * 0.028,
    }
  })
  return (
    <g transform={`translate(${CX} ${CY})`}>
      {parts.map((p, i) => (
        <motion.g
          key={i}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 0 }}
          animate={{
            x: p.x,
            y: [0, p.y * 0.8, p.y + 16],
            scale: [0, 1, 0.85],
            rotate: p.rect ? p.spin : 0,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            delay: at + p.delay,
            duration: 0.7,
            ease: 'easeOut',
            opacity: { times: [0, 0.12, 0.65, 1], delay: at + p.delay, duration: 0.7 },
          }}
        >
          {p.rect ? (
            <rect x={-3.4} y={-2.3} width={6.8} height={4.6} rx={1.4} fill={p.c} />
          ) : (
            <circle r={p.r} fill={p.c} />
          )}
        </motion.g>
      ))}
    </g>
  )
}

function YelpBurst({
  at,
  goo,
  immediate,
}: {
  at: number
  goo?: boolean
  immediate?: boolean
}) {
  return (
    <g transform={`translate(${CX} ${CY})`} filter={goo ? 'url(#bb-goo)' : undefined}>
      <motion.g
        initial={immediate ? false : { scale: 0, rotate: -42 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: at, type: 'spring', stiffness: 210, damping: 11.5 }}
      >
        <g
          transform={`translate(${-12 * YELP_SCALE} ${-12 * YELP_SCALE}) scale(${YELP_SCALE})`}
        >
          <path d={YELP_BURST} fill="#FF1A1A" />
        </g>
      </motion.g>
    </g>
  )
}

function SeatDot({ at, immediate }: { at: number; immediate?: boolean }) {
  return (
    <motion.circle
      cy={CY}
      r={10.8}
      fill="#DA3743"
      initial={immediate ? false : { cx: CX - OTR, scale: 0 }}
      animate={{ cx: CX - 43.5, scale: 1 }}
      transition={{ delay: at, type: 'spring', stiffness: 300, damping: 13 }}
    />
  )
}

// ── The hero ─────────────────────────────────────────────────────────────
export function BrandBallMorph({ providerId }: { providerId: ProviderId }) {
  const reduced = useReducedMotion() ?? false
  const t0 = useMemo(() => performance.now(), [])
  const brand = BRANDS[providerId]
  // The finale's goo lives through the budding/bloom, then releases so
  // the resting mark is the provider's crisp geometry, not a blob.
  const [finaleGoo, setFinaleGoo] = useState(true)
  useEffect(() => {
    if (reduced) return
    const id = window.setTimeout(
      () => setFinaleGoo(false),
      (T.logo + T.logoDur + 0.55) * 1000,
    )
    return () => window.clearTimeout(id)
  }, [reduced])

  const ballRef = useRef<SVGCircleElement>(null)
  const shadowRef = useRef<SVGEllipseElement>(null)
  const streakRef = useRef<SVGEllipseElement>(null)
  const rideRef = useRef<SVGGElement>(null)
  const checkRef = useRef<SVGPathElement>(null)
  const inkGRef = useRef<SVGGElement>(null)
  const inkCRef = useRef<SVGCircleElement>(null)
  const logoRef = useRef<SVGGElement>(null)

  useEffect(() => {
    if (reduced) return
    const { anchor, strokes } = BRANDS[providerId]
    const total = strokes.reduce((n, s) => n + s.len, 0)
    let raf = 0
    let prevY = brandBallY(0)
    let prevT = 0
    const tick = () => {
      const t = sceneNow(t0)
      const y = brandBallY(t)

      // 1 — the ball: stretched hard by speed in the air, squashed deep
      //     on impact, trailed by a streak, grounded by its shadow.
      const v = t > prevT ? Math.abs((y - prevY) / (t - prevT)) : 0
      const dir = Math.sign(y - prevY) || 1
      const ball = ballRef.current
      if (ball) {
        if (t < T.unroll) {
          const squash = brandSquash(t)
          let sx = 1
          let sy = 1
          if (squash < 1) {
            sx = 2 - squash
            sy = squash
          } else if (v > 60) {
            // Speed-stretch anywhere it's moving — including the launch.
            sy = Math.min(1 + v * 0.00034, 1.45)
            sx = 1 / sy
          }
          ball.style.display = ''
          ball.setAttribute('transform', `translate(${B.x} ${B.y + y}) scale(${sx} ${sy})`)
        } else {
          ball.style.display = 'none'
        }
      }

      // The streak: a fading echo trailing the ball at speed.
      const streak = streakRef.current
      if (streak) {
        const o = Math.min(Math.max((v - 650) * 0.00045, 0), 0.35)
        if (t < T.unroll && y < -6 && o > 0.02) {
          const len = Math.min(10 + v * 0.012, 30)
          streak.style.display = ''
          streak.setAttribute('cx', `${B.x}`)
          streak.setAttribute('cy', `${B.y + y - dir * (BALL_R + len * 0.55)}`)
          streak.setAttribute('rx', `${BALL_R * 0.5}`)
          streak.setAttribute('ry', `${len}`)
          streak.setAttribute('opacity', `${o}`)
        } else {
          streak.style.display = 'none'
        }
      }

      // The shadow: tighter and darker the closer the ball is to the
      // floor; it slips away as the ball becomes the check.
      const shadow = shadowRef.current
      if (shadow) {
        // No shadow while the ball is still below the floor on launch.
        if (t < T.unroll + 0.35 && y < 6) {
          const near = 1 - Math.min(Math.abs(y) / 260, 1)
          const fade = t < T.unroll ? 1 : 1 - prog(t, T.unroll, 0.35)
          shadow.style.display = ''
          shadow.setAttribute('rx', `${10 + 22 * near}`)
          shadow.setAttribute('ry', `${2.5 + 4.5 * near}`)
          shadow.setAttribute('opacity', `${(0.14 + 0.4 * near) * fade}`)
        } else {
          shadow.style.display = 'none'
        }
      }
      prevY = y
      prevT = t

      // 2 — the check: unroll out of the ball, hold, then drain to the tip.
      const check = checkRef.current
      const ride = rideRef.current
      if (check && ride) {
        // Visible through the END of the drain — the departing lobe
        // overlaps it, and the goo bridges the two into the neck.
        if (t >= T.unroll && t < T.redraw + T.redrawDur) {
          check.style.display = ''
          ride.setAttribute('transform', `translate(0 ${y})`)
          if (t < T.redraw) {
            const p = easeOutCubic(prog(t, T.unroll, T.unrollDur))
            const start = L1 * (1 - p)
            const end = L1 + (LEN - L1) * p
            check.setAttribute('stroke-dasharray', `${Math.max(end - start, 0.01)} ${LEN + 30}`)
            check.setAttribute('stroke-dashoffset', `${-start}`)
            // The width whips past its target and settles — a liquid snap.
            const wOver = p > 0.72 ? 1 - 0.14 * Math.sin(((p - 0.72) / 0.28) * Math.PI) : 1
            check.setAttribute('stroke-width', `${lerp(BALL_R * 2, CHECK_W, p) * wOver}`)
          } else {
            const p = smooth(prog(t, T.redraw, T.redrawDur))
            const start = (LEN - 0.01) * p
            check.setAttribute('stroke-dasharray', `${Math.max(LEN - start, 0.01)} ${LEN + 30}`)
            check.setAttribute('stroke-dashoffset', `${-start}`)
            check.setAttribute('stroke-width', `${lerp(CHECK_W, 24, p)}`)
          }
        } else {
          check.style.display = 'none'
        }
      }

      // 3 — the gathered ink HOPS from the tip to the logo's first point,
      //     stretching along the leap like the ball it once was.
      const inkG = inkGRef.current
      const inkC = inkCRef.current
      if (inkG && inkC) {
        const inkEnd = strokes.length ? T.logo : T.logo + 0.18
        if (t >= T.travel && t < inkEnd) {
          const p = smooth(prog(t, T.travel, T.travelDur))
          const arc = Math.sin(Math.PI * p)
          const cx = lerp(C.x, anchor.x, p)
          const cy = lerp(C.y, anchor.y, p) - 36 * arc
          // 6C's jelly: volume-preserving stretch ALONG the direction of
          // travel (the arc's tangent), hardest at mid-flight.
          const dxd = anchor.x - C.x
          const dyd = anchor.y - C.y - 36 * Math.PI * Math.cos(Math.PI * p)
          const deg = (Math.atan2(dyd, dxd) * 180) / Math.PI
          const s = 1 + 0.45 * arc
          inkG.style.display = ''
          inkG.setAttribute(
            'transform',
            `translate(${cx} ${cy}) rotate(${deg}) scale(${s} ${1 / s})`,
          )
          const shrink = strokes.length
            ? lerp(12, (strokes[0]?.w ?? 15) / 2, p)
            : 12 * (1 - clamp01(prog(t, T.logo, 0.18)))
          inkC.setAttribute('r', `${Math.max(shrink, 0.01)}`)
        } else {
          inkG.style.display = 'none'
        }
      }

      // 4 — the logo draws itself out of the ink (stroke plans only).
      const logo = logoRef.current
      if (logo && strokes.length) {
        const D = easeOutCubic(prog(t, T.logo, T.logoDur)) * total
        let at = 0
        logo.querySelectorAll('path').forEach((el, i) => {
          const s = strokes[i]
          const v = clamp01((D - at) / s.len) * s.len
          if (v > 0.3) {
            el.style.visibility = 'visible'
            el.setAttribute('stroke-dasharray', `${v} ${s.len + 30}`)
          } else {
            el.style.visibility = 'hidden'
          }
          at += s.len
        })
      }

      if (t < T.logo + T.logoDur + 0.6) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [t0, reduced, providerId])

  // Reduced motion: the resting mark, no act.
  if (reduced) {
    return (
      <div className="relative shrink-0" style={{ width: W, height: H }}>
        <svg className="absolute inset-0" viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {providerId === 'yelp' && <YelpBurst at={0} immediate />}
          {brand.strokes.map((s, i) => (
            <path
              key={i}
              d={s.d}
              fill="none"
              stroke={s.color}
              strokeWidth={s.w}
              strokeLinecap="round"
            />
          ))}
          {providerId === 'opentable' && <SeatDot at={0} immediate />}
        </svg>
      </div>
    )
  }

  const logoDone = T.logo + T.logoDur
  const confettiAt = providerId === 'yelp' ? T.logo + 0.2 : logoDone - 0.22

  // The stage's light: a faint brand-tinted flash behind the action on
  // every impact, and a warmer one on the finale's pop — the world
  // reacting to the hits is what ties them together.
  const flashEnd = logoDone + 0.45
  const flashStops: Array<[number, number]> = [
    [0, 0],
    [IMPACTS[0] - 0.06, 0],
    [IMPACTS[0], 0.13],
    [IMPACTS[0] + 0.19, 0],
    [IMPACTS[1], 0.08],
    [IMPACTS[1] + 0.14, 0],
    [T.unroll, 0.06],
    [T.unroll + 0.16, 0],
    [logoDone - 0.18, 0],
    [logoDone - 0.1, 0.17],
    [flashEnd, 0],
  ]

  return (
    <div className="relative shrink-0" style={{ width: W, height: H }}>
      {/* The whole stage thuds on the big impact, and again on the pop. */}
      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, 2.5, -1.5, 0.8, 0] }}
        transition={{ delay: IMPACTS[0], duration: 0.3, ease: 'easeOut' }}
      >
      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, -2, 1.2, 0] }}
        transition={{ delay: logoDone - 0.14, duration: 0.3, ease: 'easeOut' }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(75% 70% at 50% 48%, ${brand.ink} 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: flashStops.map((s) => s[1]) }}
          transition={{
            duration: flashEnd,
            times: flashStops.map((s) => s[0] / flashEnd),
            ease: 'linear',
          }}
        />

      <svg
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: W, height: ACT_H }}
        viewBox={`0 0 ${W} ${ACT_H}`}
        aria-hidden
      >
        <defs>
          <radialGradient id="bb-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000" stopOpacity="1" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          {/* The goo: blur + alpha contrast — everything in the ink
              layer melds where it touches, like the loader's blob. */}
          <filter id="bb-goo" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="b" />
            <feColorMatrix
              in="b"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
        </defs>

        {/* The landing dot — the spot the ball is falling toward fades
            in just ahead of it, and the first impact consumes it. */}
        <motion.ellipse
          cx={B.x}
          cy={FLOOR_Y}
          rx={6}
          ry={2.2}
          fill={brand.ink}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0.55, 0.55, 0], scale: [0.4, 1, 1, 2.6] }}
          transition={{ delay: 1.1, duration: 0.62, times: [0, 0.28, 0.68, 1], ease: 'easeOut' }}
        />

        {/* The floor shadow, the streak, then the ball itself. */}
        <ellipse
          ref={shadowRef}
          cx={B.x}
          cy={FLOOR_Y + 5}
          fill="url(#bb-shadow)"
          style={{ display: 'none' }}
        />
        <BounceRipples ink={brand.ink} />

        {/* The ink layer, under the goo filter — ball, streak, check,
            droplets, and the hopping ink all meld where they touch. */}
        <g filter="url(#bb-goo)">
          <ellipse ref={streakRef} fill={brand.ink} style={{ display: 'none' }} />
          <circle
            ref={ballRef}
            r={BALL_R}
            fill={brand.ink}
            transform={`translate(${B.x} -60)`}
          />
          <LaunchTrail ink={brand.ink} />
          <SplashDrops ink={brand.ink} />

          {/* The check — the same ink as a stroke; the ball unrolls into it. */}
          <g ref={rideRef}>
            <path
              ref={checkRef}
              d={CHECK_D}
              fill="none"
              stroke={brand.ink}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'none' }}
            />
          </g>

          {/* The hopping ink between check tip and logo start. */}
          <g ref={inkGRef} style={{ display: 'none' }}>
            <circle ref={inkCRef} r={15} fill={brand.ink} />
          </g>
        </g>

        {/* The finished mark keeps breathing — a slow idle float while
            the copy develops beneath it. */}
        <motion.g
          initial={{ y: 0 }}
          animate={{ y: [0, -2.5, 0] }}
          transition={{
            delay: logoDone + 0.3,
            duration: 2.8,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        >
          {/* The logo's stroke plan, drawn in sequence — then the pop.
              OpenTable's single-ink finale runs under the goo so its
              seat dot buds off the ring like 6C's handoff; Google's
              multicolor G stays crisp outside it. */}
          <motion.g
            style={{ transformOrigin: `${CX}px ${CY}px` }}
            filter={providerId === 'opentable' && finaleGoo ? 'url(#bb-goo)' : undefined}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.12, 0.96, 1] }}
            transition={{ delay: logoDone - 0.16, duration: 0.45, ease: 'easeOut' }}
          >
            <g ref={logoRef}>
              {brand.strokes.map((s, i) => (
                <path
                  key={i}
                  d={s.d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.w}
                  strokeLinecap="round"
                  style={{ visibility: 'hidden' }}
                />
              ))}
            </g>
            {providerId === 'opentable' && <SeatDot at={logoDone - 0.12} />}
          </motion.g>

          {providerId === 'yelp' && <YelpBurst at={T.logo + 0.04} goo={finaleGoo} />}
        </motion.g>

        <Confetti at={confettiAt} colors={brand.confetti} />
      </svg>
      </motion.div>
      </motion.div>
    </div>
  )
}
