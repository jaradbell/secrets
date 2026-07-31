/**
 * 4C — Receipt objects, in conversation. The receipt becomes part of the
 * assistant's own turn: plain-language confirmation prose, a playful fan of
 * photos from the actual booking (the stay, the menu), and a compact
 * provider pill as the handle into the full receipt. Photo-forward and
 * expressive — the transaction reads as a memory being made, not a form
 * that was filled.
 */
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { ConversationHeader } from './ConversationHeader'

/* ── Photo fan ────────────────────────────────────────────────────────── */

const ROTATIONS = [-5, 3, -3, 6]

function PhotoFan({ photos, more }: { photos: string[]; more: number }) {
  return (
    <div className="flex items-center py-2 pl-1.5">
      {photos.map((src, i) => (
        <motion.div
          key={src}
          initial={{ opacity: 0, y: 18, rotate: 0, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, rotate: ROTATIONS[i % ROTATIONS.length], scale: 1 }}
          transition={{
            delay: 0.2 + i * 0.09,
            type: 'spring',
            stiffness: 300,
            damping: 22,
          }}
          className={i > 0 ? '-ml-8' : ''}
          style={{ zIndex: i }}
        >
          <div
            className="h-[132px] w-[102px] overflow-hidden rounded-[22px] border-[3px] border-white bg-white"
            style={{
              boxShadow: '0 14px 30px -12px rgba(20,16,26,0.4)',
              // Squircle-adjacent smoothing on the photo tiles.
              cornerShape: 'squircle',
            } as React.CSSProperties}
          >
            <img src={src} alt="" draggable={false} className="size-full object-cover" />
          </div>
        </motion.div>
      ))}

      {/* Overflow card — frosted peek at the rest of the gallery. */}
      <motion.div
        initial={{ opacity: 0, y: 18, rotate: 0, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, rotate: ROTATIONS[photos.length % ROTATIONS.length], scale: 1 }}
        transition={{
          delay: 0.2 + photos.length * 0.09,
          type: 'spring',
          stiffness: 300,
          damping: 22,
        }}
        className="-ml-8"
        style={{ zIndex: photos.length }}
      >
        <div
          className="relative h-[132px] w-[102px] overflow-hidden rounded-[22px] border-[3px] border-white bg-white"
          style={{ boxShadow: '0 14px 30px -12px rgba(20,16,26,0.4)' }}
        >
          <img
            src={photos[photos.length - 1]}
            alt=""
            draggable={false}
            className="size-full scale-125 object-cover"
            style={{ filter: 'blur(12px)' }}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-white/35 text-[16px] font-semibold text-ink">
            +{more}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Provider pill — the handle into the full receipt ─────────────────── */

function ProviderPill({ icon, label }: { icon: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.55, type: 'spring', stiffness: 320, damping: 24 }}
      className="flex w-max items-center rounded-full bg-white p-1.5 shadow-[0_10px_24px_-12px_rgba(20,16,26,0.35)]"
    >
      <span className="flex size-8 items-center justify-center overflow-hidden rounded-full">
        <img src={icon} alt="" draggable={false} className="size-8 object-cover" />
      </span>
      <button
        type="button"
        className="flex items-center gap-1.5 px-2.5 text-[13px] font-medium text-ink outline-none transition-transform duration-150 active:scale-[0.97]"
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9a9a9a"
          strokeWidth="2.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
      <span className="mx-1 h-4 w-px bg-black/10" />
      <button
        type="button"
        aria-label="More options"
        className="flex size-7 items-center justify-center rounded-full outline-none transition-colors duration-150 active:bg-black/[0.06]"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#4a4a4a" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
    </motion.div>
  )
}

/* ── Thread pieces ────────────────────────────────────────────────────── */

function UserTurn({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[13px] leading-snug text-white">
        {children}
      </div>
    </div>
  )
}

export function ReceiptGalleryConversation() {
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setViewport(document.getElementById('app-viewport'))
  }, [])

  return (
    <div
      className="relative z-10 flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 pt-[84px] pb-16"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Stay — pill leads, photos are the receipt's body. */}
      <UserTurn>Find us a place to stay in Healdsburg</UserTurn>
      <div className="-mt-3 flex flex-col gap-2.5">
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">Selected stay:</span> Home in Healdsburg, Friday May
          15th &ndash; Sun, May 17th.
        </p>
        <ProviderPill icon="/providers/expedia.png" label="View booking" />
        <PhotoFan
          photos={[
            '/receipts/photos/hotel-pool.jpg',
            '/receipts/photos/hotel-room.jpg',
            '/receipts/photos/hotel-deck.jpg',
          ]}
          more={10}
        />
      </div>

      {/* Dinner — photos lead (the menu is the payoff), pill trails. */}
      <UserTurn>Book us a birthday dinner for Saturday</UserTurn>
      <div className="-mt-3 flex flex-col gap-2.5">
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold">Reservation set:</span> Valette, Saturday at 7:30 PM
          for 2 &mdash; here&rsquo;s what&rsquo;s coming out of that kitchen.
        </p>
        <PhotoFan
          photos={[
            '/receipts/photos/menu-plate.jpg',
            '/receipts/photos/menu-spread.jpg',
            '/receipts/photos/menu-bowl.jpg',
            '/places/valette.jpg',
          ]}
          more={12}
        />
        <ProviderPill icon="/providers/opentable.svg" label="View reservation" />
      </div>

      {viewport &&
        createPortal(<ConversationHeader title="Sisters Birthday Weekend" />, viewport)}
    </div>
  )
}
