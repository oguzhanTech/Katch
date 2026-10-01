import { buildSelector } from '../shared/selectors'
import { appendTimelineEvent } from '../shared/storage'

let recordingClicks = true
let lastUserActionAt = 0
const CLICK_RECORD_WINDOW_MS = 120_000

export function markUserAction(): void {
  lastUserActionAt = Date.now()
}

export function setClickRecording(enabled: boolean): void {
  recordingClicks = enabled
}

function isActionable(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (
    el.closest(
      '#katch-floating-badge, #katch-badge-menu, #katch-toast, #katch-mock-chip, #katch-auto-chip, #katch-log-panel, #katch-teach-banner, #katch-run-summary, #katch-run-detail',
    )
  ) {
    return false
  }
  const tag = el.tagName.toLowerCase()
  if (tag === 'button') return true
  if (tag === 'a' && el.hasAttribute('href')) return true
  if (tag === 'summary') return true
  if (el.getAttribute('role') === 'button') return true
  if (el instanceof HTMLInputElement) {
    const t = el.type.toLowerCase()
    return t === 'submit' || t === 'button' || t === 'reset' || t === 'image'
  }
  return false
}

function resolveActionable(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const hit = target.closest(
    'button, a[href], summary, [role="button"], input[type="submit"], input[type="button"], input[type="reset"], input[type="image"]',
  )
  if (!hit || !(hit instanceof HTMLElement)) return null
  if (!isActionable(hit) && hit.tagName.toLowerCase() !== 'a') return null
  if (
    hit.closest(
      '#katch-floating-badge, #katch-badge-menu, #katch-toast, #katch-mock-chip, #katch-auto-chip, #katch-log-panel, #katch-teach-banner, #katch-run-summary, #katch-run-detail',
    )
  ) {
    return null
  }
  return hit
}

function labelFor(el: HTMLElement): string {
  const text = (
    el.innerText ||
    el.getAttribute('aria-label') ||
    el.getAttribute('value') ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, 48) || el.tagName.toLowerCase()
}

export function initClickRecorder(): void {
  document.addEventListener(
    'click',
    (e) => {
      if (!recordingClicks) return
      if (lastUserActionAt === 0) return
      if (Date.now() - lastUserActionAt > CLICK_RECORD_WINDOW_MS) return

      const el = resolveActionable(e.target)
      if (!el) return

      const selector = buildSelector(el)
      void appendTimelineEvent(location.href, {
        kind: 'click',
        selector,
        label: labelFor(el),
        tagName: el.tagName.toLowerCase(),
      })
      lastUserActionAt = Date.now()
    },
    true,
  )
}

function pointerOpts(el: HTMLElement): PointerEventInit & MouseEventInit {
  const rect = el.getBoundingClientRect()
  const x = rect.left + Math.min(Math.max(rect.width / 2, 1), rect.width - 1 || 1)
  const y = rect.top + Math.min(Math.max(rect.height / 2, 1), rect.height - 1 || 1)
  return {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  }
}

export type ClickStrategy = 'full' | 'native' | 'pointer' | 'enter' | 'space' | 'formSubmit'

function tryFormSubmit(el: HTMLElement): void {
  if (el instanceof HTMLInputElement && el.type === 'submit' && el.form) {
    try {
      if (typeof el.form.requestSubmit === 'function') el.form.requestSubmit(el)
      else el.form.submit()
    } catch {
      /* ignore */
    }
    return
  }

  const form =
    (el instanceof HTMLButtonElement ? el.form : null) ??
    el.closest('form')
  if (form instanceof HTMLFormElement) {
    try {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit(
          el instanceof HTMLButtonElement && el.type === 'submit' ? el : undefined,
        )
      } else {
        form.submit()
      }
    } catch {
      /* ignore */
    }
  }
}

function firePointerSequence(el: HTMLElement, includeClick: boolean): void {
  const opts = pointerOpts(el)
  el.dispatchEvent(new PointerEvent('pointerover', opts))
  el.dispatchEvent(new MouseEvent('mouseover', opts))
  el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, bubbles: false }))
  el.dispatchEvent(new MouseEvent('mouseenter', { ...opts, bubbles: false }))
  el.dispatchEvent(new PointerEvent('pointermove', opts))
  el.dispatchEvent(new MouseEvent('mousemove', opts))
  el.dispatchEvent(new PointerEvent('pointerdown', opts))
  el.dispatchEvent(new MouseEvent('mousedown', opts))
  el.dispatchEvent(new PointerEvent('pointerup', opts))
  el.dispatchEvent(new MouseEvent('mouseup', opts))
  if (includeClick) {
    el.dispatchEvent(new PointerEvent('click', opts))
    el.dispatchEvent(new MouseEvent('click', opts))
  }
}

function fireKey(el: HTMLElement, key: string, code: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, code }),
  )
  el.dispatchEvent(
    new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key, code }),
  )
}

/** Click an already-resolved element with a chosen strategy. */
export function replayClickEl(
  el: HTMLElement,
  strategy: ClickStrategy = 'full',
): boolean {
  try {
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
  } catch {
    /* ignore */
  }
  el.focus?.({ preventScroll: true })

  switch (strategy) {
    case 'native':
      if (typeof el.click === 'function') el.click()
      break
    case 'pointer':
      firePointerSequence(el, true)
      break
    case 'enter':
      fireKey(el, 'Enter', 'Enter')
      break
    case 'space':
      fireKey(el, ' ', 'Space')
      break
    case 'formSubmit':
      tryFormSubmit(el)
      break
    case 'full':
    default:
      firePointerSequence(el, true)
      if (typeof el.click === 'function') el.click()
      fireKey(el, 'Enter', 'Enter')
      tryFormSubmit(el)
      break
  }

  return true
}

/** Multi-strategy click for React/Vue/hover-gated buttons. */
export function replayClick(selector: string, strategy: ClickStrategy = 'full'): boolean {
  let el: Element | null = null
  try {
    el = document.querySelector(selector)
  } catch {
    return false
  }
  if (!(el instanceof HTMLElement)) return false
  return replayClickEl(el, strategy)
}
