/**
 * Render-light override channel for the shell's ambient mode. Prototypes
 * are registered with a static ambient ('full' | 'composer'), but 1C moves
 * between altitudes inside one prototype — full mesh at the home, composer
 * band inside a thread — so it drives the shell through this store instead.
 * Null means "use the registered mode".
 */
import { useSyncExternalStore } from 'react'

type AmbientMode = 'full' | 'composer'

let override: AmbientMode | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

export const ambientBus = {
  set(mode: AmbientMode | null) {
    if (override === mode) return
    override = mode
    emit()
  },
}

export function useAmbientOverride() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => override,
  )
}
