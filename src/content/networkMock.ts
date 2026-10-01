import type { MockSettings } from '../shared/types'
import { DEFAULT_MOCK } from '../shared/storage'

let chipEl: HTMLDivElement | null = null
let hookInjected = false
let currentMock: MockSettings = { ...DEFAULT_MOCK }
let lastMockNotifyAt = 0

export function initNetworkMock(initial: MockSettings): void {
  currentMock = initial
  ensureHook()
  applyMock(initial)

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.mock) return
    applyMock({ ...DEFAULT_MOCK, ...(changes.mock.newValue as MockSettings) })
  })
}

export function applyMock(mock: MockSettings): void {
  currentMock = mock
  ensureHook()
  postConfig(mock)
  updateChip(mock)
}

/** Returns true if a toast should be shown (throttled). */
export function shouldNotifyMock(): boolean {
  const now = Date.now()
  if (now - lastMockNotifyAt < 2500) return false
  lastMockNotifyAt = now
  return true
}

function postConfig(mock: MockSettings): void {
  window.postMessage(
    {
      source: 'katch-extension',
      type: 'KATCH_MOCK_CFG',
      payload: mock,
    },
    '*',
  )
}

function ensureHook(): void {
  if (hookInjected) return
  hookInjected = true
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('src/injected/networkHook.ts')
  script.async = false
  script.onload = () => {
    script.remove()
    postConfig(currentMock)
  }
  ;(document.documentElement || document.head).appendChild(script)
}

function updateChip(mock: MockSettings): void {
  if (!mock.enabled) {
    chipEl?.remove()
    chipEl = null
    return
  }

  if (!chipEl) {
    chipEl = document.createElement('div')
    chipEl.id = 'katch-mock-chip'
    const close = document.createElement('button')
    close.type = 'button'
    close.textContent = '×'
    close.title = 'Disable mock'
    close.addEventListener('click', () => {
      void chrome.storage.local.set({
        mock: { ...currentMock, enabled: false },
      })
    })
    chipEl.appendChild(document.createElement('span'))
    chipEl.appendChild(close)
    document.documentElement.appendChild(chipEl)
  }

  const label = chipEl.querySelector('span')
  if (label) {
    const lat =
      mock.latencyMs >= 1000
        ? `${mock.latencyMs / 1000}s`
        : `${mock.latencyMs}ms`
    label.textContent = `MOCK ${mock.statusCode} · ${lat}`
  }
}
