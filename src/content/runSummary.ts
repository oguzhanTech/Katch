import type { AssertionResult, CaughtIssue, HarLiteEntry } from '../shared/types'
import { buildCombinedReport, buildMarkdownReport } from '../shared/reportBuilder'
import { assertionScore } from '../shared/assertions'
import { getStorage } from '../shared/storage'
import { katchLog } from './katchLog'

export interface RunSummaryData {
  title: string
  subtitle: string
  mode: 'fill' | 'run'
  completed: number
  planned: number
  fields?: number
  submitted?: boolean
  aborted?: boolean
  issues: CaughtIssue[]
  startedAt: number
  assertions?: AssertionResult[]
  har?: HarLiteEntry[]
}

let panelEl: HTMLDivElement | null = null
let detailEl: HTMLDivElement | null = null

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function kindLabel(kind: CaughtIssue['kind']): string {
  switch (kind) {
    case 'js':
      return 'JS'
    case 'console':
      return 'Console'
    case 'network':
      return 'Network'
    case 'unhandled':
      return 'Promise'
    case 'a11y':
      return 'A11y'
    case 'layout':
      return 'Layout'
    default:
      return kind
  }
}

function formatTime(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds(),
  ).padStart(2, '0')}`
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      document.documentElement.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      return true
    } catch {
      return false
    }
  }
}

function closeDetail(): void {
  detailEl?.remove()
  detailEl = null
}

function closePanel(): void {
  closeDetail()
  panelEl?.remove()
  panelEl = null
}

export function hideRunSummary(): void {
  closePanel()
}

function showIssueDetail(issue: CaughtIssue): void {
  closeDetail()
  detailEl = document.createElement('div')
  detailEl.id = 'katch-run-detail'

  const when = new Date(issue.timestamp).toLocaleString()
  const attrs = issue.fieldContext
    ? [
        issue.fieldContext.type && `type=${issue.fieldContext.type}`,
        issue.fieldContext.name && `name=${issue.fieldContext.name}`,
        issue.fieldContext.required ? 'required' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  detailEl.innerHTML = `
    <div class="katch-rd-head">
      <div>
        <div class="katch-rd-eyebrow">${escapeHtml(kindLabel(issue.kind))}${
          issue.statusCode != null ? ` · HTTP ${issue.statusCode}` : ''
        }</div>
        <div class="katch-rd-title">Issue detail</div>
      </div>
      <button type="button" class="katch-rd-close" aria-label="Close">×</button>
    </div>
    <div class="katch-rd-body">
      <div class="katch-rd-msg">${escapeHtml(issue.message)}</div>
      ${
        issue.details
          ? `<pre class="katch-rd-pre">${escapeHtml(truncate(issue.details, 2400))}</pre>`
          : ''
      }
      ${
        issue.domSnippet
          ? `<pre class="katch-rd-pre">${escapeHtml(truncate(issue.domSnippet, 1200))}</pre>`
          : ''
      }
      ${
        issue.screenshotDataUrl
          ? `<div class="katch-rd-shot-wrap">
              <img class="katch-rd-shot" src="${issue.screenshotDataUrl}" alt="Catch screenshot" data-act="open-shot" />
              <div class="katch-rd-shot-actions">
                <button type="button" class="katch-rd-btn ghost" data-act="copy-shot">Copy screenshot</button>
                <button type="button" class="katch-rd-btn ghost" data-act="save-shot">Save PNG</button>
              </div>
            </div>`
          : ''
      }
      <div class="katch-rd-meta">
        <div><span>When</span>${escapeHtml(when)}</div>
        <div><span>URL</span>${escapeHtml(truncate(issue.url, 90))}</div>
        <div><span>Selector</span><code>${escapeHtml(issue.selector ?? 'n/a')}</code></div>
        <div><span>Payload</span><code>${escapeHtml(truncate(issue.payload ?? 'n/a', 80))}</code></div>
        ${attrs ? `<div><span>Field</span>${escapeHtml(attrs)}</div>` : ''}
      </div>
    </div>
    <div class="katch-rd-foot">
      <button type="button" class="katch-rd-btn" data-act="copy">Copy report</button>
      <button type="button" class="katch-rd-btn ghost" data-act="back">Back to list</button>
    </div>
  `

  detailEl.querySelector('.katch-rd-close')?.addEventListener('click', () => closeDetail())
  detailEl.querySelector('[data-act="back"]')?.addEventListener('click', () => closeDetail())
  detailEl.querySelector('[data-act="copy"]')?.addEventListener('click', async () => {
    const storage = await getStorage()
    const report = buildCombinedReport(issue, null, storage.lastAutomation)
    const ok = await copyText(report)
    const btn = detailEl?.querySelector('[data-act="copy"]')
    if (btn) btn.textContent = ok ? 'Copied!' : 'Copy failed'
  })
  detailEl.querySelector('[data-act="copy-shot"]')?.addEventListener('click', async () => {
    const btn = detailEl?.querySelector('[data-act="copy-shot"]')
    if (!issue.screenshotDataUrl) return
    const { copyImageDataUrl } = await import('../shared/clipboardImage')
    const ok = await copyImageDataUrl(issue.screenshotDataUrl)
    if (btn) btn.textContent = ok ? 'Copied!' : 'Copy failed'
  })
  detailEl.querySelector('[data-act="save-shot"]')?.addEventListener('click', async () => {
    if (!issue.screenshotDataUrl) return
    const { downloadDataUrl } = await import('../shared/clipboardImage')
    const stamp = new Date(issue.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadDataUrl(issue.screenshotDataUrl, `katch-shot-${stamp}.png`)
    const btn = detailEl?.querySelector('[data-act="save-shot"]')
    if (btn) btn.textContent = 'Saved'
  })
  detailEl.querySelector('[data-act="open-shot"]')?.addEventListener('click', () => {
    if (!issue.screenshotDataUrl) return
    openShotLightbox(issue.screenshotDataUrl)
  })

  document.documentElement.appendChild(detailEl)
}

function openShotLightbox(dataUrl: string): void {
  const existing = document.getElementById('katch-shot-lightbox')
  existing?.remove()
  const box = document.createElement('div')
  box.id = 'katch-shot-lightbox'
  box.innerHTML = `
    <button type="button" class="katch-sl-close" aria-label="Close">×</button>
    <img src="${dataUrl}" alt="Catch screenshot" />
  `
  const close = () => box.remove()
  box.addEventListener('click', (e) => {
    if (e.target === box || (e.target as HTMLElement).classList.contains('katch-sl-close')) {
      close()
    }
  })
  document.documentElement.appendChild(box)
}

function buildSessionMarkdown(data: RunSummaryData): string {
  const lines = [
    `## Katch! Run Summary`,
    '',
    `**${data.title}**`,
    data.subtitle,
    '',
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Mode | ${data.mode} |`,
    `| Runs | ${data.completed}/${data.planned} |`,
    `| Issues | ${data.issues.length} |`,
    `| Aborted | ${data.aborted ? 'yes' : 'no'} |`,
    '',
  ]
  if (data.issues.length === 0) {
    lines.push('_No issues caught during this run._')
  } else {
    lines.push('### Issues', '')
    for (const [i, issue] of data.issues.entries()) {
      lines.push(
        `#### ${i + 1}. [${kindLabel(issue.kind)}] ${issue.message}`,
        '',
        buildMarkdownReport(issue),
        '',
        '---',
        '',
      )
    }
  }
  return lines.join('\n')
}

