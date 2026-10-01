import type { CaughtIssue, Scenario, TimelineSession, KatchStorage } from './types'
import { downloadTextFile } from './exportDownload'

/** Local share pack — JSON bundle teammates can import (no cloud). */
export interface SharePack {
  version: 1
  exportedAt: number
  label: string
  issues?: CaughtIssue[]
  scenarios?: Scenario[]
  timelines?: TimelineSession[]
  lastAutomation?: KatchStorage['lastAutomation']
}

export function buildSharePack(opts: {
  label: string
  issues?: CaughtIssue[]
  scenarios?: Scenario[]
  timelines?: TimelineSession[]
  lastAutomation?: KatchStorage['lastAutomation']
}): SharePack {
  return {
    version: 1,
    exportedAt: Date.now(),
    label: opts.label,
    issues: opts.issues,
    scenarios: opts.scenarios,
    timelines: opts.timelines,
    lastAutomation: opts.lastAutomation,
  }
}

export function downloadSharePack(pack: SharePack): void {
  const stamp = new Date(pack.exportedAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadTextFile(
    `katch-share-${stamp}.json`,
    JSON.stringify(pack, null, 2),
    'application/json',
  )
}

export function parseSharePack(raw: string): SharePack | null {
  try {
    const data = JSON.parse(raw) as SharePack
    if (data.version !== 1) return null
    return data
  } catch {
    return null
  }
}
