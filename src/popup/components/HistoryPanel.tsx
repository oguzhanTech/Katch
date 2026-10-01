import { useState } from 'react'
import { Copy, Download, Image as ImageIcon, Trash2, X } from 'lucide-react'
import type { CaughtIssue, TimelineSession } from '../../shared/types'
import { buildCombinedReport } from '../../shared/reportBuilder'
import { getStorage } from '../../shared/storage'
import {
  exportIssueJson,
  exportIssueMarkdown,
  exportIssuesPack,
} from '../../shared/exportDownload'
import { buildSharePack, downloadSharePack } from '../../shared/sharePack'
import { copyImageDataUrl, downloadDataUrl } from '../../shared/clipboardImage'

export function HistoryPanel({
  history,
  timelines,
  onClear,
  onFlash,
}: {
  history: CaughtIssue[]
  timelines: TimelineSession[]
  onClear: () => void
  onFlash?: (msg: string) => void
}) {
  const [preview, setPreview] = useState<CaughtIssue | null>(null)

  const copy = async (issue: CaughtIssue) => {
    const timeline = timelines.find((t) => t.id === issue.timelineSessionId) ?? null
    const storage = await getStorage()
    const report = buildCombinedReport(issue, timeline, storage.lastAutomation)
    await navigator.clipboard.writeText(report)
    onFlash?.('Copied')
  }

  const copyShot = async (issue: CaughtIssue) => {
    if (!issue.screenshotDataUrl) {
      onFlash?.('No screenshot')
      return
    }
    const ok = await copyImageDataUrl(issue.screenshotDataUrl)
    onFlash?.(ok ? 'Screenshot copied' : 'Copy failed')
  }

  const saveShot = (issue: CaughtIssue) => {
    if (!issue.screenshotDataUrl) return
    const stamp = new Date(issue.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadDataUrl(issue.screenshotDataUrl, `katch-shot-${stamp}.png`)
    onFlash?.('Screenshot saved')
  }

  const exportOne = async (issue: CaughtIssue) => {
    const timeline = timelines.find((t) => t.id === issue.timelineSessionId) ?? null
    const storage = await getStorage()
    exportIssueMarkdown(issue, timeline, storage.lastAutomation)
    exportIssueJson(issue)
    onFlash?.('Exported MD + JSON')
  }

  const exportAll = () => {
    exportIssuesPack(history, { title: 'Katch catches' })
    onFlash?.('Pack exported')
  }

  const sharePack = async () => {
    const storage = await getStorage()
    downloadSharePack(
      buildSharePack({
        label: 'Katch catches',
        issues: history,
        timelines,
        scenarios: storage.scenarios,
        lastAutomation: storage.lastAutomation,
      }),
    )
    onFlash?.('Share pack downloaded')
  }

  if (history.length === 0) {
    return (
      <div className="border border-dashed border-katch-border px-4 py-8 text-center text-[13px] text-katch-muted">
        No issues caught yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="katch-label">{history.length} recent</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="katch-btn-ghost !py-1 text-[11px]"
            onClick={exportAll}
          >
            <Download size={12} />
            Export
          </button>
          <button
            type="button"
            className="katch-btn-ghost !py-1 text-[11px]"
            onClick={() => void sharePack()}
          >
            Share pack
          </button>
          <button type="button" className="katch-btn-ghost !py-1 text-[11px]" onClick={onClear}>
            <Trash2 size={12} />
            Clear
          </button>
        </div>
      </div>
      <ul className="divide-y divide-katch-border rounded-katch border border-katch-border">
        {history.map((issue) => (
          <li key={issue.id} className="px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-katch-signal">
                {issue.kind}
                {issue.statusCode ? ` ${issue.statusCode}` : ''}
              </span>
              <div className="flex gap-0.5">
                {issue.screenshotDataUrl && (
                  <button
                    type="button"
                    className="katch-btn-ghost !p-1"
                    title="Copy screenshot"
                    onClick={() => void copyShot(issue)}
                  >
                    <ImageIcon size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="katch-btn-ghost !p-1"
                  title="Export files"
                  onClick={() => void exportOne(issue)}
                >
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  className="katch-btn-ghost !p-1"
                  title="Copy report"
                  onClick={() => void copy(issue)}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <p className="line-clamp-2 text-[12px] text-katch-text leading-snug">{issue.message}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-katch-muted">
              {new Date(issue.timestamp).toLocaleString()}
            </p>
            {issue.screenshotDataUrl && (
              <button
                type="button"
                className="mt-2 block w-full overflow-hidden rounded border border-katch-border text-left hover:border-katch-signal/40"
                onClick={() => setPreview(issue)}
                title="View screenshot"
              >
                <img
                  src={issue.screenshotDataUrl}
                  alt="Catch screenshot"
                  className="max-h-28 w-full object-cover object-top"
                />
              </button>
            )}
          </li>
        ))}
      </ul>

      {preview?.screenshotDataUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/85 p-3"
          role="dialog"
          aria-label="Screenshot preview"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[10px] text-katch-signal">
              {preview.kind}
              {preview.statusCode ? ` ${preview.statusCode}` : ''}
            </span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="katch-btn-ghost !py-1 text-[11px]"
                onClick={() => void copyShot(preview)}
              >
                <Copy size={12} />
                Copy
              </button>
              <button
                type="button"
                className="katch-btn-ghost !py-1 text-[11px]"
                onClick={() => saveShot(preview)}
              >
                <Download size={12} />
                Save
              </button>
              <button
                type="button"
                className="katch-btn-ghost !p-1"
                aria-label="Close"
                onClick={() => setPreview(null)}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <button
            type="button"
            className="min-h-0 flex-1 overflow-auto"
            onClick={() => setPreview(null)}
          >
            <img
              src={preview.screenshotDataUrl}
              alt="Catch screenshot full"
              className="mx-auto max-h-full max-w-full rounded border border-katch-border object-contain"
            />
          </button>
        </div>
      )}
    </div>
  )
}
