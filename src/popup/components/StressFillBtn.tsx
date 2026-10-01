import { motion } from 'framer-motion'
import type { AutomationDepth } from '../../shared/types'

export function StressFillBtn({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="flex w-full flex-col items-start gap-2 rounded-katch border border-katch-signal/40 bg-katch-signal/10 px-4 py-3.5 text-left transition-colors hover:bg-katch-signal/15"
    >
      <span className="text-sm font-semibold text-katch-signal">Stress Fill All Inputs</span>
      <span className="text-[12px] leading-relaxed text-katch-muted">
        Populate every field on the page with smart edge-case data.
      </span>
    </motion.button>
  )
}

const DEPTH_OPTIONS: {
  id: AutomationDepth
  label: string
  hint: string
}[] = [
  { id: 'one', label: '1', hint: 'Single combo' },
  { id: 'half', label: '½', hint: 'Half of smart set' },
  { id: 'all', label: 'All', hint: 'Full smart set' },
]

export function PageAutoRunBtn({
  onClick,
  depth,
  onDepthChange,
}: {
  onClick: () => void
  depth: AutomationDepth
  onDepthChange: (d: AutomationDepth) => void
}) {
  const depthIndex = Math.max(
    0,
    DEPTH_OPTIONS.findIndex((o) => o.id === depth),
  )
  const active = DEPTH_OPTIONS[depthIndex] ?? DEPTH_OPTIONS[1]

  return (
    <div className="space-y-2 rounded-katch border border-katch-border px-4 py-3.5">
      <div>
        <div className="text-sm font-semibold text-katch-text">Auto-run all forms</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-katch-muted">
          Fill every form with combos and click submit / login.
        </div>
      </div>

      <div className="pt-1">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-katch-muted">Run depth</span>
          <span className="font-mono text-katch-signal">{active.hint}</span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={depthIndex}
          aria-label="Auto-run depth"
          onChange={(e) => {
            const next = DEPTH_OPTIONS[Number(e.target.value)]?.id ?? 'half'
            onDepthChange(next)
          }}
          className="katch-depth-slider w-full"
        />
        <div className="mt-1 flex justify-between px-0.5 font-mono text-[10px] text-katch-muted">
          {DEPTH_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onDepthChange(o.id)}
              className={
                depth === o.id ? 'text-katch-signal' : 'hover:text-katch-text'
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={onClick}
        className="mt-1 w-full rounded-katch border border-katch-signal/40 bg-katch-signal/10 px-3 py-2 text-left text-sm font-semibold text-katch-signal transition-colors hover:bg-katch-signal/15"
      >
        Start Auto-run
      </motion.button>
    </div>
  )
}

export function PageAutoFillBtn({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="flex w-full flex-col items-start gap-2 rounded-katch border border-katch-border px-4 py-3 text-left transition-colors hover:border-katch-signal/40 hover:bg-katch-surface"
    >
      <span className="text-sm font-semibold text-katch-text">Auto-fill all forms</span>
      <span className="text-[12px] leading-relaxed text-katch-muted">
        Fill every form with smart payloads — no submit.
      </span>
    </motion.button>
  )
}

export function RateLimitBtn({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="flex w-full flex-col items-start gap-2 rounded-katch border border-katch-border px-4 py-3 text-left transition-colors hover:border-katch-signal/40 hover:bg-katch-surface"
    >
      <span className="text-sm font-semibold text-katch-text">Rate limit test</span>
      <span className="text-[12px] leading-relaxed text-katch-muted">
        Flood the focused form endpoint — PASS if 429 / throttled.
      </span>
    </motion.button>
  )
}
