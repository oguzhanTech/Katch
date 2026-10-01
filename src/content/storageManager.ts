import { katchLog } from './katchLog'

export interface StorageDump {
  local: Record<string, string>
  session: Record<string, string>
  cookie: string
}

export function dumpPageStorage(): StorageDump {
  const local: Record<string, string> = {}
  const session: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) local[k] = localStorage.getItem(k) ?? ''
    }
  } catch {
    /* ignore */
  }
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k) session[k] = sessionStorage.getItem(k) ?? ''
    }
  } catch {
    /* ignore */
  }
  katchLog(
    'storage',
    `Dump · local=${Object.keys(local).length} session=${Object.keys(session).length}`,
    'ok',
  )
  return { local, session, cookie: document.cookie || '' }
}

export function clearPageStorage(area: 'local' | 'session' | 'both' = 'both'): void {
  try {
    if (area === 'local' || area === 'both') localStorage.clear()
  } catch {
    /* ignore */
  }
  try {
    if (area === 'session' || area === 'both') sessionStorage.clear()
  } catch {
    /* ignore */
  }
  katchLog('storage', `Cleared ${area}`, 'warn')
}

export function setPageStorage(
  area: 'local' | 'session',
  key: string,
  value: string,
): boolean {
  try {
    const store = area === 'local' ? localStorage : sessionStorage
    store.setItem(key, value)
    return true
  } catch {
    return false
  }
}
