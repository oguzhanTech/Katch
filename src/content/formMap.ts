import type { FormMap, FormMapField } from '../shared/types'
import type { FieldRole } from '../shared/fieldRole'
import { inferFieldRole } from '../shared/fieldRole'
import { buildSelector } from '../shared/selectors'
import { getCachedFormMap, saveFormMap } from '../shared/storage'
import { queryEditables, type EditableTarget } from './injectValue'

const SUBMIT_WORDS =
  /\b(log\s*in|sign\s*in|signin|login|submit|continue|next|giriş|gonder|gönder|kaydet|save|register|sign\s*up|create\s*account|enter)\b/i

const BUTTONISH =
  /button|btn|cta|submit|login|signin|primary|action/i

const KATCH_UI =
  '#katch-floating-badge, #katch-badge-menu, #katch-toast, #katch-mock-chip, #katch-auto-chip, #katch-log-panel, #katch-teach-banner, #katch-run-summary, #katch-run-detail'

export function pageKeyFromLocation(): string {
  return `${location.origin}${location.pathname}`
}

function findRoot(from: Element): Element {
  const form = from.closest('form')
  if (form) return form

  const roleForm = from.closest('[role="form"]')
  if (roleForm) return roleForm

  const loginish = from.closest(
    '[class*="login" i], [class*="signin" i], [class*="auth" i], [id*="login" i], [id*="signin" i]',
  )
  if (loginish) return loginish

  let node: Element | null = from.parentElement
  for (let i = 0; i < 8 && node; i++) {
    const edits = queryEditables(node)
    const hasSubmit = findSubmitCandidates(node).length > 0
    if (edits.length >= 2 || (edits.length >= 1 && hasSubmit)) {
      return node
    }
    node = node.parentElement
  }

  return from.parentElement ?? document.body
}

function labelOf(el: HTMLElement): string {
  return (
    el.getAttribute('aria-label') ||
    el.getAttribute('value') ||
    el.getAttribute('title') ||
    el.textContent ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function isKatchUi(el: Element): boolean {
  return Boolean(el.closest(KATCH_UI))
}

function scoreSubmit(el: HTMLElement, root: Element): number {
  let score = 0
  const tag = el.tagName.toLowerCase()
  const type = el instanceof HTMLInputElement || el instanceof HTMLButtonElement ? el.type : ''
  const label = labelOf(el)
  const idClass = `${el.id} ${el.className}`.toLowerCase()

  if (type === 'submit') score += 100
  if (tag === 'button' && type !== 'button') score += 40
  if (tag === 'button') score += 25
  if (el.getAttribute('role') === 'button') score += 20
  if (SUBMIT_WORDS.test(label)) score += 50
  if (BUTTONISH.test(idClass)) score += 35
  if (BUTTONISH.test(label.toLowerCase())) score += 15

  // Prefer elements near the last field (bottom of form)
  const rootRect = (root as HTMLElement).getBoundingClientRect?.()
  const rect = el.getBoundingClientRect()
  if (rootRect && rect.height > 0) {
    const relY = (rect.top - rootRect.top) / Math.max(rootRect.height, 1)
    score += Math.round(relY * 10)
  }

  // Visible?
  if (rect.width < 2 || rect.height < 2) score -= 40
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
    score -= 80
  }

  return score
}

/** Ranked submit / CTA candidates inside (and near) the form root. */
export function findSubmitCandidates(root: ParentNode): HTMLElement[] {
  const rootEl = root instanceof Element ? root : document.body
  const searchRoots: ParentNode[] = [root]
  // Also scan parent one level up — submit often sits outside <form>
  if (rootEl.parentElement) searchRoots.push(rootEl.parentElement)

  const found = new Set<HTMLElement>()

  for (const scope of searchRoots) {
    const nodes = scope.querySelectorAll<HTMLElement>(
      [
        'input[type="submit"]',
        'button[type="submit"]',
        'input[type="image"]',
        'button',
        '[role="button"]',
        'input[type="button"]',
        'a[href]',
        '[class*="button" i]',
        '[class*="btn" i]',
        '[id*="button" i]',
        '[id*="btn" i]',
        '[class*="submit" i]',
        '[id*="submit" i]',
        '[class*="login" i]',
        '[data-testid*="submit" i]',
        '[data-testid*="login" i]',
      ].join(','),
    )

    nodes.forEach((el) => {
      if (isKatchUi(el)) return
      // Prefer the clickable leaf: if wrapper has nested button, keep both ranked
      found.add(el)
      const innerBtn = el.querySelector<HTMLElement>('button, [role="button"], input[type="submit"]')
      if (innerBtn && !isKatchUi(innerBtn)) found.add(innerBtn)
    })
  }

  return Array.from(found)
    .map((el) => ({ el, score: scoreSubmit(el, rootEl) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.el)
}

function collectFields(root: Element, primary: EditableTarget): FormMapField[] {
  const editables = queryEditables(root)
  const list: FormMapField[] = []
  const seen = new Set<string>()

  const push = (el: EditableTarget) => {
    if (el instanceof HTMLInputElement) {
      const t = el.type.toLowerCase()
      if (t === 'hidden' || t === 'submit' || t === 'button' || t === 'reset' || t === 'image') {
        return
      }
    }
    const selector = buildSelector(el)
    if (seen.has(selector)) return
    seen.add(selector)
    list.push({ selector, role: inferFieldRole(el) })
  }

  push(primary)
  for (const el of editables) {
    push(el)
  }
  return list
}

export function discoverFormMap(primary: EditableTarget): FormMap {
  const pageKey = pageKeyFromLocation()
  const root = findRoot(primary)
  const rootSelector = buildSelector(root)
  const fields = collectFields(root, primary)
  const candidates = findSubmitCandidates(root)
  const submit = candidates[0] ?? null
  const submitSelector = submit ? buildSelector(submit) : undefined
  const submitLabel = submit ? labelOf(submit).slice(0, 40) : undefined
  const submitCandidates = candidates.slice(0, 8).map((el) => buildSelector(el))

  const map: FormMap = {
    pageKey,
    rootSelector,
    fields,
    submitSelector,
    submitLabel,
    submitCandidates,
    scannedAt: Date.now(),
  }

  void saveFormMap(map)
  return map
}

export async function getOrDiscoverFormMap(
  primary: EditableTarget,
  force = false,
): Promise<FormMap> {
  const pageKey = pageKeyFromLocation()
  if (!force) {
    const cached = await getCachedFormMap(pageKey)
    if (cached && cached.fields.length > 0) {
      const stillThere = cached.fields.some((f) => {
        try {
          return Boolean(document.querySelector(f.selector))
        } catch {
          return false
        }
      })
      if (stillThere) return cached
    }
  }
  return discoverFormMap(primary)
}

export function resolveSubmitElement(selector: string): HTMLElement | null {
  try {
    const el = document.querySelector(selector)
    return el instanceof HTMLElement ? el : null
  } catch {
    return null
  }
}

/** Re-scan candidates live from a stored map's root. */
export function liveSubmitCandidates(map: FormMap): HTMLElement[] {
  let root: Element | null = null
  try {
    root = document.querySelector(map.rootSelector)
  } catch {
    root = null
  }
  if (!root) return []
  return findSubmitCandidates(root)
}

export type { FieldRole }