/**
 * Polished end-of-run summary with issue list + detail drill-down.
 */
export function showRunSummary(data: RunSummaryData): void {
  closePanel()
  katchLog(
    'summary',
    `Show run summary · ${data.issues.length} issue(s) · ${data.completed}/${data.planned}`,
    data.issues.length ? 'warn' : 'ok',
  )

  panelEl = document.createElement('div')
  panelEl.id = 'katch-run-summary'

  const clear = data.issues.length === 0
  const statusClass = clear ? 'clear' : 'hot'
  const statusText = clear
    ? 'Clear · no issues'
    : `${data.issues.length} issue${data.issues.length === 1 ? '' : 's'}`
  const score = data.assertions?.length
    ? assertionScore(data.assertions)
    : null

  const assertHtml = data.assertions?.length
    ? `<div class="katch-rs-section">
        <div class="katch-rs-section-title">Assertions · ${score?.passed}/${score?.total} (${score?.pct}%)</div>
        <ul class="katch-rs-list">${data.assertions
          .map(
            (a) => `<li class="katch-rs-item" style="cursor:default">
          <div class="katch-rs-item-top">
            <span class="katch-rs-kind" style="color:${a.passed ? '#6bcf8e' : '#e57373'}">${a.passed ? 'PASS' : 'FAIL'}</span>
          </div>
          <div class="katch-rs-item-msg">${escapeHtml(a.label)}${a.detail ? ` · ${escapeHtml(a.detail)}` : ''}</div>
        </li>`,
          )
          .join('')}</ul>
      </div>`
    : ''

  const harHtml = data.har?.length
    ? `<div class="katch-rs-section">
        <div class="katch-rs-section-title">Network · ${data.har.length} req</div>
        <ul class="katch-rs-list">${data.har
          .slice(-12)
          .reverse()
          .map(
            (h) => `<li class="katch-rs-item" style="cursor:default">
          <div class="katch-rs-item-top">
            <span class="katch-rs-kind">${h.status || 'ERR'} · ${h.method}</span>
            <span class="katch-rs-time">${h.durationMs}ms</span>
          </div>
          <div class="katch-rs-item-msg" style="font-family:monospace;font-size:10px">${escapeHtml(truncate(h.url, 70))}</div>
        </li>`,
          )
          .join('')}</ul>
      </div>`
    : ''

  const listHtml =
    data.issues.length === 0
      ? `<div class="katch-rs-empty">No catches this run. Forms looked stable under the payloads tried.</div>`
      : `<ul class="katch-rs-list">${data.issues
          .map(
            (issue, idx) => `
        <li class="katch-rs-item" data-idx="${idx}">
          <div class="katch-rs-item-top">
            <span class="katch-rs-kind">${escapeHtml(kindLabel(issue.kind))}${
              issue.statusCode != null ? ` ${issue.statusCode}` : ''
            }</span>
            <span class="katch-rs-time">${formatTime(issue.timestamp)}</span>
          </div>
          <div class="katch-rs-item-msg">${escapeHtml(truncate(issue.message, 110))}</div>
          <div class="katch-rs-item-hint">View details →</div>
        </li>`,
          )
          .join('')}</ul>`

  panelEl.innerHTML = `
    <div class="katch-rs-head">
      <div>
        <div class="katch-rs-brand">Katch<span>!</span></div>
        <div class="katch-rs-title">${escapeHtml(data.title)}</div>
        <div class="katch-rs-sub">${escapeHtml(data.subtitle)}</div>
      </div>
      <button type="button" class="katch-rs-close" aria-label="Close">×</button>
    </div>
    <div class="katch-rs-stats">
      <div class="katch-rs-stat">
        <span class="katch-rs-stat-val">${data.completed}<small>/${data.planned}</small></span>
        <span class="katch-rs-stat-lbl">Runs</span>
      </div>
      <div class="katch-rs-stat ${statusClass}">
        <span class="katch-rs-stat-val">${clear ? '0' : String(data.issues.length)}</span>
        <span class="katch-rs-stat-lbl">${escapeHtml(statusText)}</span>
      </div>
      <div class="katch-rs-stat">
        <span class="katch-rs-stat-val">${score ? `${score.pct}%` : data.aborted ? 'Stop' : data.submitted ? 'OK' : '—'}</span>
        <span class="katch-rs-stat-lbl">${score ? 'Assert' : data.aborted ? 'Aborted' : data.submitted ? 'Submitted' : 'Submit'}</span>
      </div>
    </div>
    ${assertHtml}
    <div class="katch-rs-section">
      <div class="katch-rs-section-title">Caught issues</div>
      ${listHtml}
    </div>
    ${harHtml}
    <div class="katch-rs-foot">
      <button type="button" class="katch-rs-btn primary" data-act="copy-all">Copy full report</button>
      <button type="button" class="katch-rs-btn" data-act="export">Export files</button>
      <button type="button" class="katch-rs-btn" data-act="dismiss">Done</button>
    </div>
  `

  panelEl.querySelector('.katch-rs-close')?.addEventListener('click', () => closePanel())
  panelEl.querySelector('[data-act="dismiss"]')?.addEventListener('click', () => closePanel())
  panelEl.querySelector('[data-act="copy-all"]')?.addEventListener('click', async () => {
    const ok = await copyText(buildSessionMarkdown(data))
    const btn = panelEl?.querySelector('[data-act="copy-all"]')
    if (btn) btn.textContent = ok ? 'Copied!' : 'Copy failed'
  })
  panelEl.querySelector('[data-act="export"]')?.addEventListener('click', async () => {
    const { exportIssuesPack } = await import('../shared/exportDownload')
    exportIssuesPack(data.issues, { title: data.title, startedAt: data.startedAt })
    const btn = panelEl?.querySelector('[data-act="export"]')
    if (btn) btn.textContent = 'Exported'
  })

  panelEl.querySelectorAll('.katch-rs-item').forEach((node) => {
    node.addEventListener('click', () => {
      const idx = Number((node as HTMLElement).dataset.idx)
      const issue = data.issues[idx]
      if (issue) showIssueDetail(issue)
    })
  })

  document.documentElement.appendChild(panelEl)
}
