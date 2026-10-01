import { buildSelector } from '../shared/selectors'
import { katchLog } from './katchLog'

const KATCH_UI =
  '#katch-floating-badge, #katch-badge-menu, #katch-toast, #katch-mock-chip, #katch-auto-chip, #katch-log-panel, #katch-teach-banner, #katch-run-summary, #katch-run-detail'

/**
 * Ask the user to click the real submit control once.
 * Returns selector + label, or null if cancelled / timed out.
 */
export function teachSubmitClick(options?: {
  timeoutMs?: number
  message?: string
  shouldAbort?: () => boolean
}): Promise<{ selector: string; label: string; el: HTMLElement } | null> {
  const timeoutMs = options?.timeoutMs ?? 45_000
  const message =
    options?.message ??
    "Couldn't click submit — click the real submit / continue button once"

  return new Promise((resolve) => {
    let done = false
    let banner: HTMLDivElement | null = null
    let pollAbort = 0
    let timer = 0

    const cleanup = () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey, true)
      window.clearTimeout(timer)
      window.clearInterval(pollAbort)
      banner?.remove()
      banner = null
    }

    const finish = (
      result: { selector: string; label: string; el: HTMLElement } | null,
    ) => {
      if (done) return
      done = true
      cleanup()
      resolve(result)
    }

    banner = document.createElement('div')
    banner.id = 'katch-teach-banner'
    banner.innerHTML = `
      <div class="katch-teach-title">Katch! · Teach submit</div>
      <div class="katch-teach-body">${escapeHtml(message)}</div>
      <div class="katch-teach-hint">Click the page button · Esc = cancel</div>
      <button type="button" class="katch-teach-skip">Skip</button>
    `
    banner.querySelector('.katch-teach-skip')?.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      katchLog('teach', 'User skipped teach-submit', 'warn')
      finish(null)
    })
    document.documentElement.appendChild(banner)

    katchLog('teach', 'Waiting for user to click submit…', 'warn')

    const onClick = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (t.closest(KATCH_UI)) return

      const hit =
        (t.closest(
          'button, a[href], [role="button"], input[type="submit"], input[type="button"], [class*="button" i], [class*="btn" i], [id*="button" i], [id*="btn" i]',
        ) as HTMLElement | null) ?? (t instanceof HTMLElement ? t : null)

      if (!hit) return

      // Let the page receive the click; we only learn the target.
      const selector = buildSelector(hit)
      const label = (
        hit.getAttribute('aria-label') ||
        hit.getAttribute('value') ||
        hit.textContent ||
        hit.tagName
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 48)

      katchLog('teach', `Learned submit: ${label || selector}`, 'ok')
      // Defer finish so the native click still completes
      window.setTimeout(() => {
        finish({ selector, label: label || 'submit', el: hit })
      }, 0)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        katchLog('teach', 'Teach-submit cancelled', 'warn')
        finish(null)
      }
    }

    pollAbort = window.setInterval(() => {
      if (options?.shouldAbort?.()) {
        katchLog('teach', 'Teach-submit aborted', 'warn')
        finish(null)
      }
    }, 200)

    timer = window.setTimeout(() => {
      katchLog('teach', 'Teach-submit timed out', 'warn')
      finish(null)
    }, timeoutMs)

    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey, true)
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
