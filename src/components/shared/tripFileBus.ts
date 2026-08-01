/**
 * Render-light channel for the trip file overlay — the conversation's
 * collected receipts. The header island opens it, the dock's X closes it,
 * and the overlay itself subscribes; none of them share a React ancestor
 * with state, so a tiny external store keeps the wiring flat.
 */
import { useSyncExternalStore } from 'react'

let isOpen = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

export const tripFileBus = {
  open() {
    if (isOpen) return
    isOpen = true
    emit()
  },
  close() {
    if (!isOpen) return
    isOpen = false
    emit()
  },
}

export function useTripFileOpen() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => isOpen,
  )
}
