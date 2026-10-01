import { clearLogs, hydrateLogs, subscribeLogs, type LogEntry } from './katchLog'

let panelEl: HTMLDivElement | null = null
let listEl: HTMLDivElement | null = null
let visible = false
let unsub: (() => void) | null = null

function levelColor(level: LogEntry['level']): string {
  switch (level) {
    case 'error':
      return '#e57373'
    case 'warn':
      return '#e5a23a'
    case 'ok':
      return '#6bcf8e'
    case 'auto':
      return '#7eb6ff'
    default:
      return '#8b929a'
  }
}

function formatTime(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds(),
  ).padStart(2, '0')}`
}

function render(entries: LogEntry[]): void {
  if (!listEl) return
  listEl.innerHTML = ''
  const slice = entries.slice(-120)
  for (const e of slice) {
    const row = document.createElement('div')
    row.className = 'katch-log-row'
    row.innerHTML = `<span class="katch-log-time">${formatTime(e.at)}</span><span class="katch-log-level" style="color:${levelColor(
      e.level,
    )}">${e.level}</span><span class="katch-log-scope">${escapeHtml(
      e.scope,
    )}</span><span class="katch-log-msg">${escapeHtml(e.message)}</span>`
    listEl.appendChild(row)
  }
  listEl.scrollTop = listEl.scrollHeight
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ensurePanel(): HTMLDivElement {
  if (panelEl) return panelEl

  panelEl = document.createElement('div')
  panelEl.id = 'katch-log-panel'

  const header = document.createElement('div')
  header.className = 'katch-log-header'
  header.innerHTML = `<span>Katch! logs</span>`

  const actions = document.createElement('div')
  actions.className = 'katch-log-actions'

  const clearBtn = document.createElement('button')
  clearBtn.type = 'button'
  clearBtn.textContent = 'Clear'
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    clearLogs()
  })

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.textContent = '×'
  closeBtn.title = 'Hide log panel'
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    setLogPanelVisible(false)
  })

  actions.append(clearBtn, closeBtn)
  header.appendChild(actions)

  listEl = document.createElement('div')
  listEl.className = 'katch-log-list'

  panelEl.append(header, listEl)
  document.documentElement.appendChild(panelEl)
  return panelEl
}

export function setLogPanelVisible(show: boolean): void {
  visible = show
  const el = ensurePanel()
  if (show) {
    el.setAttribute('data-open', '1')
    if (!unsub) unsub = subscribeLogs(render)
    else {
      unsub()
      unsub = subscribeLogs(render)
    }
  } else {
    el.removeAttribute('data-open')
  }
}

export function isLogPanelVisible(): boolean {
  return visible
}

export function initLogPanel(enabled: boolean): void {
  void hydrateLogs().then(() => {
    setLogPanelVisible(enabled)
  })
}
