/**
 * Chips for the inline dock's suggestion tray (receipt prototype only).
 * These are the place-detail actions that used to float as a banner in
 * PlaceDetailsView — now fed to VoiceControl so the dock itself expands and
 * collapses them. 'Get reservation' is the live one; it funnels into the
 * reservation flow against the focused place.
 */
import type { ReactNode } from 'react'
import type { DockSuggestion } from '../voice/VoiceControl'

const ICON_PROPS = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#fff',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const ICONS: Record<string, ReactNode> = {
  reserve: (
    <svg {...ICON_PROPS}>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 10h17M8 2.5V6M16 2.5V6" />
    </svg>
  ),
  directions: (
    <svg {...ICON_PROPS}>
      <path d="M3.5 11.5 21 3.5 13 21l-2.2-7.3L3.5 11.5Z" />
    </svg>
  ),
  order: (
    <svg {...ICON_PROPS}>
      <path d="M5.5 8h13l-1.1 12.5h-10.8L5.5 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  ),
  call: (
    <svg {...ICON_PROPS}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  ),
  website: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
    </svg>
  ),
}

export const RECEIPT_DOCK_SUGGESTIONS: DockSuggestion[] = [
  { id: 'reserve', label: 'Get reservation', kind: 'reserve', icon: ICONS.reserve },
  { id: 'directions', label: 'Directions', icon: ICONS.directions },
  { id: 'order', label: 'Order online', icon: ICONS.order },
  { id: 'call', label: 'Call', icon: ICONS.call },
  { id: 'website', label: 'Website', icon: ICONS.website },
]
