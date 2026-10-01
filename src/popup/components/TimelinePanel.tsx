import { useState } from 'react'
import type { TimelineSession } from '../../shared/types'

export function TimelinePanel({
  timelines,
  onReplay,
  onNewTimeline,
}: {
  timelines: TimelineSession[]
  onReplay: (sessionId: string) => void
  onNewTimeline: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(timelines[0]?.id ?? null)

  if (timelines.length === 0) {
    return (
      <div className="border border-dashed border-katch-border px-3 py-6 text-center text-[12px] text-katch-muted">
        No sessions yet. Inject a payload to start recording.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="katch-label">{timelines.length} sessions</span>
        <button type="button" className="katch-btn-ghost !py-1 text-[11px]" onClick={onNewTimeline}>
          New session
        </button>
      </div>
      <ul className="divide-y divide-katch-border rounded-katch border border-katch-border">
        {timelines.map((session) => {
          const open = openId === session.id
          return (
            <li key={session.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/[0.03]"
                onClick={() => setOpenId(open ? null : session.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-katch-text">
                    {session.title ?? 'Session'}
                  </div>
                  <div className="font-mono text-[10px] text-katch-muted">
                    {session.events.length} events ·{' '}
                    {new Date(session.startedAt).toLocaleString()}
                  </div>
                </div>
                <span className="text-katch-muted text-[10px]">{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="border-t border-katch-border bg-katch-bg/50 px-3 py-2">
                  <ul className="mb-2 max-h-36 space-y-1 overflow-y-auto">
                    {session.events.map((ev) => (
                      <li key={ev.id} className="font-mono text-[10px] text-katch-muted leading-snug">
                        {ev.kind === 'inject' && (
                          <>inject {ev.fieldRole ?? ''} → {preview(ev.payload)}</>
                        )}
                        {ev.kind === 'click' && (
                          <>click {ev.label ?? ev.selector}</>
                        )}
                        {ev.kind === 'stressFill' && <>stressFill ×{ev.count}</>}
                        {ev.kind === 'catch' && <>catch {ev.statusCode ?? ''} {preview(ev.message)}</>}
                        {ev.kind === 'navigate' && <>nav {preview(ev.url, 48)}</>}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="katch-btn-primary w-full !py-1.5 text-[11px]"
                    onClick={() => onReplay(session.id)}
                  >
                    Replay
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function preview(s: string, n = 36): string {
  const v = s.replace(/\s+/g, ' ')
  return v.length > n ? `${v.slice(0, n)}…` : v
}
