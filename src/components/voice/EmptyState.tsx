/**
 * First-run empty state: the animated liquid logo cluster (app logos on
 * gooey ink blobs that periodically absorb, re-bud, and rotate through the
 * connectable-app pool), welcome copy, and a connect-apps CTA. Rendered in
 * the conversation space while the session is idle.
 */
import { LogoGoo } from './LogoGoo'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center">
      <LogoGoo />

      {/* Copy */}
      <p className="mt-8 max-w-56 text-center text-[17px] leading-snug text-ink">
        Your apps, one voice.
        <br />
        Connect them to get started.
      </p>

      {/* CTA */}
      <button
        type="button"
        className="mt-6 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
      >
        Connect apps
      </button>
    </div>
  )
}
