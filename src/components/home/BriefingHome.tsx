/**
 * 5E's resting screen — the assistant speaks first. Top-down hierarchy:
 * the brand atom (the empty state's goo, bare ink, no logos), a greeting
 * headline in the assistant's voice, then the math already done — each
 * upcoming thing counted down to, with a receipt stub linking out to its
 * artifact — and finally a quiet list of open projects. Every row is a
 * doorway into its thread.
 */
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { DiningTicket, FlightTicket } from '../transaction/ReceiptGalleryTicket'

const EASE = [0.32, 0.72, 0, 1] as const
const INK = '#141118'

/* ── The atom — LogoGoo's liquid grammar, bare and small ──────────────── */

/** Design-space canvas for the mini goo — LogoGoo's traced geometry at
    exactly one third scale, so the mark keeps the cluster's proportions. */
const ATOM_W = 44
const ATOM_H = 45
const ATOM_HOME = {
  A: { x: 21.5, y: 13.5, r: 13.3 }, // big
  B: { x: 33.5, y: 34, r: 9.6 }, // companion — absorbed and re-budded
  C: { x: 9.5, y: 34, r: 9.6 }, // isolated disc — the other dot
}
const ATOM_CYCLE = 5200

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const seg = (t: number, a: number, b: number) =>
  t <= a ? 0 : t >= b ? 1 : easeInOut((t - a) / (b - a))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function setCircle(el: HTMLElement, x: number, y: number, r: number) {
  el.style.left = `${x - r}px`
  el.style.top = `${y - r}px`
  el.style.width = `${r * 2}px`
  el.style.height = `${r * 2}px`
}

/** The mark: the cluster in bare ink — the companion sinks into the big
    blob and buds back out through the goo, while the isolated disc keeps
    its own quiet pulse on the offbeat, forever. */
function BriefAtom() {
  const bA = useRef<HTMLSpanElement>(null)
  const bB = useRef<HTMLSpanElement>(null)
  const bC = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const cA = bA.current
    const cB = bB.current
    const cC = bC.current
    if (!cA || !cB || !cC) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCircle(cA, ATOM_HOME.A.x, ATOM_HOME.A.y, ATOM_HOME.A.r)
      setCircle(cB, ATOM_HOME.B.x, ATOM_HOME.B.y, ATOM_HOME.B.r)
      setCircle(cC, ATOM_HOME.C.x, ATOM_HOME.C.y, ATOM_HOME.C.r)
      return
    }

    let raf = 0
    const t0 = performance.now()
    const frame = (now: number) => {
      const t = ((now - t0) % ATOM_CYCLE) / ATOM_CYCLE
      const { A, B, C } = ATOM_HOME

      const aGrow = seg(t, 0.2, 0.36) - seg(t, 0.52, 0.7)
      setCircle(cA, A.x, A.y, A.r + 2.5 * aGrow + 0.6 * Math.sin(t * Math.PI * 4))

      const sink = seg(t, 0.2, 0.38)
      const bud = seg(t, 0.52, 0.72)
      if (t < 0.38) {
        setCircle(cB, lerp(B.x, A.x + 3, sink), lerp(B.y, A.y + 4, sink), lerp(B.r, 1.5, sink))
      } else if (t < 0.52) {
        setCircle(cB, A.x + 3, A.y + 4, 1.5)
      } else {
        setCircle(cB, lerp(A.x + 3, B.x, bud), lerp(A.y + 4, B.y, bud), lerp(1.5, B.r, bud))
      }

      // The other dot — pulse-shrinks while the companion hides, the
      // same offbeat it swaps logos on in the empty state.
      const cPulse = seg(t, 0.36, 0.44) - seg(t, 0.46, 0.56)
      setCircle(cC, C.x, C.y, C.r - 2.6 * cPulse)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="relative" style={{ width: ATOM_W, height: ATOM_H }} aria-hidden="true">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="brief-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
            />
          </filter>
        </defs>
      </svg>
      <div className="absolute inset-0" style={{ filter: 'url(#brief-goo)' }}>
        <span ref={bA} className="absolute rounded-full" style={{ background: INK }} />
        <span ref={bB} className="absolute rounded-full" style={{ background: INK }} />
      </div>
      {/* The isolated disc — outside the goo layer so no neck forms. */}
      <span ref={bC} className="absolute rounded-full" style={{ background: INK }} />
    </div>
  )
}

/* ── The math — countdowns computed for the user ──────────────────────── */

/** Next occurrence of today at h:m (rolls to tomorrow once passed). */
function todayAt(h: number, m: number) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
  return d
}

/** The coming Saturday at h:m. */
function nextSaturdayAt(h: number, m: number) {
  const d = new Date()
  const delta = (6 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + delta)
  d.setHours(h, m, 0, 0)
  return d
}

