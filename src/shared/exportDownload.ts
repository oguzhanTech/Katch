import type { CaughtIssue, KatchStorage, TimelineSession } from './types'
import { buildCombinedReport, buildMarkdownReport } from './reportBuilder'

/** Trigger a file download in popup / extension pages. */
export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportIssueMarkdown(
  issue: CaughtIssue,
  timeline?: TimelineSession | null,
  automation?: KatchStorage['lastAutomation'],
): void {
  const stamp = new Date(issue.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadTextFile(
    `katch-issue-${stamp}.md`,
    buildCombinedReport(issue, timeline, automation),
    'text/markdown',
  )
}

export function exportIssueJson(issue: CaughtIssue): void {
  const stamp = new Date(issue.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadTextFile(
    `katch-issue-${stamp}.json`,
    JSON.stringify(issue, null, 2),
    'application/json',
  )
}

export function exportIssuesPack(
  issues: CaughtIssue[],
  meta?: { title?: string; startedAt?: number },
): void {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const md = [
    `# Katch! Export`,
    meta?.title ? `**${meta.title}**` : '',
    `Issues: ${issues.length}`,
    '',
    ...issues.map((i, n) => `## ${n + 1}. ${i.kind}\n\n${buildMarkdownReport(i)}\n`),
  ]
    .filter(Boolean)
    .join('\n')

  downloadTextFile(`katch-pack-${stamp}.md`, md, 'text/markdown')
  downloadTextFile(
    `katch-pack-${stamp}.json`,
    JSON.stringify({ exportedAt: Date.now(), meta, issues }, null, 2),
    'application/json',
  )
}
