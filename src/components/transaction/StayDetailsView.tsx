/**
 * Stay drill-in — the details view behind 8D's cards (the stays answer to
 * FlightDetailsView). Clip-morphs open from the tapped card's geometry
 * onto a full surface: the listing photo full-bleed up top, then a sheet
 * that keeps our chrome (provider overline, headline, action chips, the
 * status banner) but reads like a listing, leaning Airbnb: the rating /
 * guest-favorite / reviews trio, "Stay with" the host, "About this place"
 * prose, "Where you'll sleep" cards, the amenity rows with their "Show
 * all", and a "Where you'll be" map.
 *
 * Booking splits the dock: this sheet registers a "Reserve now" CTA with
 * the reservation flow, so the brand-colored pill takes the dock's left
 * lane while the assistant's orb rides right. The CTA raises the Apple Pay
 * sheet (the draft card's own lane, borrowed verbatim), and the Face ID
 * confirm hands the flow a complete intent: booking blooms into the
 * celebration takeover.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ApplePaySheet } from './FlightDraftCard'
import { useReservationFlow } from './reservationFlow'
import { hostFor, stayBooking, STAY_TRIP } from './stayBookingStore'
import { PROVIDER_STAYS, type Stay, type StayProvider } from './staysData'

const EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const

/** Where the morph starts: the tapped card's insets from the frame. */
export type StayDetailsOrigin = { top: number; right: number; bottom: number; left: number }

/** Prototype-grade listing facts the seed data doesn't carry. */
const AMENITY_POOL = [
  'Fast wifi',
  'Free parking',
  'Pool',
  'A/C',
  'Full kitchen',
  'Washer',
  'Hot tub',
  'Workspace',
  'EV charger',
  'Pets welcome',
]

/** Line icons for the amenity rows — paths in a 24 grid, stroked. */
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'Fast wifi': (
    <>
      <path d="M4.5 12a11 11 0 0 1 15 0" />
      <path d="M8 15.2a6.2 6.2 0 0 1 8 0" />
      <path d="M12 18.6h.01" strokeWidth="3" />
    </>
  ),
  'Free parking': (
    <>
      <path d="M4 11.5 5.6 6.8A2 2 0 0 1 7.5 5.5h9a2 2 0 0 1 1.9 1.3L20 11.5" />
      <path d="M4 11.5h16v5.5H4zM5.5 17v1.8M18.5 17v1.8" />
      <path d="M7.5 14.2h.01M16.5 14.2h.01" strokeWidth="2.6" />
    </>
  ),
  Pool: (
    <>
      <path d="M3 14c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" />
      <path d="M3 18.2c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" />
      <path d="M14.5 11V5.8a1.8 1.8 0 0 1 3.6 0" />
    </>
  ),
  'A/C': (
    <>
      <path d="M12 3v18M5 7.5l14 9M19 7.5l-14 9" />
    </>
  ),
  'Full kitchen': (
    <>
      <path d="M7.5 3v18M7.5 10.5a3 3 0 0 0 3-3V3M7.5 10.5a3 3 0 0 1-3-3V3" />
      <path d="M16.5 3v18M16.5 12c-2.2-1.4-2.6-6.6 0-9" />
    </>
  ),
  Washer: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <circle cx="12" cy="13" r="4.2" />
      <path d="M7.5 6.5h.01M10.2 6.5h.01" strokeWidth="2.6" />
    </>
  ),
  'Hot tub': (
    <>
      <path d="M8 3.5c-.9 1.3.9 2.2 0 3.5M12 3.5c-.9 1.3.9 2.2 0 3.5M16 3.5c-.9 1.3.9 2.2 0 3.5" />
      <path d="M4 11.5h16v5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5z" />
    </>
  ),
  Workspace: (
    <>
      <path d="M5 5.5h14v9H5zM3 18.5h18" />
    </>
  ),
  'EV charger': (
    <>
      <path d="M13 2.5 6 13h5l-1 8.5 8-12h-5z" />
    </>
  ),
  'Pets welcome': (
    <>
      <path d="M12 12.8c2.6 0 4.6 1.9 4.6 4.2 0 1.6-1.2 2.7-2.7 2.7-.8 0-1.3-.3-1.9-.3s-1.1.3-1.9.3c-1.5 0-2.7-1.1-2.7-2.7 0-2.3 2-4.2 4.6-4.2Z" />
      <circle cx="7" cy="10" r="1.3" />
      <circle cx="10.2" cy="6.8" r="1.3" />
      <circle cx="13.8" cy="6.8" r="1.3" />
      <circle cx="17" cy="10" r="1.3" />
    </>
  ),
}

