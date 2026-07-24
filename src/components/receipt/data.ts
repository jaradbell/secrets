/**
 * Seed data for the Transaction prototype: one assistant recommendation with
 * ranked alternatives, attributed to switchable providers. Ratings (value,
 * review count, and star color) are provider-specific; each provider also
 * ranks the alternatives in its own order.
 */

export type ProviderId = 'yelp' | 'google' | 'opentable'

export type Provider = {
  id: ProviderId
  name: string
  icon: string
  /** Brand color used for that provider's star ratings. */
  starColor: string
}

export const PROVIDERS: Provider[] = [
  { id: 'yelp', name: 'Yelp', icon: '/providers/yelp.svg', starColor: '#D32323' },
  { id: 'google', name: 'Google Places', icon: '/providers/googlemaps.svg', starColor: '#FBBC04' },
  { id: 'opentable', name: 'OpenTable', icon: '/providers/opentable.svg', starColor: '#DA3743' },
]

export type Place = {
  id: string
  name: string
  cuisine: string
  price: string
  image: string
}

const PLACES: Record<string, Place> = {
  valette: {
    id: 'valette',
    name: 'Valette Restaurant',
    cuisine: 'Contemporary American',
    price: '$$$',
    image: '/places/valette.jpg',
  },
  barndiva: {
    id: 'barndiva',
    name: 'Barndiva',
    cuisine: 'Californian • Garden dining',
    price: '$$$',
    image: '/places/barndiva.jpg',
  },
  bravas: {
    id: 'bravas',
    name: 'Bravas Bar de Tapas',
    cuisine: 'Spanish • Tapas',
    price: '$$',
    image: '/places/bravas.jpg',
  },
  chalkboard: {
    id: 'chalkboard',
    name: 'Chalkboard',
    cuisine: 'New American • Small plates',
    price: '$$',
    image: '/places/chalkboard.jpg',
  },
}

export type RankedResult = {
  place: Place
  rating: number
  reviews: number
}

/** Each provider's ranking — Valette leads everywhere (it's the pick), but
 *  the alternatives reorder and every rating/count is provider-specific. */
export const PROVIDER_RESULTS: Record<ProviderId, RankedResult[]> = {
  yelp: [
    { place: PLACES.valette, rating: 4.7, reviews: 735 },
    { place: PLACES.bravas, rating: 4.5, reviews: 612 },
    { place: PLACES.chalkboard, rating: 4.4, reviews: 489 },
    { place: PLACES.barndiva, rating: 4.2, reviews: 858 },
  ],
  google: [
    { place: PLACES.valette, rating: 4.6, reviews: 1204 },
    { place: PLACES.barndiva, rating: 4.5, reviews: 1876 },
    { place: PLACES.bravas, rating: 4.4, reviews: 1521 },
    { place: PLACES.chalkboard, rating: 4.4, reviews: 967 },
  ],
  opentable: [
    { place: PLACES.valette, rating: 4.8, reviews: 2103 },
    { place: PLACES.chalkboard, rating: 4.7, reviews: 1345 },
    { place: PLACES.barndiva, rating: 4.6, reviews: 2914 },
    { place: PLACES.bravas, rating: 4.5, reviews: 1078 },
  ],
}
