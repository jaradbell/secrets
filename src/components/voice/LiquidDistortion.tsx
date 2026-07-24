import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Liquid press effect — wraps content in an animated SVG displacement filter
 * so it bends like it's behind rippled glass while `active`. The wave field
 * is a static, heavily blurred, very-low-frequency noise that physically
 * rolls across the content (translated per frame), so the distortion reads
 * as smooth travelling warps — never in-place shimmer or grain. Strength
 * eases in on press and melts away on release.
 *
 * The filter attaches only while the effect is live (rAF-driven, no React
 * re-renders), so at rest the content renders exactly as before.
 */
export function LiquidDistortion({
  active,
  className,
  children,
}: {
  active: boolean
  className?: string
  children: ReactNode
}) {
  // useId emits colons, which break `url(#…)` references — strip them.
  const filterId = `liquid-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`

  const wrapRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef<SVGFEOffsetElement>(null)
  const srcBlurRef = useRef<SVGFEGaussianBlurElement>(null)
  const dispRef = useRef<SVGFEDisplacementMapElement>(null)

  const activeRef = useRef(active)
  activeRef.current = active
  const loopRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || loopRef.current !== null) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const wrap = wrapRef.current
    const offset = offsetRef.current
    const srcBlur = srcBlurRef.current
    const disp = dispRef.current
    if (!wrap || !offset || !srcBlur || !disp) return

    wrap.style.filter = `url(#${filterId})`

    let amount = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const t = now / 1000

      // Ease toward full strength on press, drain a touch slower on release.
      const target = activeRef.current ? 1 : 0
      amount += (target - amount) * (1 - Math.exp(-dt * (target > amount ? 6 : 4)))

      // The wave field itself never changes — it just glides across the
      // content, so a swell drifts through, bends what it touches, and
      // leaves everything else perfectly still.
      offset.setAttribute('dx', (80 * Math.sin(t * 0.05)).toFixed(2))
      offset.setAttribute('dy', (60 * Math.cos(t * 0.065)).toFixed(2))
      disp.setAttribute('scale', (amount * (14 + 4 * Math.sin(t * 0.08))).toFixed(2))

      // Depth-of-field recede: while listening the UI softens and eases
      // back a step, like focus has shifted from the content to the voice.
      srcBlur.setAttribute('stdDeviation', (amount * 1.8).toFixed(2))
      wrap.style.transform = `scale(${(1 - 0.015 * amount).toFixed(4)})`

      if (!activeRef.current && amount < 0.01) {
        wrap.style.filter = ''
        wrap.style.transform = ''
        loopRef.current = null
        return
      }
      loopRef.current = requestAnimationFrame(tick)
    }
    loopRef.current = requestAnimationFrame(tick)

    return () => {
      if (loopRef.current !== null) {
        cancelAnimationFrame(loopRef.current)
        loopRef.current = null
      }
      wrap.style.filter = ''
      wrap.style.transform = ''
    }
  }, [active, filterId])

  return (
    <div ref={wrapRef} className={className}>
      <svg aria-hidden className="absolute h-0 w-0">
        <filter
          id={filterId}
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          {/* Single octave of very broad noise. */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.0016 0.002"
            numOctaves="1"
            seed="7"
            result="noise"
          />
          {/* Dead-zone transfer: the middle band of the noise (most of it)
              collapses to 0.5 = zero displacement, so the field is flat
              almost everywhere and only the rare extremes become isolated
              swells — big calm gaps between ripples. Alpha is pinned opaque
              so the displacement reads clean channel values. */}
          <feComponentTransfer in="noise" result="sparse">
            <feFuncR type="table" tableValues="0 0.5 0.5 0.5 0.5 1" />
            <feFuncG type="table" tableValues="0 0.5 0.5 0.5 0.5 1" />
            <feFuncA type="table" tableValues="1 1" />
          </feComponentTransfer>
          {/* Heavy blur melts the plateau edges into pure smooth lensing —
              warp, not dither. */}
          <feGaussianBlur in="sparse" stdDeviation="14" result="soft" />
          {/* The animated translation that makes the swells drift. */}
          <feOffset ref={offsetRef} in="soft" dx="0" dy="0" result="field" />
          {/* Soft focus on the content itself — the "falls back" feel. */}
          <feGaussianBlur
            ref={srcBlurRef}
            in="SourceGraphic"
            stdDeviation="0"
            result="receded"
          />
          <feDisplacementMap
            ref={dispRef}
            in="receded"
            in2="field"
            xChannelSelector="R"
            yChannelSelector="G"
            scale="0"
          />
        </filter>
      </svg>
      {children}
    </div>
  )
}
