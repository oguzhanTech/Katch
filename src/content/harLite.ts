import type { HarLiteEntry } from '../shared/types'
import { setLastHarLite } from '../shared/storage'
import { katchLog } from './katchLog'

let active = false
let entries: HarLiteEntry[] = []
let origFetch: typeof fetch | null = null

export function startHarLiteCapture(): void {
  if (active) return
  active = true
  entries = []
  origFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = performance.now()
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
    let url = ''
    try {
      url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url
    } catch {
      url = String(input)
    }

    try {
      const res = await origFetch!(input, init)
      if (active) {
        entries.push({
          at: Date.now(),
          method,
          url: url.slice(0, 500),
          status: res.status,
          durationMs: Math.round(performance.now() - started),
        })
      }
      return res
    } catch (err) {
      if (active) {
        entries.push({
          at: Date.now(),
          method,
          url: url.slice(0, 500),
          status: 0,
          durationMs: Math.round(performance.now() - started),
        })
      }
      throw err
    }
  }

  katchLog('har', 'HAR-lite capture started', 'auto')
}

export async function stopHarLiteCapture(): Promise<HarLiteEntry[]> {
  if (!active) return entries.slice()
  active = false
  if (origFetch) {
    window.fetch = origFetch
    origFetch = null
  }
  const snap = entries.slice(-200)
  await setLastHarLite(snap)
  katchLog('har', `HAR-lite stopped · ${snap.length} entries`, 'ok')
  return snap
}

export function getHarLiteBuffer(): HarLiteEntry[] {
  return entries.slice()
}
