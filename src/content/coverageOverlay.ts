import type { CoverageFieldState, CoveragePageState } from '../shared/types'
import { getCoveragePage, updateCoverageField } from '../shared/storage'
import { queryEditables } from './injectValue'
import { buildSelector } from '../shared/selectors'

let overlayOn = false
let raf = 0

export function pageKeyFromLocation(): string {
  return `${location.origin}${location.pathname}`
}

export async function markCoverageInjected(
  selector: string,
  payload: string,
): Promise<void> {
  await updateCoverageField(pageKeyFromLocation(), selector, {
    injected: true,
    lastPayload: payload,
  })
  if (overlayOn) schedulePaint()
}

export async function markCoverageCaught(selector?: string): Promise<void> {
  if (!selector) return
  await updateCoverageField(pageKeyFromLocation(), selector, {
    caught: true,
    injected: true,
  })
  if (overlayOn) schedulePaint()
}

export async function setCoverageOverlay(enabled: boolean): Promise<void> {
  overlayOn = enabled
  if (!enabled) {
    clearOverlay()
    return
  }
  await paintOverlay()
}

export function isCoverageOverlayOn(): boolean {
  return overlayOn
}

export async function getCoverageSummary(): Promise<{
  total: number
  tested: number
  caught: number
}> {
  const editables = queryEditables()
  const page = await getCoveragePage(pageKeyFromLocation())
  const fields = page?.fields ?? {}
  let tested = 0
  let caught = 0
  for (const el of editables) {
    const sel = buildSelector(el)
    const st = fields[sel]
    if (st?.injected) tested++
    if (st?.caught) caught++
  }
  return { total: editables.length, tested, caught }
}

function schedulePaint(): void {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    void paintOverlay()
  })
}

function clearOverlay(): void {
  document.querySelectorAll('[data-katch-coverage]').forEach((n) => {
    const el = n as HTMLElement
    el.style.outline = ''
    el.style.outlineOffset = ''
    el.removeAttribute('data-katch-coverage')
    el.removeAttribute('title')
  })
}

async function paintOverlay(): Promise<void> {
  clearOverlay()
  if (!overlayOn) return
  const page = await getCoveragePage(pageKeyFromLocation())
  const fields = page?.fields ?? {}
  for (const el of queryEditables()) {
    const sel = buildSelector(el)
    const st: CoverageFieldState | undefined = fields[sel]
    applyStyle(el, st)
  }
}

function applyStyle(el: HTMLElement, st?: CoverageFieldState): void {
  el.setAttribute('data-katch-coverage', '1')
  el.style.outlineOffset = '2px'
  if (st?.caught) {
    el.style.outline = '2px solid #E5A23A'
    el.style.backgroundColor = 'rgba(229, 162, 58, 0.12)'
    el.title = `Katch caught · ${st.lastPayload ?? ''}`
  } else if (st?.injected) {
    el.style.outline = '2px solid #E5A23A'
    el.title = `Katch tested · ${st.lastPayload ?? ''}`
  } else {
    el.style.outline = '2px solid #2A2F36'
    el.title = 'Katch untested'
  }
}

export function initCoverageOverlay(initialEnabled: boolean): void {
  overlayOn = initialEnabled
  if (overlayOn) void paintOverlay()

  window.addEventListener(
    'scroll',
    () => {
      if (overlayOn) schedulePaint()
    },
    true,
  )
  window.addEventListener('resize', () => {
    if (overlayOn) schedulePaint()
  })
}

// silence unused type import in some bundlers
export type { CoveragePageState }
