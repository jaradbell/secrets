/**
 * 8C's transaction-completed state — the sports answer to
 * FlightBookingReceipt. The dock pill blooms out and this dark surface
 * fades in during the dissolve's tail; then the black basketball carries
 * the moment (a Spline-authored asset, choreographed in code): the ball
 * drops in and bounces, spins up, and the make IS the confirmation — a
 * hop, a gold ring shockwave, the check drawing in, confetti, the clubs'
 * colors blooming on the wall. Only then do the receipt rows develop
 * beneath — the matchup, venue / order number, the payment line, Done.
 *
 * Every beat is a delay off GAME_T (celebrations/gameTimeline.ts).
 */
import { motion } from 'framer-motion'
import { BallCelebration } from './celebrations/BallCelebration'
import { GAME_EASE as EASE, GAME_T as T } from './celebrations/gameTimeline'
import { gameBooking, venueFor } from './gameBookingStore'
import type { ReservationSlots } from './reservationFlow'
import { ALL_GAMES, teamInfo } from './sportsData'

/** Rows develop once the make has landed. */
const develop = (i: number) => ({
  initial: { opacity: 0, filter: 'blur(14px)', y: 12 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { delay: T.textIn + i * 0.09, duration: 0.55, ease: EASE },
  },
  exit: { opacity: 0, filter: 'blur(10px)', transition: { duration: 0.12 } },
})

export function GameTicketReceipt({
  place,
  onDone,
}: {
  /** The flow's place slot carries the fixture id (see TicketDetailsView). */
  place: string
  slots: ReservationSlots
  onDone: () => void
}) {
  // The store carries the purchase; the id in `place` is the fallback key.
  const game = gameBooking.game ?? ALL_GAMES.find((g) => g.id === place) ?? ALL_GAMES[0]
  const [home, away] = game.teams
  const venue = venueFor(game)
  const quantity = gameBooking.quantity
  const total = gameBooking.total
  const seller = gameBooking.provider
  /** Both clubs' real palettes — what floods the wall once the check lands. */
  const glow = [...teamInfo(home.name).colors, ...teamInfo(away.name).colors]

  return (
    <motion.div
      className="absolute inset-0 z-50 overflow-hidden"
      style={{
        background:
          'radial-gradient(130% 110% at 30% 8%, #262130 0%, #17141b 55%, #0e0c11 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: T.surfaceDelay, duration: T.surface, ease: 'easeOut' },
      }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
    >
      <div className="flex h-full flex-col items-center justify-center px-10 text-center">
        <BallCelebration glowColors={glow} />

        <motion.p {...develop(0)} className="mt-7 text-[22px] font-medium leading-7 text-white">
          You&rsquo;re going
        </motion.p>

        <motion.div {...develop(1)} className="mt-2.5">
          <p className="text-[15px] leading-snug text-white/85">
            {home.name} vs {away.name}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-white/55">
            {game.day} &middot; Tipoff {game.time} &middot;{' '}
            {quantity === 1 ? '1 ticket' : `${quantity} tickets`}
          </p>
        </motion.div>

        <motion.div
          {...develop(2)}
          className="mt-7 flex w-full max-w-[264px] flex-col rounded-[18px] border border-white/10 bg-white/[0.05]"
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white">
                <img
                  src={home.logo}
                  alt=""
                  draggable={false}
                  className="size-4.5 object-contain"
                />
              </span>
              <span className="max-w-[150px] truncate text-[13px] font-medium text-white/85">
                {venue.arena}
              </span>
            </span>
            <span className="text-[12px] tracking-[0.06em] text-white/45">
              #{seller?.orderPrefix ?? 'TKT'}-8214
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3.5">
            <span className="text-[13px] text-white/60">
              Apple Pay{seller ? ` \u00B7 ${seller.name}` : ''}
            </span>
            <span className="text-[13px] font-semibold text-white/85">${total}</span>
          </div>
        </motion.div>

        <motion.button
          {...develop(3)}
          type="button"
          onClick={onDone}
          className="mt-8 flex h-12 w-full max-w-[264px] items-center justify-center rounded-full bg-white text-[14px] font-medium text-ink outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
        >
          Done
        </motion.button>
      </div>
    </motion.div>
  )
}
