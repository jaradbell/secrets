/**
 * AtomSplash — the app's launch animation, built from the goo grammar.
 *
 * Modeled on GetYourGuide's logo splash (60fps.design shot
 * getyourguide-logo-splash-animation): one continuous white form on a
 * black field carries the whole sequence — logo, wordmark, loading dot,
 * reveal window — so the splash reads as a single object changing state,
 * never elements fading in and out.
 *
 * The sequence, in our ink:
 *   1. Birth — the atom mark (the Figma union vector, node 1551:6994,
 *      rendered crisp in white via a CSS mask on /atom-mark.svg) swells
 *      up with a liquid overshoot. At rest the logo is ALWAYS this exact
 *      vector shape — the goo circles only take over once the form
 *      starts melting.
 *   2. Merge — a fast crossfade hands the mark to goo circles aligned on
 *      the same geometry; companion and disc are absorbed and the big
 *      blob slides to dead center as a single ball.
 *   3. Word — the ball splits into four buds that glide to the letter
 *      slots, and each bud resolves into its letter: A T O M.
 *   4. Gather — the letters collapse back into buds, the buds pour home
 *      into the center ball.
 *   5. Loader — the ball becomes the 6A GooLoader beat: two satellites
 *      take turns budding out on golden-angle steps while the app loads.
 *   6. Reveal — the loader dies into a dot, and the dot becomes a
 *      window: a circular mask grows from it until the home screen owns
 *      the frame.
 *
 * Timing follows the shot's grain — medium pace, ease-in-out everywhere,
 * no springs, no stagger. Animation runs via refs + direct style writes
 * (no React re-render per frame), same as LogoGoo / GooLoader. Honors
 * prefers-reduced-motion by skipping straight to the revealed app.
 */
import { useEffect, useRef, useState } from 'react'

const INK = '#ffffff'
const FIELD = '#000000'

/** LogoGoo's home layout as offsets from the cluster's center (its 132x134
    design canvas, center (66, 67)), rendered here at LOGO_SCALE. */
const LOGO_SCALE = 0.62
const OFF_A = { x: -1, y: -27, r: 40 } // big
const OFF_B = { x: 35, y: 35, r: 29 } // companion (goo-connected)
const OFF_C = { x: -37, y: 35, r: 29 } // isolated disc

/** The crisp atom mark (Figma union, 643.429x650 viewBox) over the same
    design units: its bounding box spans the cluster trace, top-left at
    canvas (0, 0), so it offsets (-66, -67) from the cluster center. */
const MARK_W = 130
const MARK_H = 131
const MARK_OFF = { x: -66, y: -67 }

/** How long the crisp mark takes to hand off to the goo circles once the
    merge begins. */
const MARK_FADE_MS = 140

/** The single ball the cluster merges into — also the loader core. */
const CORE_R = 26

/** Wordmark geometry: four letter slots astride the center. */
const WORD = ['A', 'T', 'O', 'M']
const LETTER_SPACING = 42
const LETTER_SIZE = 36
const LETTER_BLOB_R = 13

/** Loader beat — same numbers as 6A's GooLoader. */
const PERIOD = 1100
const GOLDEN = 137.508
const REACH = 44
const SAT_RS = [14, 11]
const CURL = 0.45

/** The dot the loader dies into, which becomes the reveal window. */
const DOT_R = 5

