/**
 * 8B's booking handoff — the flight store's grammar pointed at places.
 * The details view writes it when a place opens (the provider chip that
 * sourced the result rides along); the receipt takeover and its
 * celebration read it. One booking is in flight at a time, so a
 * singleton carries it fine at prototype grade.
 */
import type { Provider, RankedResult } from './data'

export type PlaceBookingDetails = {
  provider: Provider | null
  result: RankedResult | null
}

export const placeBooking: PlaceBookingDetails = {
  provider: null,
  result: null,
}

/** The confirmation number reads in the provider's own register. */
export function placeConfirmation(providerId?: string) {
  if (providerId === 'google') return '#GPL-4417'
  if (providerId === 'opentable') return '#VLT-8127'
  return '#YLP-2054'
}
