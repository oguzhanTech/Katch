import type { CaughtIssue } from '../shared/types'
import { buildSelector } from '../shared/selectors'
import { katchLog } from './katchLog'

export interface A11yFinding {
  selector: string
  rule: string
  message: string
}

const KATCH_UI =
  '#katch-floating-badge, #katch-badge-menu, #katch-toast, #katch-mock-chip, #katch-auto-chip, #katch-log-panel, #katch-teach-banner, #katch-run-summary, #katch-run-detail'

function hasLabel(el: HTMLElement): boolean {
  if (el.getAttribute('aria-label')) return true
  if (el.getAttribute('aria-labelledby')) return true
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.labels && el.labels.length > 0) return true
    if (el.placeholder) return true
    if (el.title) return true
  }
  if (el instanceof HTMLButtonElement && (el.textContent || '').trim()) return true
  if (el.tagName === 'A' && (el.textContent || '').trim()) return true
  return false
}

export function scanA11yIssues(limit = 40): A11yFinding[] {
  const findings: A11yFinding[] = []

  const push = (el: HTMLElement, rule: string, message: string) => {
    if (findings.length >= limit) return
    if (el.closest(KATCH_UI)) return
    findings.push({ selector: buildSelector(el), rule, message })
  }

  document.querySelectorAll('img').forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return
    if (!img.alt && img.getAttribute('role') !== 'presentation') {
      push(img, 'img-alt', 'Image missing alt text')
    }
  })

  document
    .querySelectorAll('input:not([type=hidden]), textarea, select, button, [role="button"]')
    .forEach((node) => {
      if (!(node instanceof HTMLElement)) return
      if (!hasLabel(node)) {
        push(node, 'label', `Control missing accessible name (${node.tagName.toLowerCase()})`)
      }
    })

  document.querySelectorAll('a[href]').forEach((a) => {
    if (!(a instanceof HTMLAnchorElement)) return
    const text = (a.textContent || '').trim()
    if (!text && !a.getAttribute('aria-label')) {
      push(a, 'link-name', 'Link has no accessible name')
    }
  })

  // Empty buttons
  document.querySelectorAll('button').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return
    if (!(btn.textContent || '').trim() && !btn.getAttribute('aria-label') && !btn.querySelector('img[alt], svg')) {
      push(btn, 'button-name', 'Button has no accessible name')
    }
  })

  // Positive tabindex spam
  let positiveTab = 0
  document.querySelectorAll('[tabindex]').forEach((el) => {
    const t = Number(el.getAttribute('tabindex'))
    if (t > 0) positiveTab++
  })
  if (positiveTab > 3) {
    findings.push({
      selector: 'html',
      rule: 'tabindex',
      message: `${positiveTab} elements use positive tabindex (focus order risk)`,
    })
  }

  katchLog('a11y', `Scan done · ${findings.length} finding(s)`, findings.length ? 'warn' : 'ok')
  return findings
}

export function a11yFindingsToIssues(findings: A11yFinding[]): CaughtIssue[] {
  return findings.slice(0, 25).map((f, i) => ({
    id: `a11y-${Date.now()}-${i}`,
    timestamp: Date.now(),
    url: location.href,
    kind: 'a11y' as const,
    message: f.message,
    details: `rule=${f.rule}`,
    selector: f.selector,
    userAgent: navigator.userAgent,
  }))
}
