import type { CaughtIssue } from '../shared/types'
import { buildSelector } from '../shared/selectors'
import { katchLog } from './katchLog'

export interface LayoutFinding {
  selector: string
  kind: 'overflow' | 'zeroHit' | 'overlay' | 'offscreen'
  message: string
}

const KATCH_UI =
  '#katch-floating-badge, #katch-badge-menu, #katch-toast, #katch-mock-chip, #katch-auto-chip, #katch-log-panel, #katch-teach-banner, #katch-run-summary, #katch-run-detail'

export function scanLayoutIssues(limit = 40): LayoutFinding[] {
  const findings: LayoutFinding[] = []
  const nodes = document.querySelectorAll('button, a[href], input, textarea, select, [role="button"]')
  const vw = window.innerWidth
  const vh = window.innerHeight

  nodes.forEach((node) => {
    if (findings.length >= limit) return
    if (!(node instanceof HTMLElement)) return
    if (node.closest(KATCH_UI)) return

    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return

    const rect = node.getBoundingClientRect()
    const selector = buildSelector(node)

    if (rect.width < 1 || rect.height < 1) {
      findings.push({
        selector,
        kind: 'zeroHit',
        message: `Zero-size interactive (${node.tagName.toLowerCase()})`,
      })
      return
    }

    if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
      // offscreen interactive — soft signal only if focusable and not aria-hidden
      if (node.tabIndex >= 0 || node.tagName === 'A' || node.tagName === 'BUTTON') {
        findings.push({
          selector,
          kind: 'offscreen',
          message: 'Interactive control is off-screen',
        })
      }
    }

    // Overflow: child wider than parent
    const parent = node.parentElement
    if (parent) {
      const pr = parent.getBoundingClientRect()
      if (pr.width > 0 && rect.width > pr.width + 8 && style.overflow !== 'hidden') {
        findings.push({
          selector,
          kind: 'overflow',
          message: `Possible overflow · child ${Math.round(rect.width)}px > parent ${Math.round(pr.width)}px`,
        })
      }
    }

    // Overlay blocking: center point hits something else on top
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    if (cx > 0 && cy > 0 && cx < vw && cy < vh) {
      const top = document.elementFromPoint(cx, cy)
      if (
        top &&
        top !== node &&
        !node.contains(top) &&
        !top.contains(node) &&
        !top.closest(KATCH_UI)
      ) {
        const zSelf = Number(style.zIndex) || 0
        const zTop = Number(getComputedStyle(top).zIndex) || 0
        if (zTop >= zSelf && getComputedStyle(top).pointerEvents !== 'none') {
          findings.push({
            selector,
            kind: 'overlay',
            message: `Click may be blocked by ${top.tagName.toLowerCase()}${top.id ? `#${top.id}` : ''}`,
          })
        }
      }
    }
  })

  katchLog('layout', `Scan done · ${findings.length} finding(s)`, findings.length ? 'warn' : 'ok')
  return findings
}

export function layoutFindingsToIssues(findings: LayoutFinding[]): CaughtIssue[] {
  return findings.slice(0, 20).map((f, i) => ({
    id: `layout-${Date.now()}-${i}`,
    timestamp: Date.now(),
    url: location.href,
    kind: 'layout' as const,
    message: f.message,
    details: `kind=${f.kind}`,
    selector: f.selector,
    userAgent: navigator.userAgent,
  }))
}
