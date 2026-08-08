import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { AmbientShaderBackground } from '../shared/AmbientShaderBackground'
import { useAmbientOverride } from '../shared/ambientBus'
import { frameCardBus, useFrameCard } from '../shared/frameCardBus'

const EASE = [0.32, 0.72, 0, 1] as const

/**
 * Frames the experience like a running mobile product. On desktop it centers a
 * ~393×852 viewport over a quiet neutral background with a subtle border and
 * large outer radius. On mobile it fills the screen using 100dvh and respects
 * safe-area insets. No fake phone hardware, clock, or status indicators.
 *
 * `ambient` controls the shader background: 'full' floods the frame (resting
 * screens); 'composer' pours it down to a soft band at the bottom so it glows
 * behind the composer zone while conversation content sits on canvas. A
 * prototype that moves between altitudes at runtime (1C, 5B/5C) can override
 * the registered mode through the ambientBus.
 *
 * One full-frame shader instance persists across both modes — the canvas
 * never resizes (a WebGL canvas clears to black on resize, which flashed
 * during animated transitions). The move between modes happens inside the
 * shader instead: its `pour` splits the mesh down the center, streams the
 * blooms down the frame's edges, and rebuilds them as a glow along the base —
 * and plays the same journey in reverse on the way back up. The veils ride
 * the same beat: the milky composer wash arrives only after the mesh has
 * poured down, and lifts off first on the rise so the rebuild shows raw.
 */
export function MobileAppShell({
  children,
  ambient = 'full',
}: {
  children?: ReactNode
  ambient?: 'full' | 'composer'
}) {
  const override = useAmbientOverride()
  const mode = override ?? ambient
  const full = mode === 'full'

  // The screen-as-card move (5E's menu): the whole running app — mesh,
  // content, dock — pulls right and scales down into a floating card,
  // revealing the menu surface a prototype has portaled beneath it.
  // Tapping the card anywhere is the way back.
  const carded = useFrameCard()

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#ededed] sm:p-6">
      <div
        id="app-viewport"
        className="
          relative isolate flex w-full flex-col overflow-hidden bg-canvas
          h-[100dvh] w-full
          sm:h-[min(852px,100%)] sm:w-[393px]
          sm:rounded-[52px] sm:border sm:border-black/10
          sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.45)]
        "
        style={{
          // Simulated safe areas: real insets on device, sensible fallback on desktop.
          ['--safe-top' as string]: 'max(env(safe-area-inset-top), 22px)',
          ['--safe-bottom' as string]: 'max(env(safe-area-inset-bottom), 14px)',
        }}
      >
        {/* The screen layer — everything the app is. It rides above any
            portaled menu surface (z-10 over z-0) and becomes the card:
            transform + radius + shadow animate together, and while carded
            the app inside is inert (one tap anywhere brings it home). */}
        <motion.div
          // app-screen: a portal target *inside* the screen's stacking
          // context — overlays landing here can layer against the app's
          // own chrome (e.g. under the dock's z-40, keeping the voice orb
          // live), where an #app-viewport portal always paints over it.
          id="app-screen"
          className="relative isolate z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas"
          initial={false}
          animate={
            carded
              ? {
                  x: '76%',
                  scale: 0.84,
                  borderRadius: 44,
                  boxShadow: '0 24px 80px -12px rgba(0,0,0,0.55)',
                }
              : {
                  x: '0%',
                  scale: 1,
                  borderRadius: 0,
                  boxShadow: '0 24px 80px -12px rgba(0,0,0,0)',
                }
          }
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          onClick={carded ? () => frameCardBus.set(false) : undefined}
        >
          {carded && (
            // Swallow every tap while carded — the card is one big
            // "return" button, not a tiny running app.
            <div className="absolute inset-0 z-50" aria-hidden="true" />
          )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <AmbientShaderBackground veil={false} pour={!full} />

          {/* Full-frame veils — the readability washes over the flooded mesh.
              Gone fast when the pour starts (the journey plays raw); back in
              late on the rise, once the mesh has rebuilt. */}
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: full ? 1 : 0 }}
            transition={
              full
                ? { duration: 0.5, ease: EASE, delay: 1.0 }
                : { duration: 0.45, ease: 'easeOut' }
            }
          >
            {/* Downward white fade so the lower content resolves toward white
                and stays readable around the composer. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.72) 74%, #ffffff 100%)',
              }}
            />
            {/* Subtle radial white mask that keeps contrast behind content. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 45% at 50% 60%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
              }}
            />
          </motion.div>

          {/* Composer wash — solid white down to the band, then milky through
              it to desaturate/soften the pooled mesh, nearly clear at the
              bottom so the color animation reads strongest along the frame's
              bottom edge. It settles in only after the pour has landed, and
              lifts off first when the mesh rises. */}
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: full ? 0 : 1 }}
            transition={
              full
                ? { duration: 0.22, ease: 'easeOut' }
                : { duration: 0.45, ease: EASE, delay: 1.0 }
            }
            style={{
              background:
                'linear-gradient(to bottom, #ffffff 0%, #ffffff calc(100% - 260px), rgba(255,255,255,0.92) calc(100% - 208px), rgba(255,255,255,0.7) calc(100% - 146px), rgba(255,255,255,0.42) calc(100% - 83px), rgba(255,255,255,0.16) calc(100% - 31px), rgba(255,255,255,0.08) 100%)',
            }}
          />
        </div>
        {children}
        </motion.div>
      </div>
    </div>
  )
}
