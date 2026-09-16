/**
 * The front door — the stay celebration's hero object (8D's answer to
 * FlightPorthole). A thick graphite frame with a beveled well (the same
 * family as the airplane window, so the celebrations read as one class),
 * and behind it the door itself: painted slab, recessed panels, a brass
 * knob and deadbolt, a peephole.
 *
 * Choreography (delays off STAY_T): the door develops in from a blur,
 * shut; the deadbolt turns — the booking's little mechanical yes — then
 * the door swings inward on a warm-lit room (lamplight, a glowing floor),
 * the light spilling past the jamb onto the wall. On arrival the doorway
 * dims — the room still faintly aglow beneath — and the check draws large
 * across it. As the tick completes, the marketplace's colors bloom on the
 * wall behind the frame.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { STAY_EASE as EASE, STAY_T as T, SWING_EASE } from './stayTimeline'

const DOOR_W = 212
const DOOR_H = 312
const FRAME = 13
const WELL = 8
const OPEN_INSET = FRAME + WELL

/** How dark the doorway goes for the check: the room stays faintly lit. */
const DIM = 0.62

/** The marketplace's colors leaking from behind the frame — the wall glow
    the WebGL BrandGlow paints for flights, here as soft blurred blooms. */
function WallGlow({
  colors,
  at,
  reduced,
}: {
  colors: string[]
  at: number
  reduced: boolean
}) {
  const spots = [
    { left: '-4%', top: '-2%', size: 170 },
    { right: '-8%', top: '32%', size: 190 },
    { left: '-2%', bottom: '-2%', size: 170 },
    { right: '-4%', bottom: '22%', size: 140 },
  ]
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-12"
      initial={{ opacity: reduced ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: at, duration: 0.9, ease: EASE }}
    >
      {spots.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            ...s,
            width: s.size,
            height: s.size,
            background: `radial-gradient(circle, ${colors[i % colors.length]} 0%, transparent 62%)`,
            filter: 'blur(36px)',
            opacity: 0.66,
          }}
          animate={
            reduced
              ? undefined
              : { x: [0, i % 2 ? 10 : -8, 0], y: [0, i % 2 ? -8 : 10, 0] }
          }
          transition={{ duration: 7 + i * 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </motion.div>
  )
}

/** The check, drawn large across the dimmed doorway. */
function BigCheck({ at }: { at: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.svg
        width="92"
        height="92"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.3))' }}
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: at, duration: 0.55, ease: EASE }}
      >
        <motion.path
          d="M5 12.5 10 17.5 19 7"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: at + 0.05, duration: 0.6, ease: EASE }}
        />
      </motion.svg>
    </div>
  )
}

