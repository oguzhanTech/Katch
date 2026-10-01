import { getSmartPayloads, inferFieldRole } from '../shared/payloads'
import type { PayloadItem } from '../shared/types'
import { isEditableTarget, type EditableTarget } from './injectValue'
import { runFormAutomation, type AutomationMode } from './formAutomation'

type InjectFn = (value: string) => void
type AutoFn = (mode: AutomationMode, el: EditableTarget) => void
type RateFn = (el: EditableTarget) => void

let badgeEl: HTMLButtonElement | null = null
let menuEl: HTMLDivElement | null = null
let enabled = true
let currentTarget: HTMLElement | null = null
let injectFn: InjectFn | null = null
let autoFn: AutoFn | null = null
let rateFn: RateFn | null = null

export function initFloatingBadge(
  inject: InjectFn,
  isEnabled: () => boolean,
  onAuto?: AutoFn,
  onRateLimit?: RateFn,
): void {
  injectFn = inject
  autoFn = onAuto ?? null
  rateFn = onRateLimit ?? null
  enabled = isEnabled()

  document.addEventListener(
    'focusin',
    (e) => {
      enabled = isEnabled()
      if (!enabled) {
        hideBadge()
        return
      }
      const target = e.target
      if (isEditableTarget(target)) {
        currentTarget = target
        showBadge(target)
      }
    },
    true,
  )

  document.addEventListener(
    'scroll',
    () => {
      if (currentTarget && badgeEl) reposition(currentTarget)
    },
    true,
  )

  window.addEventListener('resize', () => {
    if (currentTarget && badgeEl) reposition(currentTarget)
  })
}

export function setBadgeEnabled(value: boolean): void {
  enabled = value
  if (!value) hideBadge()
}

function showBadge(el: HTMLElement): void {
  if (!enabled) {
    hideBadge()
    return
  }
  if (!badgeEl) {
    badgeEl = document.createElement('button')
    badgeEl.id = 'katch-floating-badge'
    badgeEl.type = 'button'
    badgeEl.title = 'Katch! inject payload'
    badgeEl.textContent = 'K'
    badgeEl.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      toggleMenu()
    })
    document.documentElement.appendChild(badgeEl)
  }
  badgeEl.style.display = 'flex'
  reposition(el)
}

function hideBadge(): void {
  if (badgeEl) badgeEl.style.display = 'none'
  hideMenu()
  currentTarget = null
}

function reposition(el: HTMLElement): void {
  if (!badgeEl) return
  const rect = el.getBoundingClientRect()
  const top = Math.max(8, rect.top + rect.height / 2 - 14)
  const left = Math.min(window.innerWidth - 40, rect.right + 8)
  badgeEl.style.top = `${top}px`
  badgeEl.style.left = `${left}px`
}

function toggleMenu(): void {
  if (menuEl) {
    hideMenu()
    return
  }
  if (!currentTarget || !isEditableTarget(currentTarget)) return

  const role = inferFieldRole(currentTarget)
  const smart = getSmartPayloads(currentTarget).slice(0, 8)
  const target = currentTarget
  menuEl = document.createElement('div')
  menuEl.id = 'katch-badge-menu'

  menuEl.appendChild(
    createActionItem('Auto-fill form', 'Fill related fields only', () => {
      if (isEditableTarget(target)) autoFn?.('fill', target)
    }),
  )
  menuEl.appendChild(
    createActionItem('Auto-run (+ submit)', 'Fill, try combos, click submit', () => {
      if (isEditableTarget(target)) autoFn?.('run', target)
    }),
  )
  menuEl.appendChild(
    createActionItem('Rate limit test', 'Flood endpoint · PASS if 429 / throttled', () => {
      if (isEditableTarget(target)) rateFn?.(target)
    }),
  )

  const sep = document.createElement('div')
  sep.className = 'katch-menu-sep'
  menuEl.appendChild(sep)

  const title = document.createElement('span')
  title.className = 'katch-menu-title'
  title.textContent = `Smart · ${role}`
  menuEl.appendChild(title)

  for (const item of smart) {
    menuEl.appendChild(createMenuItem(item))
  }

  document.documentElement.appendChild(menuEl)

  if (badgeEl) {
    const br = badgeEl.getBoundingClientRect()
    menuEl.style.top = `${br.bottom + 6}px`
    menuEl.style.left = `${Math.min(br.left, window.innerWidth - 290)}px`
  }

  const closer = (e: MouseEvent) => {
    if (
      menuEl &&
      !menuEl.contains(e.target as Node) &&
      e.target !== badgeEl
    ) {
      hideMenu()
      document.removeEventListener('mousedown', closer, true)
    }
  }
  document.addEventListener('mousedown', closer, true)
}

function createActionItem(
  label: string,
  hint: string,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'katch-menu-item katch-menu-action'
  btn.innerHTML = `${escapeHtml(label)}<span>${escapeHtml(hint)}</span>`
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    hideMenu()
    onClick()
  })
  return btn
}

function createMenuItem(item: PayloadItem): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'katch-menu-item'
  btn.innerHTML = `${escapeHtml(item.label)}<span>${escapeHtml(preview(item.value))}</span>`
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    injectFn?.(item.value)
    hideMenu()
  })
  return btn
}

function hideMenu(): void {
  menuEl?.remove()
  menuEl = null
}

function preview(value: string): string {
  const v = value.replace(/\s+/g, ' ')
  return v.length > 40 ? `${v.slice(0, 40)}…` : v || '(empty)'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// re-export for callers that want direct run
export { runFormAutomation }
