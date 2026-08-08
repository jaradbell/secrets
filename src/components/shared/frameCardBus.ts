/**
 * The screen-as-card channel. When a prototype opens its side menu (5E),
 * the whole running app — mesh, content, dock — pulls away to the right
 * and settles as a floating card over the menu surface (the Timepage
 * move). The shell owns the transform; prototypes just flip this switch.
 * Tapping the card is the way back, so the shell can also flip it off.
 */
import { useSyncExternalStore } from 'react'

let open = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

export const frameCardBus = {
  set(next: boolean) {
    if (open === next) return
    open = next
    emit()
  },
}

export function useFrameCard() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => open,
  )
}
