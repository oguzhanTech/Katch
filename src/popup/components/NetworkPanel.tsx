import type { MockSettings } from '../../shared/types'

const STATUS_PRESETS = [403, 500, 502] as const
const LATENCY_PRESETS = [0, 500, 2000, 5000] as const

export function NetworkPanel({
  mock,
  onChange,
}: {
  mock: MockSettings
  onChange: (next: MockSettings) => void
}) {
  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-katch-text">Enable mock</div>
          <div className="text-[12px] text-katch-muted">
            Intercept page fetch / XHR responses
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={mock.enabled}
          onClick={() => onChange({ ...mock, enabled: !mock.enabled })}
          className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
            mock.enabled
              ? 'border-katch-signal/50 bg-katch-signal/30'
              : 'border-katch-border bg-katch-bg'
          }`}
        >
          <span
            className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
              mock.enabled
                ? 'left-[16px] bg-katch-signal'
                : 'left-0.5 bg-katch-muted'
            }`}
          />
        </button>
      </label>

      <div>
        <p className="katch-label mb-2">Status code</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_PRESETS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onChange({ ...mock, statusCode: code })}
              className={`rounded-katch border px-2.5 py-1 font-mono text-xs ${
                mock.statusCode === code
                  ? 'border-katch-signal/40 bg-katch-signal/15 text-katch-signal'
                  : 'border-katch-border text-katch-muted'
              }`}
            >
              {code}
            </button>
          ))}
          <input
            type="number"
            className="katch-input !w-20 !py-1 font-mono text-xs"
            value={mock.statusCode}
            min={100}
            max={599}
            onChange={(e) =>
              onChange({
                ...mock,
                statusCode: Number(e.target.value) || 500,
              })
            }
          />
        </div>
      </div>

      <div>
        <p className="katch-label mb-2">Latency</p>
        <div className="flex flex-wrap gap-1.5">
          {LATENCY_PRESETS.map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => onChange({ ...mock, latencyMs: ms })}
              className={`rounded-katch border px-2.5 py-1 font-mono text-xs ${
                mock.latencyMs === ms
                  ? 'border-katch-signal/40 bg-katch-signal/15 text-katch-signal'
                  : 'border-katch-border text-katch-muted'
              }`}
            >
              {ms === 0 ? '0ms' : ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="katch-label mb-2">URL contains</p>
        <input
          className="katch-input font-mono text-xs"
          placeholder="* = all requests"
          value={mock.urlMatch}
          onChange={(e) => onChange({ ...mock, urlMatch: e.target.value })}
        />
        <p className="mt-1.5 text-[11px] text-katch-muted leading-relaxed">
          Use <span className="font-mono text-katch-text">*</span> for all, or a substring like{' '}
          <span className="font-mono text-katch-text">/api/</span>.
        </p>
      </div>

      <div className="border-t border-katch-border pt-3 text-[12px] text-katch-muted leading-relaxed">
        Page-level mock only (fetch / XHR). WebSocket and beacon are not covered.
      </div>
    </div>
  )
}
