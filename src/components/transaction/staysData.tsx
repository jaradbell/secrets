/**
 * Seed data for the stays list-result variant (prototype 8D): three
 * switchable rental marketplaces, each ranking its own Los Angeles
 * weekend inventory. Mirrors flightData's provider grammar — the chips
 * swap whose listings (and mix: homes vs. villas vs. hotels) the cards
 * carry. StayChips lives here so the thread and the full list share it.
 */
import { motion } from 'framer-motion'

export type StayProviderId = 'airbnb' | 'vrbo' | 'expedia'

export type StayProvider = {
  id: StayProviderId
  name: string
  /** Circular chip mark (the brand's bare glyph or compact wordmark). */
  icon: string
  /** Mark sizing inside the 32px disc — wordmarks run wider than glyphs. */
  iconClass: string
  /** Brand color — carries the details view's price pill and its go. */
  brandColor: string
  /** The brand's fuller palette, for the celebration's wall glow. */
  glowColors: string[]
}

export const STAY_PROVIDERS: StayProvider[] = [
  {
    id: 'airbnb',
    name: 'Airbnb',
    icon: '/stays/airbnb.svg',
    iconClass: 'h-[18px] w-[18px]',
    brandColor: '#FF385C',
    glowColors: ['#FF385C', '#BD1E59', '#FF7A97'],
  },
  {
    id: 'vrbo',
    name: 'Vrbo',
    icon: '/stays/vrbo.svg',
    iconClass: 'h-[14px] w-[24px]',
    brandColor: '#245ABC',
    glowColors: ['#245ABC', '#3CC8B4', '#7CA8E8'],
  },
  {
    id: 'expedia',
    name: 'Expedia',
    icon: '/providers/expedia.png',
    iconClass: 'h-[18px] w-[18px]',
    brandColor: '#1D2E7B',
    glowColors: ['#1D2E7B', '#2B54D2', '#FFC94C'],
  },
]

export type Stay = {
  id: string
  /** Listing headline, the marketplace's grammar: "Home in Los Angeles". */
  title: string
  /** The neighborhood — the place's identity line ("Los Feliz"). */
  area: string
  /** The spec line: "3 bedrooms • 3 beds • 2.5 bathrooms". */
  specs: string
  /** The assistant's read on the place — the bolded lead phrase… */
  aboutLead: string
  /** …and the rest of the sentence(s) behind it. */
  aboutRest: string
  /** Total for the stay, in dollars. */
  price: number
  nights: number
  rating: number
  reviews: number
  photo: string
}

const PHOTOS = {
  laHome: '/stays/la-home.jpg',
  deck: '/receipts/photos/hotel-deck.jpg',
  pool: '/receipts/photos/hotel-pool.jpg',
  room: '/receipts/photos/hotel-room.jpg',
}

/** Each marketplace's weekend picks, in its own preferred order — the
    first listing is the lead (the one the thread's stack fronts). The
    lead Airbnb home is the Figma card verbatim (node 2377:73083). */
