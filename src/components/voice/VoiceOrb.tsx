import { useEffect, useRef, type MutableRefObject } from 'react'
import type { VoiceStatus } from './useVoiceInput'

/**
 * The orb body: a calm, near-black disc — a single dark anchor against the
 * light mesh. All state expression lives in the dotted glyph layered above
 * it; the disc itself only breathes, swelling subtly with the live mic level
 * while listening, and casts a slightly deeper shadow when active.
 */
export function VoiceOrb({
  status,
  levelRef,
  size = 88,
}: {
  status: VoiceStatus
  levelRef: MutableRefObject<number>
  /** Pixel diameter, or 'fill' to stretch with an animating parent (the
      dock morphs the orb into the follow-up pill). */
  size?: number | 'fill'
}) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return

    let raf = 0
    let scale = 1
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      // Fast attack, gentle settle — the disc breathes with the voice.
      const target = 1 + levelRef.current * 0.06
      scale += (target - scale) * (1 - Math.exp(-dt * 8))
      el.style.transform = `scale(${scale.toFixed(4)})`
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [levelRef])

  return (
    <div
      ref={bodyRef}
      aria-hidden="true"
      className="transition-shadow duration-500"
      style={{
        width: size === 'fill' ? '100%' : size,
        height: size === 'fill' ? '100%' : size,
        // In fill mode the radius rides the animating parent (orb → pill →
        // card morphs); standalone it's simply a disc.
        borderRadius: size === 'fill' ? 'inherit' : '9999px',
        // Near-black with a whisper of warmth, faintly lit from the top so
        // it reads as an object rather than a hole.
        background:
          'radial-gradient(115% 115% at 32% 22%, #2b2730 0%, #17141b 52%, #0e0c11 100%)',
        boxShadow:
          status === 'idle'
            ? '0 14px 32px -14px rgba(20, 16, 26, 0.45)'
            : '0 18px 44px -14px rgba(20, 16, 26, 0.6)',
      }}
    />
  )
}
