import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { AmbientShaderBackground } from '../shared/AmbientShaderBackground'
import { useAmbientOverride } from '../shared/ambientBus'

/**
 * Frames the experience like a running mobile product. On desktop it centers a
 * ~393×852 viewport over a quiet neutral background with a subtle border and
 * large outer radius. On mobile it fills the screen using 100dvh and respects
 * safe-area insets. No fake phone hardware, clock, or status indicators.
 *
 * `ambient` controls the shader background: 'full' floods the frame (resting
 * screens); 'composer' drops it to a soft band at the bottom of the frame so
 * it glows behind the composer zone while conversation content sits on canvas.
 * A prototype that moves between altitudes at runtime (1C) can override the
 * registered mode through the ambientBus; the shell crossfades between them.
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
        <AnimatePresence initial={false}>
          <motion.div
            key={mode}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {mode === 'full' ? (
              <AmbientShaderBackground />
            ) : (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px] overflow-hidden">
                <AmbientShaderBackground veil={false} />
                {/* White gradient veil (instead of an alpha mask, whose fade
                    edge read as a seam against the canvas): solid white at
                    the top so the band dissolves into the page with no
                    break, milky through the middle to desaturate/soften the
                    mesh, and nearly clear at the bottom so the color
                    animation reads strongest along the bottom edge of the
                    frame. */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.92) 20%, rgba(255,255,255,0.7) 44%, rgba(255,255,255,0.42) 68%, rgba(255,255,255,0.16) 88%, rgba(255,255,255,0.08) 100%)',
                  }}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {children}
      </div>
    </div>
  )
}