export function StayDoor({
  glowColors,
}: {
  /** The marketplace's palette — what the wall glows once the check lands. */
  glowColors: string[]
}) {
  const reduced = useReducedMotion() ?? false
  // Reduced motion: the door is already open, so the doorway dims and the
  // check draws as soon as the frame has developed.
  const unlockAt = reduced ? T.doorIn : T.unlock
  const swingAt = reduced ? T.doorIn : T.swing
  const dimAt = reduced ? T.doorIn + 0.3 : T.dim
  const checkAt = reduced ? T.doorIn + 0.5 : T.checkIn
  const glowAt = reduced ? checkAt : T.dim + 0.35
  // Lamplight on the wall: in with the swing, easing down as the doorway
  // dims — handing the wall to the marketplace glow.
  const spillIn = swingAt + 0.2
  const spillSettle = dimAt + 0.3
  const spillSpan = spillSettle + 0.8 - spillIn

  return (
    <motion.div
      className="relative"
      style={{ width: DOOR_W, height: DOOR_H }}
      initial={{ opacity: 0, scale: 0.92, filter: 'blur(16px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ delay: T.doorIn, duration: T.doorInDur, ease: EASE }}
    >
      {/* The marketplace's colors behind the frame, once the check lands. */}
      <WallGlow colors={glowColors} at={glowAt} reduced={reduced} />

      {/* Lamplight spilling onto the wall once the door is open. */}
      <motion.div
        aria-hidden="true"
        className="absolute -inset-16 rounded-[40%]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(255,178,96,0.55) 0%, rgba(255,178,96,0.22) 45%, rgba(255,178,96,0) 100%)',
          filter: 'blur(20px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.3] }}
        transition={{
          delay: spillIn,
          duration: spillSpan,
          times: [
            0,
            Math.min(1, 0.9 / spillSpan),
            (spillSettle - spillIn) / spillSpan,
            1,
          ],
          ease: ['easeOut', 'linear', 'easeInOut'],
        }}
      />

      {/* Outer frame — graphite, lit from the top-left (the porthole's). */}
      <div
        className="absolute inset-0 rounded-[26px]"
        style={{
          background: 'linear-gradient(155deg, #55505d 0%, #332f39 40%, #1f1c23 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.5), 0 30px 60px -24px rgba(0,0,0,0.75)',
        }}
      />
      {/* Bevel well — the jamb turning in toward the doorway. */}
      <div
        className="absolute rounded-[17px]"
        style={{
          inset: FRAME,
          background: 'linear-gradient(155deg, #15131a 0%, #2a2730 55%, #433e4a 100%)',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.6)',
        }}
      />

      {/* The doorway — the room behind, the door swinging within. */}
      <div
        className="absolute overflow-hidden rounded-[12px]"
        style={{ inset: OPEN_INSET, perspective: 640 }}
      >
        {/* The room: warm dark, a lamp's bloom, light pooling on the floor. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #16100b 0%, #2a1a10 48%, #45291a 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 72% 30%, rgba(255,206,130,0.95) 0%, rgba(255,178,96,0.5) 16%, rgba(255,150,70,0.16) 38%, rgba(255,150,70,0) 62%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[30%]"
          style={{
            background:
              'linear-gradient(to top, rgba(255,170,90,0.34), rgba(255,170,90,0))',
          }}
        />
        {/* Floor line — where the wall meets the boards. */}
        <div className="absolute inset-x-0 bottom-[27%] h-px bg-black/35" />

        {/* The door itself — painted slab, hinged on the left. */}
        <motion.div
          className="absolute inset-0"
          style={{
            transformOrigin: 'left center',
            background:
              'linear-gradient(160deg, #575160 0%, #3a3543 50%, #272231 100%)',
            boxShadow:
              'inset -3px 0 4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
          initial={{ rotateY: reduced ? -84 : 0, filter: 'brightness(1)' }}
          animate={{ rotateY: -84, filter: 'brightness(0.5)' }}
          transition={{ delay: swingAt, duration: reduced ? 0 : T.swingDur, ease: SWING_EASE }}
        >
          {/* Recessed panels. */}
          <div
            className="absolute top-[10%] right-[16%] left-[16%] h-[34%] rounded-[8px]"
            style={{
              background: 'linear-gradient(160deg, #332e3c 0%, #423c4b 100%)',
              boxShadow:
                'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.07)',
            }}
          />
          <div
            className="absolute right-[16%] bottom-[9%] left-[16%] h-[30%] rounded-[8px]"
            style={{
              background: 'linear-gradient(160deg, #332e3c 0%, #423c4b 100%)',
              boxShadow:
                'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.07)',
            }}
          />
          {/* Peephole. */}
          <div
            className="absolute top-[6.5%] left-1/2 size-[7px] -translate-x-1/2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #8f8b97, #1c1a21)',
              boxShadow: '0 1px 1px rgba(255,255,255,0.12)',
            }}
          />
          {/* Knob — brass, catching the lamplight. */}
          <div
            className="absolute top-1/2 right-[9%] size-[17px] -translate-y-1/2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 34% 30%, #f2dda6 0%, #cfa95c 45%, #8a6a2c 100%)',
              boxShadow:
                '0 1px 2px rgba(0,0,0,0.55), inset 0 -1px 1px rgba(0,0,0,0.35)',
            }}
          />
          {/* Deadbolt — the brass quarter-turn above the knob. */}
          <div className="absolute top-[calc(50%-34px)] right-[calc(9%-2px)] flex size-[21px] items-center justify-center rounded-full"
            style={{
              background: 'radial-gradient(circle at 40% 35%, #4c4655, #262130)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            <motion.span
              className="block h-[13px] w-[5px] rounded-full"
              style={{
                background: 'linear-gradient(180deg, #ecd49c, #a3803c)',
                boxShadow: '0 1px 1px rgba(0,0,0,0.4)',
              }}
              initial={{ rotate: 0 }}
              animate={{ rotate: 90 }}
              transition={{
                delay: unlockAt,
                duration: reduced ? 0 : 0.35,
                ease: [0.6, 0, 0.3, 1.4],
              }}
            />
          </div>
        </motion.div>

        {/* On arrival the doorway dims for the check. */}
        <motion.div
          className="absolute inset-0 bg-black"
          initial={{ opacity: reduced ? DIM : 0 }}
          animate={{ opacity: DIM }}
          transition={{ delay: dimAt, duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
        />

        <BigCheck at={checkAt} />

        {/* Doorway depth on the opening, matching the glass's treatment. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[12px]"
          style={{
            boxShadow:
              'inset 0 18px 34px -12px rgba(0,0,0,0.55), inset 0 -10px 24px -10px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        />
      </div>
    </motion.div>
  )
}
