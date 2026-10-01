import { pickSmartValue } from '../shared/payloads'
import { appendTimelineEvent, setLastAction } from '../shared/storage'
import { buildSelector } from '../shared/selectors'
import { discoverFormMap } from './formMap'
import { injectValue, isEditableTarget, type EditableTarget } from './injectValue'
import { markUserAction } from './clickRecorder'
import { showStatusToast } from './toast'
import { katchLog } from './katchLog'
import { sendToBackground } from '../shared/messaging'

const MAX_REQUESTS = 60
const BATCH = 5
const RATE_STATUSES = new Set([429, 420, 503])
const BODY_HINT =
  /rate\s*limit|too many requests|throttl|slow down|retry later|quota exceeded/i

let running = false
let abortRequested = false
let chipEl: HTMLDivElement | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function showChip(text: string): void {
  if (!chipEl) {
    chipEl = document.createElement('div')
    chipEl.id = 'katch-auto-chip'
    document.documentElement.appendChild(chipEl)
  }
  chipEl.innerHTML = ''
  const span = document.createElement('span')
  span.textContent = text
  chipEl.appendChild(span)
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = 'Stop'
  btn.addEventListener('click', () => {
    abortRequested = true
  })
  chipEl.appendChild(btn)
}

function hideChip(): void {
  chipEl?.remove()
  chipEl = null
}

function resolveForm(el: EditableTarget): HTMLFormElement | null {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    if (el.form) return el.form
  }
  return el.closest('form')
}

function looksRateLimited(status: number, body: string, headers: Headers): boolean {
  if (status === 429 || status === 420) return true
  if (status === 503 && (headers.has('retry-after') || BODY_HINT.test(body))) return true
  if (RATE_STATUSES.has(status) && BODY_HINT.test(body)) return true
  if (BODY_HINT.test(body) && status >= 400) return true
  const remaining = headers.get('x-ratelimit-remaining') ?? headers.get('ratelimit-remaining')
  if (remaining === '0' && status >= 400) return true
  return false
}

async function fireOnce(
  url: string,
  method: string,
  body: BodyInit | null,
  contentType: string | null,
): Promise<{ status: number; limited: boolean; url: string }> {
  try {
    const headers: Record<string, string> = {
      Accept: '*/*',
      'X-Katch-RateLimit': '1',
    }
    if (contentType && !(body instanceof FormData)) {
      headers['Content-Type'] = contentType
    }
    const res = await fetch(url, {
      method,
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
      credentials: 'include',
      redirect: 'manual',
      cache: 'no-store',
      headers,
    })
    let text = ''
    try {
      text = await res.clone().text()
    } catch {
      /* ignore */
    }
    return {
      status: res.status,
      limited: looksRateLimited(res.status, text.slice(0, 2000), res.headers),
      url,
    }
  } catch (err) {
    katchLog('rate', `Request error: ${String(err)}`, 'warn')
    return { status: 0, limited: false, url }
  }
}

function buildRequest(form: HTMLFormElement | null): {
  url: string
  method: string
  body: BodyInit | null
  contentType: string | null
} {
  if (form) {
    const method = (form.getAttribute('method') || form.method || 'POST').toUpperCase()
    const action = form.getAttribute('action') || form.action || location.href
    let url: string
    try {
      url = new URL(action, location.href).href
    } catch {
      url = location.href
    }
    if (method === 'GET') {
          // FormData iteration
          const q = new URLSearchParams()
          new FormData(form).forEach((v, k) => {
            if (typeof v === 'string') q.append(k, v)
          })
          const u = new URL(url)
          q.forEach((v, k) => u.searchParams.append(k, v))
          return { url: u.href, method: 'GET', body: null, contentType: null }
    }
    return {
      url,
      method,
      body: new FormData(form),
      contentType: null,
    }
  }

  // No form — hammer current URL as POST with field guess
  return {
    url: location.href,
    method: 'POST',
    body: null,
    contentType: 'application/x-www-form-urlencoded',
  }
}

export function isRateLimitTestRunning(): boolean {
  return running
}

/**
 * Flood the form endpoint. PASS if a rate-limit response appears.
 */
export async function runRateLimitTest(primary: EditableTarget): Promise<{
  passed: boolean
  sent: number
  status?: number
  aborted: boolean
}> {
  if (running) {
    abortRequested = true
    return { passed: false, sent: 0, aborted: true }
  }

  running = true
  abortRequested = false
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') abortRequested = true
  }
  document.addEventListener('keydown', onKey, true)

  let sent = 0
  let passed = false
  let hitStatus: number | undefined

  try {
    const map = discoverFormMap(primary)
    const form = resolveForm(primary)
    katchLog(
      'rate',
      `Start rate-limit test · form=${Boolean(form)} · submit=${map.submitLabel ?? 'n/a'}`,
      'auto',
    )

    // Seed fields once so POSTs look like real attempts
    if (isEditableTarget(primary)) {
      const value = pickSmartValue(primary)
      injectValue(primary, value)
      markUserAction()
      await setLastAction({
        payload: value,
        selector: buildSelector(primary),
        fieldContext: undefined,
      })
      void sendToBackground({ type: 'TRACK_ACTION' })
    }

    // Fill companions lightly
    for (const f of map.fields.slice(0, 6)) {
      try {
        const el = document.querySelector(f.selector)
        if (el && isEditableTarget(el) && el !== primary) {
          injectValue(el, pickSmartValue(el))
        }
      } catch {
        /* ignore */
      }
    }

    const req = buildRequest(form)
    showChip(`RATE 0/${MAX_REQUESTS}`)
    katchLog('rate', `Target ${req.method} ${req.url.slice(0, 120)}`, 'auto')

    outer: while (sent < MAX_REQUESTS && !abortRequested && !passed) {
      const batchSize = Math.min(BATCH, MAX_REQUESTS - sent)
      showChip(`RATE ${sent + batchSize}/${MAX_REQUESTS} · flooding…`)

      // Fresh FormData each batch so tokens/state stay current
      const batchReq = buildRequest(form)
      const tasks = Array.from({ length: batchSize }, () =>
        fireOnce(batchReq.url, batchReq.method, batchReq.body, batchReq.contentType),
      )
      const results = await Promise.all(tasks)
      sent += results.length
      markUserAction()

      for (const r of results) {
        if (r.limited) {
          passed = true
          hitStatus = r.status
          katchLog('rate', `Hit rate limit · HTTP ${r.status}`, 'ok')
          break outer
        }
      }

      // tiny yield so UI/Stop stays responsive
      await sleep(20)
    }

    await appendTimelineEvent(location.href, {
      kind: 'stressFill',
      count: sent,
    })

    if (passed) {
      showStatusToast(
        'Rate limit PASS',
        `Limited after ${sent} request${sent === 1 ? '' : 's'} · HTTP ${hitStatus}`,
        'Protection looks active',
      )
    } else if (abortRequested) {
      showStatusToast('Rate limit stopped', `Sent ${sent} · no limit hit yet`)
      katchLog('rate', `Aborted after ${sent}`, 'warn')
    } else {
      showStatusToast(
        'Rate limit FAIL',
        `No limit after ${sent} requests · endpoint may be unprotected`,
      )
      katchLog('rate', `No rate limit after ${sent} requests`, 'warn')
    }

    return { passed, sent, status: hitStatus, aborted: abortRequested }
  } finally {
    document.removeEventListener('keydown', onKey, true)
    hideChip()
    running = false
    abortRequested = false
  }
}
