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
  /** Street address — surfaces where a screen wants real location. */
  address: string
  /** The assistant's 0–100 fit to the ask — provider-independent, unlike
      ratings: it's *our* number, so it never rewrites when providers flip. */
  match: number
}

const PLACES: Record<string, Place> = {
  valette: {
    id: 'valette',
    name: 'Valette Restaurant',
    cuisine: 'Contemporary American',
    price: '$$$',
    image: '/places/valette.jpg',
    address: '344 Center St, Healdsburg, CA',
    match: 88,
  },
  barndiva: {
    id: 'barndiva',
    name: 'Barndiva',
    cuisine: 'Californian • Garden dining',
    price: '$$$',
    image: '/places/barndiva.jpg',
    address: '231 Center St, Healdsburg, CA',
    match: 76,
  },
  bravas: {
    id: 'bravas',
    name: 'Bravas Bar de Tapas',
    cuisine: 'Spanish • Tapas',
    price: '$$',
    image: '/places/bravas.jpg',
    address: '420 Center St, Healdsburg, CA',
    match: 71,
  },
  chalkboard: {
    id: 'chalkboard',
    name: 'Chalkboard',
    cuisine: 'New American • Small plates',
    price: '$$',
    image: '/places/chalkboard.jpg',
    address: '29 North St, Healdsburg, CA',
    match: 81,
  },
}

export type RankedResult = {
  place: Place
  rating: number
  reviews: number
}

/** Compare-only results — the sheet reads like a full results surface while
    the thread's stack keeps just the top picks. No map pins: the map stays
    focused on the four contenders. Ratings rewrite per provider like the
    shared set. */
export const EXTRA_PLACES: Record<string, Place> = {
  singlethread: {
    id: 'singlethread',
    name: 'SingleThread',
    cuisine: 'Farm-to-table • Tasting menu',
    price: '$$$$',
    image: '/receipts/photos/menu-spread.jpg',
    address: '131 North St, Healdsburg, CA',
    match: 64,
  },
  willis: {
    id: 'willis',
    name: "Willi's Seafood & Raw Bar",
    cuisine: 'Seafood • Small plates',
    price: '$$',
    image: '/receipts/photos/menu-plate.jpg',
    address: '403 Healdsburg Ave, Healdsburg, CA',
    match: 68,
  },
  campofina: {
    id: 'campofina',
    name: 'Campo Fina',
    cuisine: 'Italian • Wood-fired',
    price: '$$',
    image: '/receipts/photos/menu-bowl.jpg',
    address: '330 Healdsburg Ave, Healdsburg, CA',
    match: 59,
  },
}

export const EXTRA_RESULTS: Record<ProviderId, RankedResult[]> = {
  yelp: [
    { place: EXTRA_PLACES.singlethread, rating: 4.9, reviews: 486 },
    { place: EXTRA_PLACES.willis, rating: 4.4, reviews: 923 },
    { place: EXTRA_PLACES.campofina, rating: 4.3, reviews: 741 },
  ],
  google: [
    { place: EXTRA_PLACES.singlethread, rating: 4.8, reviews: 1042 },
    { place: EXTRA_PLACES.willis, rating: 4.5, reviews: 2318 },
    { place: EXTRA_PLACES.campofina, rating: 4.4, reviews: 1187 },
  ],
  opentable: [
    { place: EXTRA_PLACES.singlethread, rating: 4.9, reviews: 1764 },
    { place: EXTRA_PLACES.willis, rating: 4.6, reviews: 2051 },
    { place: EXTRA_PLACES.campofina, rating: 4.5, reviews: 894 },
  ],
}

/** 1-based standing of every known place by match score — the assistant's
    ranking is global and static (scores never rewrite per provider), so the
    map, list, and details view all agree on who's #1. */
const RANK_BY_ID = new Map(
  [...Object.values(PLACES), ...Object.values(EXTRA_PLACES)]
    .sort((a, b) => b.match - a.match)
    .map((p, i) => [p.id, i + 1]),
)

export const matchRankOf = (placeId: string): number => RANK_BY_ID.get(placeId) ?? 0

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
