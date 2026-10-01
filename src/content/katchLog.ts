export type LogLevel = 'info' | 'warn' | 'error' | 'ok' | 'auto'

export interface LogEntry {
  id: number
  at: number
  level: LogLevel
  scope: string
  message: string
}

type Listener = (entries: LogEntry[]) => void

const MAX = 200
const STORAGE_KEY = 'katchLogs'
const entries: LogEntry[] = []
const listeners = new Set<Listener>()
let seq = 0
let hydrated = false
let persistTimer: ReturnType<typeof setTimeout> | null = null

export function getLogEntries(): LogEntry[] {
  return entries.slice()
}

export function clearLogs(): void {
  entries.length = 0
  seq = 0
  notify()
  void chrome.storage.local.remove(STORAGE_KEY)
}

export function subscribeLogs(fn: Listener): () => void {
  listeners.add(fn)
  fn(getLogEntries())
  return () => listeners.delete(fn)
}

function notify(): void {
  const snap = getLogEntries()
  listeners.forEach((fn) => {
    try {
      fn(snap)
    } catch {
      /* ignore */
    }
  })
}

function schedulePersist(): void {
  if (persistTimer != null) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void chrome.storage.local.set({
      [STORAGE_KEY]: {
        seq,
        entries: entries.slice(-MAX),
        updatedAt: Date.now(),
      },
    })
  }, 180)
}

/** Load persisted logs (survives page reload / navigation). */
export async function hydrateLogs(): Promise<void> {
  if (hydrated) return
  hydrated = true
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const saved = result[STORAGE_KEY] as
      | { seq?: number; entries?: LogEntry[] }
      | undefined
    if (saved?.entries?.length) {
      entries.splice(0, entries.length, ...saved.entries.slice(-MAX))
      const maxId = entries.reduce((m, e) => Math.max(m, e.id), 0)
      seq = Math.max(seq, saved.seq ?? 0, maxId)
      notify()
    }
  } catch {
    /* ignore */
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return
      const next = changes[STORAGE_KEY].newValue as
        | { seq?: number; entries?: LogEntry[] }
        | undefined
      if (!next?.entries) {
        if (changes[STORAGE_KEY].newValue === undefined) {
          entries.length = 0
          notify()
        }
        return
      }
      // Another frame wrote — adopt if longer / newer
      if (next.entries.length >= entries.length) {
        entries.splice(0, entries.length, ...next.entries.slice(-MAX))
        seq = Math.max(seq, next.seq ?? 0)
        notify()
      }
    })
  } catch {
    /* ignore */
  }
}

export function katchLog(
  scope: string,
  message: string,
  level: LogLevel = 'info',
): void {
  seq += 1
  entries.push({
    id: seq,
    at: Date.now(),
    level,
    scope,
    message,
  })
  if (entries.length > MAX) entries.splice(0, entries.length - MAX)
  notify()
  schedulePersist()
  try {
    const prefix = `[Katch!/${scope}]`
    if (level === 'error') console.error(prefix, message)
    else if (level === 'warn') console.warn(prefix, message)
    else console.log(prefix, message)
  } catch {
    /* ignore */
  }
}
