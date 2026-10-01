import type { CaughtIssue, TimelineSession } from '../shared/types'
import { buildCombinedReport } from '../shared/reportBuilder'
import { getStorage } from '../shared/storage'

let toastEl: HTMLDivElement | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let lastIssue: CaughtIssue | null = null
let lastTimeline: TimelineSession | null = null
let copyMode: 'issue' | 'none' = 'none'

export function hideIssueToast(): void {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = null
  toastEl?.remove()
  toastEl = null
  copyMode = 'none'
}

function ensureToast(): HTMLDivElement {
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.id = 'katch-toast'
    toastEl.addEventListener('click', async () => {
      if (copyMode !== 'issue' || !lastIssue) return
      const storage = await getStorage()
      const report = buildCombinedReport(
        lastIssue,
        lastTimeline,
        storage.lastAutomation,
      )
      try {
        await navigator.clipboard.writeText(report)
        const action = toastEl?.querySelector('.katch-toast-action')
        if (action) action.textContent = 'Copied to clipboard!'
      } catch {
        const ta = document.createElement('textarea')
        ta.value = report
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
    })
    document.documentElement.appendChild(toastEl)
  }
  return toastEl
}

function scheduleHide(ms = 10000): void {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    toastEl?.remove()
    toastEl = null
    copyMode = 'none'
  }, ms)
}

/** Generic bottom-right status panel (autorun summary, etc.). */
export function showStatusToast(
  title: string,
  body: string,
  actionHint?: string,
): void {
  copyMode = 'none'
  const el = ensureToast()
  el.innerHTML = `
    <div class="katch-toast-title">${escapeHtml(title)}</div>
    <div class="katch-toast-body">${escapeHtml(body)}</div>
    ${actionHint ? `<div class="katch-toast-action">${escapeHtml(actionHint)}</div>` : ''}
  `
  scheduleHide(10000)
}

export function showIssueToast(
  issue: CaughtIssue,
  enabled = true,
  timeline?: TimelineSession | null,
): void {
  if (!enabled) return
  lastIssue = issue
  lastTimeline = timeline ?? null
  copyMode = 'issue'

  const el = ensureToast()
  el.innerHTML = `
    <div class="katch-toast-title">Issue Caught!</div>
    <div class="katch-toast-body">${escapeHtml(truncate(issue.message, 120))}</div>
    <div class="katch-toast-action">Click to Copy Report</div>
  `
  scheduleHide(12000)
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