/** Timeline, ms from mount. Brisk but continuous — one breath per state. */
const T = {
  birthEnd: 520, // mark swells up from nothing
  mergeStart: 950, // mark hands off, companion + disc absorbed
  mergeEnd: 1450,
  splitStart: 1450, // ball buds out to the four letter slots
  splitEnd: 1950,
  letterInStart: 1870, // buds resolve into letters
  letterInEnd: 2280,
  letterOutStart: 2950, // letters dissolve back into buds
  letterOutEnd: 3400,
  gatherStart: 3320, // buds pour home into the ball
  gatherEnd: 3820,
  loaderStart: 3820, // 6A beat, one and a half periods
  deathStart: 5470, // buds snap home, ball collapses to a dot
  deathEnd: 5990,
  revealStart: 6020, // the dot becomes the window
  revealEnd: 6680,
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Overshooting ease for the birth — lands a touch too big and settles. */
function backOut(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Eased 0..1 progress of t through [a, b]; clamped outside. */
function seg(t: number, a: number, b: number) {
  if (t <= a) return 0
  if (t >= b) return 1
  return easeInOut((t - a) / (b - a))
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

type Circle = { x: number; y: number; r: number }

function setCircle(el: HTMLElement, c: Circle) {
  const r = Math.max(c.r, 0)
  el.style.left = `${c.x - r}px`
  el.style.top = `${c.y - r}px`
  el.style.width = `${r * 2}px`
  el.style.height = `${r * 2}px`
}

/** A satellite's beat state at loader-relative time, phase-shifted per
    index — 6A's beat verbatim. */
function satellite(ms: number, index: number): { out: number; angle: number } {
  const phase = ms / PERIOD + index * 0.5
  const pulse = Math.floor(phase)
  const u = phase - pulse
  const out = seg(u, 0.02, 0.42) - seg(u, 0.56, 0.98)
  const angle =
    ((pulse * GOLDEN + index * 180) * Math.PI) / 180 + CURL * Math.sin(u * Math.PI)
  return { out, angle }
}

export function AtomSplash({ onDone }: { onDone?: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const mark = useRef<HTMLDivElement>(null)
  // Five ink spans: [0] core / big blob; [1] companion → satellite A;
  // [2] disc → satellite B; [1..4] double as the four letter buds.
  const b0 = useRef<HTMLSpanElement>(null)
  const b1 = useRef<HTMLSpanElement>(null)
  const b2 = useRef<HTMLSpanElement>(null)
  const b3 = useRef<HTMLSpanElement>(null)
  const b4 = useRef<HTMLSpanElement>(null)
  const l0 = useRef<HTMLSpanElement>(null)
  const l1 = useRef<HTMLSpanElement>(null)
  const l2 = useRef<HTMLSpanElement>(null)
  const l3 = useRef<HTMLSpanElement>(null)
  const [finished, setFinished] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const stage = root.current
    const markEl = mark.current
    const ink = [b0.current, b1.current, b2.current, b3.current, b4.current]
    const letters = [l0.current, l1.current, l2.current, l3.current]
    if (!stage || !markEl || ink.some((el) => !el) || letters.some((el) => !el)) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFinished(true)
      onDoneRef.current?.()
      return
    }

    const place = (i: number, c: Circle) => setCircle(ink[i]!, c)
    const hide = (i: number) => (ink[i]!.style.width = '0px')

    let raf = 0
    let t0 = 0
    const frame = (now: number) => {
      if (!t0) t0 = now
      const ms = now - t0
      const { width: w, height: h } = stage.getBoundingClientRect()
      const cx = w / 2
      const cy = h * 0.45
      const s = LOGO_SCALE

      // Letter slots astride the center.
      const slotX = (i: number) => cx + (i - (WORD.length - 1) / 2) * LETTER_SPACING

      // ---- Phase envelopes. ----
      const birth = backOut(Math.min(ms / T.birthEnd, 1))
      const merge = seg(ms, T.mergeStart, T.mergeEnd)
      const split = seg(ms, T.splitStart, T.splitEnd)
      const letterIn = seg(ms, T.letterInStart, T.letterInEnd)
      const letterOut = seg(ms, T.letterOutStart, T.letterOutEnd)
      const gather = seg(ms, T.gatherStart, T.gatherEnd)
      const death = seg(ms, T.deathStart, T.deathEnd)
      const reveal = seg(ms, T.revealStart, T.revealEnd)
      const breath = 1 + 0.015 * Math.sin(ms / 300)

      // How present each letter bud is: out for the word, gone otherwise.
      const budOut = split - gather
      // How present each letter glyph is.
      const letterOp = letterIn - letterOut

      // ---- Crisp mark: the logo's static form, always the exact vector.
      // It owns the frame until the merge begins, then hands off to the
      // goo circles with a fast crossfade.
      const markOp = Math.min(birth * 1.5, 1) * (1 - seg(ms, T.mergeStart, T.mergeStart + MARK_FADE_MS))
      markEl.style.left = `${cx + MARK_OFF.x * s}px`
      markEl.style.top = `${cy + MARK_OFF.y * s}px`
      markEl.style.width = `${MARK_W * s}px`
      markEl.style.height = `${MARK_H * s}px`
      markEl.style.opacity = `${markOp}`
      markEl.style.transform = `scale(${birth * breath})`

      if (ms < T.mergeStart) {
        // ---- Rest: the vector holds the frame alone; no goo yet. ----
        for (let i = 0; i < 5; i++) hide(i)
      } else if (ms < T.splitStart) {
        // ---- Merge: goo circles on the mark's geometry melt inward. ----
        const A: Circle = {
          x: cx + lerp(OFF_A.x * s, 0, merge),
          y: cy + lerp(OFF_A.y * s, 0, merge),
          r: lerp(OFF_A.r * s, CORE_R, merge) * breath,
        }
        place(0, A)
        place(1, {
          x: lerp(cx + OFF_B.x * s, A.x, merge),
          y: lerp(cy + OFF_B.y * s, A.y, merge),
          r: lerp(OFF_B.r * s, 2, merge) * breath,
        })
        place(2, {
          x: lerp(cx + OFF_C.x * s, A.x, merge),
          y: lerp(cy + OFF_C.y * s, A.y, merge),
          r: lerp(OFF_C.r * s, 2, merge) * breath,
        })
        hide(3)
        hide(4)
      } else if (ms < T.loaderStart) {
        // ---- Word: the ball buds out to the letter slots and back. ----
        // The core gives its mass to the buds and takes it back.
        place(0, { x: cx, y: cy, r: CORE_R * (1 - budOut) * breath })
        for (let i = 0; i < 4; i++) {
          // While the letter is up, its bud is gone; the bud carries the
          // move out and the move home.
          const budR = LETTER_BLOB_R * budOut * (1 - letterOp)
          place(i + 1, {
            x: lerp(cx, slotX(i), budOut),
            y: cy,
            r: budR,
          })
        }
      } else {
        // ---- Loader: 6A's beat in white, then death to a dot. ----
        const lm = ms - T.loaderStart
        const budGate = seg(lm, 100, 400) * (1 - seg(death, 0, 0.45))
        const A = satellite(lm, 0)
        const B = satellite(lm, 1)
        const outA = A.out * budGate
        const outB = B.out * budGate
        // Core holds the center, gives a little radius to the buds, and
        // dies into the dot with a last breath.
        const coreR =
          (CORE_R + 1.2 * Math.sin(ms / 260) - 3 * ((outA + outB) / 2)) *
          (1 + 0.14 * Math.sin(death * Math.PI))
        place(0, { x: cx, y: cy, r: lerp(coreR, DOT_R, death) })
        place(1, {
          x: cx + Math.cos(A.angle) * REACH * outA,
          y: cy + Math.sin(A.angle) * REACH * outA,
          r: (2 + (SAT_RS[0] - 2) * outA) * budGate,
        })
        place(2, {
          x: cx + Math.cos(B.angle) * REACH * outB,
          y: cy + Math.sin(B.angle) * REACH * outB,
          r: (2 + (SAT_RS[1] - 2) * outB) * budGate,
        })
        hide(3)
        hide(4)
      }

      // ---- Letters ride over the buds. ----
      for (let i = 0; i < 4; i++) {
        const el = letters[i]!
        el.style.left = `${slotX(i)}px`
        el.style.top = `${cy}px`
        el.style.opacity = `${letterOp}`
        el.style.transform = `translate(-50%, -50%) scale(${lerp(0.6, 1, letterOp)})`
      }

      // ---- Reveal: the dot becomes the window. ----
      if (reveal > 0) {
        const maxR = Math.hypot(w, h) / 2 + 60
        const R = lerp(DOT_R, maxR, reveal)
        const mask = `radial-gradient(circle ${R}px at 50% ${cy}px, transparent ${Math.max(R - 1, 0)}px, black ${R}px)`
        stage.style.webkitMaskImage = mask
        stage.style.maskImage = mask
        // The dot fades into the window's edge as the hole outgrows it.
        ink[0]!.style.opacity = `${1 - seg(reveal, 0, 0.25)}`
      }

      if (ms >= T.revealEnd) {
        setFinished(true)
        onDoneRef.current?.()
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (finished) return null

  const blobCls = 'absolute rounded-full'

  return (
    <div
      ref={root}
      className="absolute inset-0 z-50"
      style={{ background: FIELD }}
      role="status"
      aria-label="Loading ATOM"
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="atom-splash-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7.5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
            />
          </filter>
        </defs>
      </svg>

      {/* The crisp atom mark — the logo's static form (Figma union
          1551:6994), white via mask so the asset ships untouched. */}
      <div
        ref={mark}
        aria-hidden="true"
        className="absolute"
        style={{
          background: INK,
          opacity: 0,
          maskImage: 'url(/atom-mark.svg)',
          WebkitMaskImage: 'url(/atom-mark.svg)',
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />

      {/* Goo layer — every ink form merges through the liquid neck. */}
      <div className="absolute inset-0" style={{ filter: 'url(#atom-splash-goo)' }}>
        <span ref={b0} className={blobCls} style={{ background: INK }} />
        <span ref={b1} className={blobCls} style={{ background: INK }} />
        <span ref={b2} className={blobCls} style={{ background: INK }} />
        <span ref={b3} className={blobCls} style={{ background: INK }} />
        <span ref={b4} className={blobCls} style={{ background: INK }} />
      </div>

      {/* Wordmark — crisp glyphs outside the goo, one per bud slot. */}
      {WORD.map((ch, i) => (
        <span
          key={ch + i}
          ref={[l0, l1, l2, l3][i]}
          aria-hidden="true"
          className="absolute select-none font-bold"
          style={{
            color: INK,
            fontSize: LETTER_SIZE,
            lineHeight: 1,
            opacity: 0,
          }}
        >
          {ch}
        </span>
      ))}
    </div>
  )
}