/** "in 42 min" / "in 3 hrs" / "in 2 days" — the arithmetic, pre-done. */
function until(target: Date) {
  const min = Math.max(1, Math.round((target.getTime() - Date.now()) / 60000))
  if (min < 60) return `in ${min} min`
  const hrs = Math.round(min / 60)
  if (hrs < 24) return `in ${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`
  const days = Math.round(hrs / 24)
  return `in ${days} ${days === 1 ? 'day' : 'days'}`
}

/* ── Content ──────────────────────────────────────────────────────────── */

/** The ids double as receipt ids in the trip file's deck — an Up-next
    row is a doorway straight to its artifact in the cycler. */
const UP_NEXT = [
  {
    id: 'dining',
    title: 'Dinner at Valette',
    detail: '7:30 PM · Table for 2',
    provider: '/providers/opentable.svg',
    target: () => todayAt(19, 30),
    receipt: () => <DiningTicket index={-1} />,
  },
  {
    id: 'flight',
    title: 'Flight to Newark',
    detail: 'Sat · 6:10 AM · SFO → EWR',
    provider: '/providers/united.png',
    target: () => nextSaturdayAt(6, 10),
    receipt: () => <FlightTicket index={-1} />,
  },
]

const PROJECTS = [
  { id: 'sisters', title: 'Sisters Birthday Weekend', meta: 'Waiting on a hotel pick' },
  { id: 'kyoto', title: 'Kyoto in the fall', meta: 'Planning · 2 tasks open' },
]

/** One rise per element, top to bottom — the screen composes itself the
    way it would be spoken. */
function spoken(order: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.08 + order * 0.08, duration: 0.38, ease: EASE },
    },
  }
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11.5px] font-semibold tracking-[0.02em] text-ink-secondary uppercase">
      {children}
    </p>
  )
}

/** The object link — a thumbnail of the actual receipt artifact, shrunk
    to a stub. Tapping it is the doorway to the real thing. */
function ReceiptStub({ ticket }: { ticket: () => React.ReactNode }) {
  return (
    <span className="pointer-events-none block h-[46px] w-[34px] shrink-0 overflow-hidden rounded-[8px] shadow-[0_2px_8px_rgba(20,16,28,0.18)]">
      <span className="block w-[340px] origin-top-left scale-[0.1]">{ticket()}</span>
    </span>
  )
}

export function BriefingHome({
  onOpen,
  onOpenReceipt,
}: {
  /** Where the project doorways lead — the host drops into the named thread. */
  onOpen?: (title: string) => void
  /** Where the Up-next doorways lead — the host opens the receipts
      cycler focused on this artifact. */
  onOpenReceipt?: (id: string) => void
} = {}) {
  return (
    // 136px top: the chrome band above (trio pill / drawer handle)
    // bottoms out ~94px into the frame — the briefing needs clear air
    // under it, not a near-collision with the atom.
    <div className="flex h-full flex-col px-8 pt-[136px]">
      {/* The atom — the brand breathing where the eyebrow would sit. */}
      <motion.div {...spoken(0)}>
        <BriefAtom />
      </motion.div>

      {/* The greeting — assistant's voice, two tones like a spoken line
          that trails off into what it's about to say. */}
      <motion.h1
        {...spoken(1)}
        className="mt-5 text-[27px] leading-[1.22] font-semibold tracking-[-0.02em] text-ink"
      >
        {greeting()}, Jarad —
        <br />
        <span className="text-ink/35">here's what's ahead.</span>
      </motion.h1>

      {/* Up next — the math already done, each row linking out to its
          receipt artifact. */}
      <motion.div {...spoken(2)} className="mt-9">
        <SectionLabel>Up next</SectionLabel>
      </motion.div>
      <div className="mt-2 flex flex-col">
        {UP_NEXT.map((r, i) => (
          <motion.button
            key={r.id}
            {...spoken(3 + i)}
            type="button"
            onClick={() => onOpenReceipt?.(r.id)}
            className="-mx-3 flex items-center gap-3.5 rounded-[18px] px-3 py-3 text-left outline-none transition-colors duration-150 active:bg-white/50"
          >
            <ReceiptStub ticket={r.receipt} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-medium tracking-[-0.01em] text-ink">
                {r.title}
              </span>
              <span className="text-[12px] text-ink-secondary">{r.detail}</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold tracking-[-0.01em] text-ink">
              {until(r.target())}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Projects — smaller, quieter; the open loops. */}
      <motion.div {...spoken(5)} className="mt-7">
        <SectionLabel>Projects</SectionLabel>
      </motion.div>
      <div className="mt-1.5 flex flex-col">
        {PROJECTS.map((p, i) => (
          <motion.button
            key={p.id}
            {...spoken(6 + i)}
            type="button"
            onClick={() => onOpen?.(p.title)}
            className="-mx-3 flex items-baseline gap-2.5 rounded-[14px] px-3 py-2.5 text-left outline-none transition-colors duration-150 active:bg-white/50"
          >
            <span className="min-w-0 truncate text-[14px] tracking-[-0.01em] text-ink">
              {p.title}
            </span>
            <span className="shrink-0 text-[11.5px] text-ink-secondary">{p.meta}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