const listingFacts = (id: string) => {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return {
    amenities: Array.from(
      { length: 5 },
      (_, i) => AMENITY_POOL[(n + i * 3) % AMENITY_POOL.length],
    ),
    allAmenities: 12 + (n % 9),
    photoCount: 14 + (n % 13),
    // Where the pin lands on the LA basemap — stable per listing.
    mapPosition: `${22 + (n % 56)}% ${18 + ((n * 7) % 54)}%`,
  }
}

/** "3 bedrooms • 3 beds • 2.5 bathrooms" → how many the place sleeps. */
const sleepsOf = (specs: string) => {
  const beds = specs.match(/(\d+)\s+beds?/)?.[1]
  return beds ? Math.max(2, parseInt(beds, 10) * 2) : 2
}

/** How many "Where you'll sleep" cards the specs support (hotel rooms
    without a bedroom count get one). */
const bedroomsOf = (specs: string) => {
  const rooms = specs.match(/(\d+)\s+bedrooms?/)?.[1]
  return rooms ? Math.min(3, parseInt(rooms, 10)) : 1
}
const bedLineFor = (specs: string, i: number) => {
  if (/king/i.test(specs)) return '1 king bed'
  return i === 0 ? '1 queen bed' : i === 1 ? '1 double bed' : '2 single beds'
}

/** One branch of the guest-favorite laurel — flip it for the right side. */
function LaurelBranch({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="10"
      height="26"
      viewBox="0 0 12 30"
      fill="none"
      stroke="#171717"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M10.5 2C5 7.5 4.2 21 9.5 28" />
      <path d="M7 7.8 3.6 6.2M5.6 13.2 2 12.4M5.6 18.8 2.2 19.6M7 24 4 25.8" />
    </svg>
  )
}

