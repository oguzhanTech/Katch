import type { AutomationDepth, KatchSettings } from '../../shared/types'

const DEPTH_OPTIONS: { id: AutomationDepth; label: string; hint: string }[] = [
  { id: 'one', label: '1', hint: 'One combo' },
  { id: 'half', label: '½', hint: 'Half of smart set' },
  { id: 'all', label: 'All', hint: 'Full smart set' },
]

export function SettingsPanel({
  settings,
  onChange,
  onDepthChange,
}: {
  settings: KatchSettings
  onChange: (patch: Partial<KatchSettings>) => void
  onDepthChange: (d: AutomationDepth) => void
}) {
  const depth = settings.automationDepth ?? 'half'
  return (
    <div className="divide-y divide-katch-border">
      <ToggleRow
        title="Floating badge"
        description="K badge next to focused inputs"
        checked={settings.floatingBadgeEnabled}
        onChange={(v) => onChange({ floatingBadgeEnabled: v })}
      />
      <ToggleRow
        title="Issue toast"
        description="Issue Caught toast with copy report"
        checked={settings.toastEnabled}
        onChange={(v) => onChange({ toastEnabled: v })}
      />
      <ToggleRow
        title="Run summary"
        description="End-of-run panel with all issues + details"
        checked={settings.runSummaryEnabled !== false}
        onChange={(v) => onChange({ runSummaryEnabled: v })}
      />
      <ToggleRow
        title="Screenshot on catch"
        description="Capture viewport PNG with each issue"
        checked={settings.screenshotOnCatch !== false}
        onChange={(v) => onChange({ screenshotOnCatch: v })}
      />
      <ToggleRow
        title="Console noise filter"
        description="Ignore ResizeObserver / extension noise"
        checked={settings.consoleNoiseFilter !== false}
        onChange={(v) => onChange({ consoleNoiseFilter: v })}
      />
      <ToggleRow
        title="Assertion lite"
        description="Score auto-run: 5xx, console, completion"
        checked={settings.assertionLiteEnabled !== false}
        onChange={(v) => onChange({ assertionLiteEnabled: v })}
      />
      <ToggleRow
        title="HAR-lite"
        description="Capture fetch log during auto-run"
        checked={settings.harLiteEnabled !== false}
        onChange={(v) => onChange({ harLiteEnabled: v })}
      />
      <ToggleRow
        title="Dev log panel"
        description="On-page log window (Auto-run steps)"
        checked={settings.devLogPanelEnabled}
        onChange={(v) => onChange({ devLogPanelEnabled: v })}
      />

      <div className="py-3">
        <div className="text-sm font-medium text-katch-text">Attribution window</div>
        <div className="mb-2 text-[12px] text-katch-muted">
          How long JS/console catches link to your last action
        </div>
        <div className="flex gap-1.5">
          {[10_000, 20_000, 45_000].map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => onChange({ attributionWindowMs: ms })}
              className={`rounded-katch border px-2.5 py-1 font-mono text-xs ${
                (settings.attributionWindowMs ?? 20_000) === ms
                  ? 'border-katch-signal/40 bg-katch-signal/15 text-katch-signal'
                  : 'border-katch-border text-katch-muted'
              }`}
            >
              {ms / 1000}s
            </button>
          ))}
        </div>
      </div>

      <div className="py-3">
        <div className="text-sm font-medium text-katch-text">Auto-run depth</div>
        <div className="mb-2 text-[12px] text-katch-muted">
          How many smart payloads to try per field (also on Home)
        </div>
        <div className="flex gap-1.5">
          {DEPTH_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onDepthChange(o.id)}
              className={`rounded-katch border px-2.5 py-1 font-mono text-xs ${
                depth === o.id
                  ? 'border-katch-signal/40 bg-katch-signal/15 text-katch-signal'
                  : 'border-katch-border text-katch-muted'
              }`}
              title={o.hint}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 text-[12px] text-katch-muted leading-relaxed">
        Shortcut: <span className="font-mono text-katch-text">Ctrl/Cmd + Shift + K</span>
        <br />
        Auto-run clicks submit — use only on apps you may stress-test.
      </div>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left first:pt-0"
      onClick={() => onChange(!checked)}
    >
      <div>
        <div className="text-sm font-medium text-katch-text">{title}</div>
        <div className="text-[12px] text-katch-muted">{description}</div>
      </div>
      <span
        role="switch"
        aria-checked={checked}
        className={`relative h-5 w-9 shrink-0 rounded-full border ${
          checked
            ? 'border-katch-signal/50 bg-katch-signal/30'
            : 'border-katch-border bg-katch-bg'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full ${
            checked ? 'left-[16px] bg-katch-signal' : 'left-0.5 bg-katch-muted'
          }`}
        />
      </span>
    </button>
  )
}
