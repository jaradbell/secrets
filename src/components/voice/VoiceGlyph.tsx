import { useEffect, useRef, type MutableRefObject } from 'react'
import type { VoiceStatus } from './useVoiceInput'

/**
 * Continuously animated dot glyph — replaces thinking-orbs, whose dotted
 * designs step between lattice positions. Every dot here follows a smooth
 * parametric path (pure floating-point, no grid), so motion never holds or
 * snaps. State changes morph each dot from its current path to the new one
 * over ~450ms.
 *
 * Verbs:
 * - idle:       a slowly revolving ring, gently breathing
 * - listening:  a rolling waveform whose amplitude rides the live mic level
 * - thinking:   two counter-rotating tilted orbits with depth shading
 * - responding: a ring with a soft wave travelling around it
 */

const DOTS = 14
const AREA = 30 // drawing area in CSS px
const MORPH_MS = 450

type Dot = { x: number; y: number; s: number; a: number }

/** Dot layouts per state: index + clock + mic level → position in [-1,1]². */
const LAYOUTS: Record<VoiceStatus, (i: number, t: number, level: number) => Dot> = {
  idle: (i, t) => {
    const angle = (i / DOTS) * Math.PI * 2 + t * 0.45
    const r = 0.72 + 0.07 * Math.sin(t * 1.1 + i * 1.7)
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      s: 0.85 + 0.18 * Math.sin(t * 1.4 + i * 2.2),
      a: 0.8,
    }
  },
  listening: (i, t, level) => {
    const x = -0.92 + 1.84 * (i / (DOTS - 1))
    const amp = 0.18 + Math.min(level * 1.6, 0.75)
    return {
      x,
      y: amp * Math.sin(x * 4.2 - t * 5.2) * (1.0 - 0.25 * Math.abs(x)),
      s: 0.9 + level * 1.2 + 0.1 * Math.sin(x * 6.0 + t * 3.0),
      a: 0.9,
    }
  },
  thinking: (i, t) => {
    // Two counter-rotating orbits, tilted like gyroscope rings; z-depth
    // modulates size and alpha so rotation reads in 3D.
    const ring = i % 2
    const angle = t * (ring ? 2.4 : -1.8) + (Math.floor(i / 2) / (DOTS / 2)) * Math.PI * 2
    const tilt = ring ? 0.95 : -0.65
    const wobble = 0.35 * Math.sin(t * 0.7)
    const cx = Math.cos(angle)
    const sy = Math.sin(angle)
    const y = sy * Math.cos(tilt + wobble)
    const z = sy * Math.sin(tilt + wobble)
    return {
      x: cx * 0.8,
      y: y * 0.8,
      s: 0.75 + 0.45 * (z * 0.5 + 0.5),
      a: 0.45 + 0.5 * (z * 0.5 + 0.5),
    }
  },
  responding: (i, t) => {
    const theta = (i / DOTS) * Math.PI * 2 + t * 0.9
    const wave = Math.sin(theta * 3 - t * 2.6)
    const r = 0.7 + 0.12 * wave
    return {
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * r,
      s: 0.9 + 0.3 * wave,
      a: 0.75 + 0.2 * wave,
    }
  },
}

const easeInOut = (v: number) => v * v * (3 - 2 * v)

export function VoiceGlyph({
  status,
  levelRef,
  size = AREA,
}: {
  status: VoiceStatus
  levelRef: MutableRefObject<number>
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef(status)
  // Morph bookkeeping lives in refs so the rAF loop sees changes without
  // re-running the effect.
  const morphRef = useRef<{ from: VoiceStatus; at: number }>({ from: status, at: 0 })
  if (statusRef.current !== status) {
    morphRef.current = { from: statusRef.current, at: performance.now() }
    statusRef.current = status
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const half = (size * dpr) / 2
    const span = half * 0.82 // dot field radius in device px
    const dotR = size * dpr * 0.042

    const draw = (now: number, t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cur = LAYOUTS[statusRef.current]
      const { from, at } = morphRef.current
      const blend = at === 0 ? 1 : Math.min((now - at) / MORPH_MS, 1)
      const b = easeInOut(blend)
      const prev = LAYOUTS[from]
      const level = levelRef.current

      for (let i = 0; i < DOTS; i++) {
        const target = cur(i, t, level)
        let { x, y, s, a } = target
        if (b < 1) {
          const p = prev(i, t, level)
          x = p.x + (x - p.x) * b
          y = p.y + (y - p.y) * b
          s = p.s + (s - p.s) * b
          a = p.a + (a - p.a) * b
        }
        ctx.beginPath()
        ctx.arc(half + x * span, half + y * span, Math.max(dotR * s, 0.4), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 242, 250, ${Math.min(Math.max(a, 0), 1)})`
        ctx.fill()
      }
    }

    let raf = 0
    let elapsed = 0
    let last = performance.now()
    const frame = (now: number) => {
      elapsed += Math.min(now - last, 100)
      last = now
      draw(now, elapsed / 1000)
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      } else if (!reducedMotion && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    if (reducedMotion) {
      draw(performance.now(), 4)
    } else {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [size, levelRef])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="block"
    />
  )
}
