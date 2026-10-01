export function CoveragePanel({
  enabled,
  summary,
  onToggle,
  onRefresh,
}: {
  enabled: boolean
  summary: { total: number; tested: number; caught: number } | null
  onToggle: (enabled: boolean) => void
  onRefresh: () => void
}) {
  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-katch-text">Page overlay</div>
          <div className="text-[12px] text-katch-muted">
            Outline fields: untested / tested / caught
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
            enabled
              ? 'border-katch-signal/50 bg-katch-signal/30'
              : 'border-katch-border bg-katch-bg'
          }`}
        >
          <span
            className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
              enabled ? 'left-[16px] bg-katch-signal' : 'left-0.5 bg-katch-muted'
            }`}
          />
        </button>
      </label>

      <div className="rounded-katch border border-katch-border px-3 py-3">
        {summary ? (
          <p className="font-mono text-[12px] text-katch-text">
            {summary.total} fields · {summary.tested} tested · {summary.caught} caught
          </p>
        ) : (
          <p className="text-[12px] text-katch-muted">Open a page tab to see coverage.</p>
        )}
        <button
          type="button"
          className="katch-btn-ghost mt-2 !px-0 !py-1 text-[11px]"
          onClick={onRefresh}
        >
          Refresh summary
        </button>
      </div>

      <p className="text-[11px] text-katch-muted leading-relaxed">
        Muted = untested · Amber outline = injected · Amber fill = catch linked to field
      </p>
    </div>
  )
}