/** The listing sections' small bold heading. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 text-[15px] font-bold tracking-[-0.01em] text-ink">{children}</p>
  )
}

function ActionChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 text-[12px] font-medium whitespace-nowrap text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.96]"
    >
      {icon}
      {label}
    </button>
  )
}

export function StayDetailsView({
  stay,
  provider,
  origin,
  onClose,
  onBooked,
}: {
  stay: Stay
  provider: StayProvider
  origin: StayDetailsOrigin
  onClose: () => void
  /** Paid — the Apple Pay confirm landed and the store carries the booking.
      The host hands the flow its complete intent and resolves the thread. */
  onBooked: () => void
}) {
  // The details surface owns the moment — the orb stays live, hint down.
  const flow = useReservationFlow()
  const setHintSuppressed = flow?.setHintSuppressed
  useEffect(() => {
    setHintSuppressed?.(true)
    return () => setHintSuppressed?.(false)
  }, [setHintSuppressed])
  const processing = flow?.stage === 'booking' || flow?.stage === 'receipt'

  const host = hostFor(stay.id)
  const facts = listingFacts(stay.id)
  const nightly = Math.round(stay.price / stay.nights)
  // The sleep cards' photos — the listing's other rooms (its deck-mates'
  // photos stand in at prototype grade).
  const roomPhotos = PROVIDER_STAYS[provider.id]
    .map((s) => s.photo)
    .filter((p) => p !== stay.photo)
  const bedrooms = bedroomsOf(stay.specs)
  const showSleeps = !/sleeps/i.test(stay.specs)

  // The Apple Pay sheet rides the frame's viewport, above everything.
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])
  const [paySheet, setPaySheet] = useState(false)

  // The sheet's go lives in the dock: register "Reserve now" with the flow
  // so the CTA takes the dock's left lane and the orb slides right.
  const setDockCta = flow?.setDockCta
  useEffect(() => {
    setDockCta?.({
      label: processing ? 'Booking\u2026' : 'Reserve now',
      sub: `$${stay.price.toLocaleString()} total \u00B7 ${STAY_TRIP.dates}`,
      color: provider.brandColor,
      icon: (
        <img
          src={provider.icon}
          alt=""
          draggable={false}
          className={`${provider.iconClass} object-contain`}
        />
      ),
      disabled: processing,
      onTap: () => setPaySheet(true),
    })
    return () => setDockCta?.(null)
  }, [setDockCta, stay, provider, processing])

  /** Face ID passed: snapshot the booking for the celebration surfaces,
      then hand the moment back to the host (which opens the flow). */
  const confirmPay = () => {
    setPaySheet(false)
    stayBooking.stay = stay
    stayBooking.provider = provider
    stayBooking.total = stay.price
    onBooked()
  }

  const originClip = `inset(${origin.top}px ${origin.right}px ${origin.bottom}px ${origin.left}px round 32px)`

  return (
    <motion.div
      className="absolute inset-0 z-[30] flex flex-col overflow-hidden bg-[#fcfcfc]"
      initial={{ clipPath: originClip, opacity: 1 }}
      animate={{ clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }}
      exit={{
        clipPath: originClip,
        opacity: 0,
        transition: {
          clipPath: { duration: 0.4, ease: CLOSE_EASE },
          opacity: { duration: 0.14, delay: 0.26 },
        },
      }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {/* The listing photo — full-bleed behind the sheet (the stays answer
          to the flight's basemap). */}
      <div className="absolute inset-x-0 top-0 h-[290px]">
        <img
          src={stay.photo}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
        />
        {/* Save heart — floats over the photo, the card's own affordance. */}
        <span className="absolute top-[calc(var(--safe-top)+14px)] right-4 flex size-9 items-center justify-center rounded-full bg-white/85 shadow-[0_2px_12px_rgba(0,0,0,0.16)] backdrop-blur-[6px]">
          <img src="/stays/heart.svg" alt="Save" draggable={false} className="w-[17px]" />
        </span>
        {/* Gallery pager — there's more of the place than the hero. */}
        <span className="absolute top-[158px] right-4 flex items-center rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-[6px]">
          1 / {facts.photoCount}
        </span>
      </div>

      {/* The sheet — rounded over the photo, scrolling its own content. */}
      <div className="relative z-[1] mt-[196px] flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white shadow-[0_-18px_50px_-20px_rgba(20,16,28,0.35)]">
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 pt-5"
          style={{ scrollbarWidth: 'none', paddingBottom: 'calc(var(--safe-bottom) + 170px)' }}
        >
          {/* Header — the listing headline carries the moment; the
              marketplace's mark rides the docked Reserve pill instead. */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[20px] leading-[1.2] font-bold tracking-[-0.02em] text-ink">
                {stay.title}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-tertiary">
                {stay.specs.replace(/ • /g, ' \u00B7 ')}
                {showSleeps && <> &middot; Sleeps {sleepsOf(stay.specs)}</>}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close stay details"
              onClick={onClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] outline-none transition-transform duration-200 ease-out active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3 13 13M13 3 3 13" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Action chips. */}
          <div className="-mx-5 mt-4 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
            <div className="flex w-max items-center gap-2">
              <ActionChip
                label="Message host"
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.7 8.7 0 0 1-3.6-.8L3 20l1.1-5.4a8 8 0 0 1-.6-3.1A8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.3Z" />
                  </svg>
                }
              />
              <ActionChip
                label="Directions"
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2ZM9 4v14M15 6v14" />
                  </svg>
                }
              />
              <ActionChip
                label="Share"
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 15V4M8 7.5 12 3.5l4 4M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Status banner — the tracker's voice, tuned for pre-booking.
              The price context rides here now that the go lives in the dock. */}
          <div className="-mx-5 mt-3.5 bg-black/[0.04] px-5 py-2.5">
            <p className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">
              Rare find &mdash; this place is usually booked
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-tertiary">
              ${nightly.toLocaleString()} / night &middot; free cancellation before May 15
            </p>
          </div>

          {/* Rating / guest favorite / reviews — the listing's trust trio. */}
          <div className="mt-4 grid grid-cols-3 divide-x divide-black/[0.08] rounded-[18px] border border-black/[0.08] py-3">
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="text-[16px] leading-none font-bold text-ink">{stay.rating}</p>
              <span className="flex items-center gap-[2px]" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <img
                    key={i}
                    src={i < Math.round(stay.rating) ? '/stays/star-fill.svg' : '/stays/star-dim.svg'}
                    alt=""
                    draggable={false}
                    className="size-[8px]"
                  />
                ))}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <LaurelBranch />
              <p className="w-[46px] text-center text-[11px] leading-[1.2] font-semibold text-ink">
                Guest favorite
              </p>
              <LaurelBranch flip />
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="text-[16px] leading-none font-bold text-ink">{stay.reviews}</p>
              <p className="text-[10.5px] leading-none text-ink-tertiary">Reviews</p>
            </div>
          </div>

          {/* The host. */}
          <div className="mt-4 flex items-center gap-3 border-b border-black/[0.06] pb-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-white">
              {host.name[0]}
            </span>
            <div className="flex flex-col gap-px">
              <p className="text-[13px] font-semibold text-ink">Stay with {host.name}</p>
              <p className="text-[11.5px] text-ink-tertiary">
                Superhost &middot; {host.years} years hosting
              </p>
            </div>
          </div>

          {/* About this place. */}
          <SectionTitle>About this place</SectionTitle>
          <p className="mt-2 text-[13.5px] leading-[21px] text-ink">
            <span className="font-bold">{stay.aboutLead}</span> &mdash; {stay.aboutRest}
          </p>
          <button
            type="button"
            className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-black/[0.04] text-[13px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.98]"
          >
            Show more
          </button>

          {/* Where you'll sleep — one card per bedroom. */}
          <SectionTitle>Where you&rsquo;ll sleep</SectionTitle>
          <div className="-mx-5 mt-2.5 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
            <div className="flex w-max gap-2.5">
              {Array.from({ length: bedrooms }, (_, i) => (
                <div key={i} className="flex w-[152px] shrink-0 flex-col">
                  <img
                    src={roomPhotos[i % roomPhotos.length]}
                    alt=""
                    draggable={false}
                    className="h-[110px] w-full rounded-[16px] object-cover"
                  />
                  <p className="mt-2 text-[12.5px] leading-none font-semibold text-ink">
                    {bedrooms > 1 ? `Bedroom ${i + 1}` : 'Bedroom'}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-none text-ink-tertiary">
                    {bedLineFor(stay.specs, i)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* What this place offers — the amenity rows and their door. */}
          <SectionTitle>What this place offers</SectionTitle>
          <div className="mt-1 flex flex-col">
            {facts.amenities.map((label, i) => (
              <div
                key={label}
                className={`flex items-center gap-3.5 py-3 ${
                  i > 0 ? 'border-t border-black/[0.05]' : ''
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                  {AMENITY_ICONS[label]}
                </svg>
                <span className="text-[13px] text-ink">{label}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-1 flex h-10 w-full items-center justify-center rounded-full bg-black/[0.04] text-[13px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.98]"
          >
            Show all {facts.allAmenities} amenities
          </button>

          {/* Where you'll be. */}
          <SectionTitle>Where you&rsquo;ll be</SectionTitle>
          <p className="mt-1 text-[12px] text-ink-tertiary">{stay.area}, Los Angeles</p>
          <div className="relative mt-2.5 h-[180px] overflow-hidden rounded-[18px] border border-black/[0.06]">
            <img
              src="/map/la.png"
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full scale-[1.6] object-cover"
              style={{ objectPosition: facts.mapPosition }}
            />
            {/* The approximate-location halo + the marketplace's pin. */}
            <span
              aria-hidden
              className="absolute top-1/2 left-1/2 size-[104px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: `${provider.brandColor}26`, border: `1px solid ${provider.brandColor}55` }}
            />
            <span
              className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
              style={{ background: provider.brandColor }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m4 11 8-7 8 7M6.5 9.3V20h11V9.3" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* The Apple Pay sheet — the draft card's lane, hosted here. */}
      {viewport &&
        createPortal(
          <AnimatePresence>
            {paySheet && (
              <>
                <motion.div
                  key="stay-pay-scrim"
                  className="absolute inset-0 z-[46] bg-[rgba(20,16,28,0.28)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setPaySheet(false)}
                />
                <motion.div
                  key="stay-pay-sheet"
                  role="dialog"
                  aria-label="Apple Pay"
                  className="absolute inset-x-0 bottom-0 z-[47] rounded-t-[28px] bg-[#fcfcfc] px-5 pt-3 shadow-[0_-24px_70px_-24px_rgba(20,16,28,0.45)]"
                  style={{ paddingBottom: 'calc(var(--safe-bottom) + 22px)' }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.42, ease: EASE }}
                >
                  <ApplePaySheet
                    total={stay.price}
                    merchant={provider.name}
                    onConfirm={confirmPay}
                    onClose={() => setPaySheet(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          viewport,
        )}
    </motion.div>
  )
}