export const PROVIDER_STAYS: Record<StayProviderId, Stay[]> = {
  airbnb: [
    { id: 'ab-1', title: 'Home in Los Angeles', area: 'Los Feliz', specs: '3 bedrooms • 3 beds • 2.5 bathrooms', aboutLead: 'A light-filled hillside home guests keep coming back to', aboutRest: 'the wraparound deck looks over the canyon, the kitchen is stocked for real cooking, and Los Feliz coffee and Griffith trails are a short walk downhill.', price: 3400, nights: 4, rating: 4.7, reviews: 165, photo: PHOTOS.laHome },
    { id: 'ab-2', title: 'Guesthouse in Silver Lake', area: 'Silver Lake', specs: '1 bedroom • 1 bed • 1 bathroom', aboutLead: 'A designer\u2019s backyard studio that lives bigger than it is', aboutRest: 'private patio under a fig tree, records and good light inside, and the reservoir loop two blocks away. Reviewers call it the quietest stay on the east side.', price: 1180, nights: 4, rating: 4.9, reviews: 212, photo: PHOTOS.deck },
    { id: 'ab-3', title: 'Condo in Santa Monica', area: 'Santa Monica', specs: '2 bedrooms • 2 beds • 2 bathrooms', aboutLead: 'Three blocks from the sand with the windows open to the breeze', aboutRest: 'a bright corner unit with two real bedrooms, beach cruisers in the garage, and Main Street\u2019s cafés between you and the water.', price: 2260, nights: 4, rating: 4.8, reviews: 98, photo: PHOTOS.room },
    { id: 'ab-4', title: 'Bungalow in Venice', area: 'Venice', specs: '2 bedrooms • 3 beds • 1 bathroom', aboutLead: 'A craftsman bungalow a block off Abbot Kinney', aboutRest: 'hammock in the yard, outdoor shower for after the beach, and the canals at the end of the street. Hosts leave a list of their favorite counters and bars.', price: 1840, nights: 4, rating: 4.6, reviews: 143, photo: PHOTOS.pool },
  ],
  vrbo: [
    { id: 'vr-1', title: 'Villa in the Hollywood Hills', area: 'Hollywood Hills', specs: '4 bedrooms • 5 beds • 3.5 bathrooms', aboutLead: 'The sunset-view villa the group photos get taken at', aboutRest: 'an infinity pool hanging over the canyon, floor-to-ceiling glass across the main floor, and room for the whole crew without sharing bathrooms.', price: 4620, nights: 4, rating: 4.8, reviews: 87, photo: PHOTOS.pool },
    { id: 'vr-2', title: 'Cottage in Los Feliz', area: 'Los Feliz', specs: '2 bedrooms • 2 beds • 1 bathroom', aboutLead: 'A storybook cottage behind a garden gate', aboutRest: 'breakfast happens outside under the olive tree, and Griffith Observatory trails start ten minutes from the door. Guests mention the host\u2019s welcome basket by name.', price: 1560, nights: 4, rating: 4.9, reviews: 134, photo: PHOTOS.laHome },
    { id: 'vr-3', title: 'Beach house in Malibu', area: 'Malibu', specs: '3 bedrooms • 4 beds • 2 bathrooms', aboutLead: 'Right on the sand \u2014 the deck sits over the break', aboutRest: 'fall asleep to the water, coffee on the rail at sunrise, fire pit going by dusk. Reviewers say the photos undersell it.', price: 3980, nights: 4, rating: 4.7, reviews: 76, photo: PHOTOS.deck },
    { id: 'vr-4', title: 'Cabin in Topanga', area: 'Topanga', specs: '1 bedroom • 2 beds • 1 bathroom', aboutLead: 'A creekside A-frame under the oaks', aboutRest: 'wood stove, deep tub, no neighbors in sight \u2014 twenty minutes from the coast but it reads like another state. The stargazing gets its own paragraph in most reviews.', price: 1240, nights: 4, rating: 4.8, reviews: 158, photo: PHOTOS.room },
  ],
  expedia: [
    { id: 'ex-1', title: 'Hotel in West Hollywood', area: 'West Hollywood', specs: 'King room • Sleeps 2 • Pool', aboutLead: 'A rooftop-pool hotel in the middle of everything', aboutRest: 'Sunset Strip views from the deck, walkable nights out, and daily housekeeping so the weekend stays a weekend.', price: 1720, nights: 4, rating: 4.6, reviews: 1240, photo: PHOTOS.pool },
    { id: 'ex-2', title: 'Boutique hotel in DTLA', area: 'Downtown LA', specs: 'Queen room • Sleeps 2 • Rooftop bar', aboutLead: 'A 1920s bank building turned boutique stay', aboutRest: 'marble lobby, rooms with the original windows, and a rooftop bar that locals actually go to. Grand Central Market is two blocks over.', price: 1380, nights: 4, rating: 4.5, reviews: 890, photo: PHOTOS.room },
    { id: 'ex-3', title: 'Resort in Santa Monica', area: 'Santa Monica', specs: 'Suite • Sleeps 4 • Ocean view', aboutLead: 'Ocean-view suites a short walk from the pier', aboutRest: 'spa mornings, cabana afternoons, and the beach path right below the terrace. Guests flag the sunset from the suite balconies as the highlight.', price: 2980, nights: 4, rating: 4.7, reviews: 654, photo: PHOTOS.deck },
    { id: 'ex-4', title: 'Aparthotel in Beverly Hills', area: 'Beverly Hills', specs: '1 bedroom • Sleeps 3 • Kitchen', aboutLead: 'An apartment\u2019s room with a hotel\u2019s front desk', aboutRest: 'full kitchen, a real living room, and laundry down the hall \u2014 the pick for staying settled. Rodeo and the farmers market are both walkable.', price: 2140, nights: 4, rating: 4.4, reviews: 432, photo: PHOTOS.laHome },
  ],
}

/** Marketplace chips — AirlineChips' attribution grammar pointed at rental
    sources: the active brand unrolls its name, and toggling re-sources
    every card below. */
export function StayChips({
  active,
  onSelect,
}: {
  active: StayProviderId
  onSelect: (id: StayProviderId) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {STAY_PROVIDERS.map((p) => {
        const isActive = p.id === active
        return (
          <motion.button
            key={p.id}
            type="button"
            layout
            onClick={() => onSelect(p.id)}
            aria-pressed={isActive}
            aria-label={p.name}
            className="flex items-center rounded-full border border-white/20 p-1 outline-none"
            style={{ background: 'rgba(0,0,0,0.04)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-white">
              <img
                src={p.icon}
                alt=""
                draggable={false}
                className={`${p.iconClass} object-contain`}
              />
            </span>
            {isActive && (
              <motion.span
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-1 flex h-8 items-center rounded-full bg-white/80 px-3 text-[12px] font-medium tracking-[0.2px] whitespace-nowrap text-ink"
              >
                {p.name}
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
