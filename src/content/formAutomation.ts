import { getSmartPayloads, inferFieldRole } from '../shared/payloads'
import {
  appendTimelineEvent,
  clearPendingAutomation,
  getPendingAutomation,
  getSiteProfile,
  getStorage,
  savePendingAutomation,
  setLastAction,
  setLastAutomation,
  setLastAssertions,
  saveFormMap,
  upsertSiteProfile,
} from '../shared/storage'
import { buildSelector } from '../shared/selectors'
import type { AutomationDepth, CaughtIssue, FormMap, PendingAutomation } from '../shared/types'
import { runAssertionLite } from '../shared/assertions'
import {
  discoverFormMap,
  getOrDiscoverFormMap,
  liveSubmitCandidates,
  resolveSubmitElement,
} from './formMap'
import {
  injectValue,
  isEditableTarget,
  queryEditables,
  type EditableTarget,
} from './injectValue'
import { markCoverageInjected } from './coverageOverlay'
import {
  markUserAction,
  replayClickEl,
  setClickRecording,
  type ClickStrategy,
} from './clickRecorder'
import { sendToBackground } from '../shared/messaging'
import { showStatusToast } from './toast'
import { showRunSummary } from './runSummary'
import { katchLog } from './katchLog'
import { teachSubmitClick } from './teachSubmit'
import { startHarLiteCapture, stopHarLiteCapture } from './harLite'

export type AutomationMode = 'fill' | 'run'

const PENDING_TTL_MS = 3 * 60_000

let abortRequested = false
let chipEl: HTMLDivElement | null = null
let running = false
let activePendingId: string | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function showChip(text: string, showStop: boolean): void {
  if (!chipEl) {
    chipEl = document.createElement('div')
    chipEl.id = 'katch-auto-chip'
    document.documentElement.appendChild(chipEl)
  }
  chipEl.innerHTML = ''
  const span = document.createElement('span')
  span.textContent = text
  chipEl.appendChild(span)
  if (showStop) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = 'Stop'
    btn.addEventListener('click', () => {
      abortRequested = true
    })
    chipEl.appendChild(btn)
  }
}

function hideChip(): void {
  chipEl?.remove()
  chipEl = null
}

function resolveEl(selector: string): EditableTarget | HTMLElement | null {
  try {
    const el = document.querySelector(selector)
    if (!el) return null
    if (isEditableTarget(el)) return el
    if (el instanceof HTMLElement) return el
    return null
  } catch {
    return null
  }
}

function companionValues(el: EditableTarget, depth: AutomationDepth): string[] {
  const smart = takeByDepth(
    getSmartPayloads(el).map((p) => p.value),
    depth,
  )
  if (smart.length === 0) return ["' OR '1'='1", 'A'.repeat(32)].slice(0, depth === 'one' ? 1 : 2)
  return smart
}

function takeByDepth<T>(items: T[], depth: AutomationDepth): T[] {
  if (items.length === 0) return items
  if (depth === 'one') return items.slice(0, 1)
  if (depth === 'half') {
    return items.slice(0, Math.max(1, Math.ceil(items.length / 2)))
  }
  return items
}

function depthCap(depth: AutomationDepth): number {
  if (depth === 'one') return 1
  if (depth === 'half') return 24
  return 48
}

function buildRuns(
  map: FormMap,
  primary: EditableTarget,
  depth: AutomationDepth,
  mode: AutomationMode,
): Record<string, string>[] {
  const primarySel = buildSelector(primary)
  const allSmart = getSmartPayloads(primary).map((p) => p.value)
  const primaryPayloads =
    mode === 'fill' && depth === 'all'
      ? takeByDepth(allSmart, 'half')
      : takeByDepth(allSmart, depth)

  const companions = map.fields.filter((f) => f.selector !== primarySel)
  const companionChoices: { selector: string; values: string[] }[] = []

  for (const f of companions) {
    const el = resolveEl(f.selector)
    if (!el || !isEditableTarget(el)) continue
    companionChoices.push({
      selector: f.selector,
      values: companionValues(el, depth === 'one' ? 'one' : depth),
    })
  }

  const cap = mode === 'fill' ? Math.min(2, depthCap(depth)) : depthCap(depth)
  const runs: Record<string, string>[] = []
  for (const pv of primaryPayloads) {
    if (runs.length >= cap) break
    if (companionChoices.length === 0) {
      runs.push({ [primarySel]: pv })
      continue
    }
    for (let ci = 0; ci < Math.max(...companionChoices.map((c) => c.values.length), 1); ci++) {
      if (runs.length >= cap) break
      const fill: Record<string, string> = { [primarySel]: pv }
      for (const c of companionChoices) {
        fill[c.selector] = c.values[Math.min(ci, c.values.length - 1)] ?? c.values[0]
      }
      runs.push(fill)
    }
  }

  return runs.slice(0, cap)
}

async function applyFill(
  fill: Record<string, string>,
  opts?: { resetFirst?: boolean },
): Promise<void> {
  for (const [selector, value] of Object.entries(fill)) {
    const el = resolveEl(selector)
    if (!el || !isEditableTarget(el)) continue
    if (opts?.resetFirst) {
      try {
        injectValue(el, '')
      } catch {
        /* ignore */
      }
      await sleep(30)
    }
    injectValue(el, value)
    markUserAction()
    await appendTimelineEvent(location.href, {
      kind: 'inject',
      selector,
      payload: value,
      fieldRole: inferFieldRole(el),
    })
    await markCoverageInjected(selector, value)
    await setLastAction({
      payload: value,
      selector,
      fieldContext: undefined,
    })
    void sendToBackground({ type: 'TRACK_ACTION' })
    await sleep(60)
  }
}

interface PageSnapshot {
  href: string
  title: string
  ready: string
  bodySig: string
}

function snapshotPage(): PageSnapshot {
  const body = document.body?.innerText?.slice(0, 800) ?? ''
  return {
    href: location.href,
    title: document.title,
    ready: document.readyState,
    bodySig: `${body.length}:${body.slice(0, 120)}`,
  }
}

function pageChanged(before: PageSnapshot): boolean {
  const after = snapshotPage()
  return (
    after.href !== before.href ||
    after.title !== before.title ||
    after.bodySig !== before.bodySig
  )
}

function collectSubmitTargets(map: FormMap): { el: HTMLElement; selector: string }[] {
  const out: { el: HTMLElement; selector: string }[] = []
  const seen = new Set<HTMLElement>()

  const push = (el: HTMLElement | null, selector?: string) => {
    if (!el || seen.has(el)) return
    seen.add(el)
    out.push({ el, selector: selector || buildSelector(el) })
  }

  // Primary discovery order first
  if (map.submitSelector) {
    push(resolveSubmitElement(map.submitSelector), map.submitSelector)
  }
  for (const sel of map.submitCandidates ?? []) {
    push(resolveSubmitElement(sel), sel)
  }

  // Live re-scan: append nearest class/id containing "button" / "btn"
  const live = liveSubmitCandidates(map)
  const buttonish = live.filter((el) =>
    /button|btn|submit|cta/.test(`${el.id} ${el.className}`.toLowerCase()),
  )
  const rest = live.filter((el) => !buttonish.includes(el))
  for (const el of [...buttonish, ...rest]) {
    push(el)
  }

  return out
}

const SUBMIT_EFFECT_WAIT_MS = 900
const SUBMIT_POLL_MS = 150
/** Hard cap so Auto-run cannot hang for minutes on failed submits */
const SUBMIT_AUTO_BUDGET_MS = 4500

/**
 * Fast auto attempts, then ask the user to teach the real submit once.
 */
async function submitWithFallback(
  map: FormMap,
  shouldAbort: () => boolean,
  taught?: { selector: string; label: string } | null,
): Promise<{
  ok: boolean
  selector?: string
  label?: string
  taught?: { selector: string; label: string }
  skippedTeach?: boolean
}> {
  // Prefer previously taught / confirmed selector
  if (taught?.selector) {
    const el = resolveSubmitElement(taught.selector)
    if (el) {
      katchLog('auto', `Using taught submit: ${taught.label}`, 'auto')
      replayClickEl(el, 'full')
      await sleep(350)
      return { ok: true, selector: taught.selector, label: taught.label, taught }
    }
    katchLog('auto', `Taught selector missing: ${taught.selector}`, 'warn')
  }

  const targets = collectSubmitTargets(map)
  katchLog(
    'auto',
    `Submit candidates: ${targets.length}${map.submitLabel ? ` · primary “${map.submitLabel}”` : ''}`,
    'auto',
  )

  if (targets.length === 0) {
    katchLog('auto', 'No submit candidates — asking user', 'warn')
    return teachAndSave(map, shouldAbort)
  }

  const budgetEnd = Date.now() + SUBMIT_AUTO_BUDGET_MS
  const attempts: { strategy: ClickStrategy; waitMs: number }[] = [
    { strategy: 'full', waitMs: SUBMIT_EFFECT_WAIT_MS },
    { strategy: 'native', waitMs: 700 },
    { strategy: 'formSubmit', waitMs: 600 },
  ]

  let attempt = 0
  for (const target of targets.slice(0, 4)) {
    for (const round of attempts) {
      if (shouldAbort()) return { ok: false }
      if (Date.now() >= budgetEnd) break

      attempt++
      katchLog(
        'auto',
        `Try #${attempt} ${round.strategy} → ${target.selector.slice(0, 60)}`,
        'auto',
      )

      const before = snapshotPage()
      const form = target.el.closest('form')
      try {
        replayClickEl(target.el, round.strategy)
      } catch (err) {
        katchLog('auto', `Click threw: ${String(err)}`, 'error')
        continue
      }

      const waitLeft = Math.min(round.waitMs, Math.max(0, budgetEnd - Date.now()))
      const effected = await waitForSubmitEffect(before, form, shouldAbort, waitLeft)
      if (effected) {
        katchLog('auto', `Submit effected via ${round.strategy}`, 'ok')
        const label =
          (
            target.el.getAttribute('aria-label') ||
            target.el.getAttribute('value') ||
            target.el.textContent ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 40) || round.strategy
        return { ok: true, selector: target.selector, label }
      }
    }
    if (Date.now() >= budgetEnd) break
  }

  katchLog('auto', 'Auto submit failed within budget — teach mode', 'warn')
  return teachAndSave(map, shouldAbort)
}

async function teachAndSave(
  map: FormMap,
  shouldAbort: () => boolean,
): Promise<{
  ok: boolean
  selector?: string
  label?: string
  taught?: { selector: string; label: string }
  skippedTeach?: boolean
}> {
  showChip('AUTO · click submit once…', true)
  const taught = await teachSubmitClick({
    shouldAbort,
    message: "Couldn't click submit — tap the correct button once; Katch will reuse it",
  })
  if (!taught) {
    katchLog('auto', 'Teach submit skipped / failed', 'warn')
    return { ok: false, skippedTeach: true }
  }

  const nextMap: FormMap = {
    ...map,
    submitSelector: taught.selector,
    submitLabel: taught.label,
    submitCandidates: [
      taught.selector,
      ...(map.submitCandidates ?? []).filter((s) => s !== taught.selector),
    ].slice(0, 8),
    scannedAt: Date.now(),
  }
  Object.assign(map, nextMap)
  void saveFormMap(nextMap)
  void upsertSiteProfile({
    origin: location.origin,
    taughtSubmit: { selector: taught.selector, label: taught.label },
    formMapPageKey: map.pageKey,
  })

  return {
    ok: true,
    selector: taught.selector,
    label: taught.label,
    taught: { selector: taught.selector, label: taught.label },
  }
}

async function waitForSubmitEffect(
  before: PageSnapshot,
  form: Element | null,
  shouldAbort: () => boolean,
  waitMs: number,
): Promise<boolean> {
  if (waitMs <= 0) return false

  const hadInvalid =
    form instanceof HTMLFormElement
      ? Boolean(form.querySelector(':invalid, [aria-invalid="true"]'))
      : false

  let submitFired = false
  const onSubmit = () => {
    submitFired = true
  }
  form?.addEventListener('submit', onSubmit, { once: true, capture: true })

  const deadline = Date.now() + waitMs
  try {
    while (Date.now() < deadline) {
      if (shouldAbort()) return false
      if (submitFired || pageChanged(before)) return true
      if (
        !hadInvalid &&
        form instanceof HTMLFormElement &&
        (form.querySelector(':invalid') || form.querySelector('[aria-invalid="true"]'))
      ) {
        return true
      }
      await sleep(SUBMIT_POLL_MS)
    }
    return submitFired || pageChanged(before)
  } finally {
    form?.removeEventListener('submit', onSubmit, true)
  }
}

export function isAutomationRunning(): boolean {
  return running
}

function matchPathFromLocation(): string {
  return location.pathname
}

function pendingStillOnPage(pending: PendingAutomation): boolean {
  if (pending.origin !== location.origin) return false
  if (Date.now() - pending.at > PENDING_TTL_MS) return false

  // Same path (search often keeps pathname; query changes)
  if (location.pathname === pending.matchPath) return true

  // Form / fields still present after redirect to results / login error page
  const sels = [
    pending.map.rootSelector,
    pending.taughtSubmit?.selector,
    pending.map.submitSelector,
    ...pending.map.fields.map((f) => f.selector),
  ].filter(Boolean) as string[]

  for (const sel of sels) {
    try {
      if (document.querySelector(sel)) return true
    } catch {
      /* ignore */
    }
  }
  return false
}

async function checkpointPending(partial: PendingAutomation): Promise<void> {
  activePendingId = partial.id
  await savePendingAutomation({ ...partial, at: Date.now() })
}

function resolvePrimaryFromMap(map: FormMap, preferred?: string): EditableTarget | null {
  const order = [
    preferred,
    ...map.fields.map((f) => f.selector),
  ].filter(Boolean) as string[]
  for (const sel of order) {
    const el = resolveEl(sel)
    if (el && isEditableTarget(el)) return el
  }
  const any = queryEditables()[0]
  return any ?? null
}

export async function runFormAutomation(
  primary: EditableTarget,
  mode: AutomationMode,
  options?: {
    forceRescan?: boolean
    silent?: boolean
    resume?: PendingAutomation
  },
): Promise<{
  runs: number
  submitted: boolean
  aborted: boolean
  submitFound: boolean
  issues: number
}> {
  if (running) {
    abortRequested = true
    return {
      runs: 0,
      submitted: false,
      aborted: true,
      submitFound: false,
      issues: 0,
    }
  }

  running = true
  abortRequested = false
  const resume = options?.resume
  const startedAt = resume?.startedAt ?? Date.now()
  const storage = await getStorage()
  const siteProfile = await getSiteProfile(location.origin)
  const depth =
    siteProfile?.preferredDepth ?? storage.settings.automationDepth ?? 'half'

  const map = resume?.map ?? (await getOrDiscoverFormMap(primary, options?.forceRescan))
  const primaryRole = resume?.primaryRole ?? inferFieldRole(primary)
  const runs = resume?.runs ?? buildRuns(map, primary, depth, mode)
  const startIndex = resume?.nextIndex ?? 0
  let completed = resume?.completed ?? 0
  let submitted = false
  const submitTargets = mode === 'run' ? collectSubmitTargets(map) : []
  const submitFound =
    Boolean(map.submitSelector) ||
    (map.submitCandidates?.length ?? 0) > 0 ||
    submitTargets.length > 0
  let lastSubmitSelector = resume?.lastSubmitSelector ?? map.submitSelector
  let lastSubmitLabel = resume?.lastSubmitLabel ?? map.submitLabel
  let taughtSubmit: { selector: string; label: string } | null =
    resume?.taughtSubmit ?? null
  let skipTeach = resume?.skipTeach ?? false

  if (!taughtSubmit && mode === 'run') {
    const profile = await getSiteProfile(location.origin)
    if (profile?.taughtSubmit) {
      taughtSubmit = profile.taughtSubmit
      katchLog('auto', `Site profile submit: ${taughtSubmit.label}`, 'ok')
    }
  }

  if (mode === 'run' && storage.settings.harLiteEnabled !== false && !resume) {
    startHarLiteCapture()
  }

  const pendingId =
    resume?.id ?? `auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  activePendingId = pendingId

  const primarySelector = resume?.primarySelector ?? buildSelector(primary)

  katchLog(
    'auto',
    `${resume ? 'Resume' : 'Start'} ${mode} · depth=${depth} · ${startIndex}/${runs.length} → ${runs.length} · ${map.fields.length} field(s) · role=${primaryRole}`,
    'auto',
  )

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') abortRequested = true
  }
  document.addEventListener('keydown', onKey, true)

  // Persist before unload so search/login full-page submits can resume
  const onPageHide = () => {
    if (!running || activePendingId !== pendingId) return
    // best-effort sync write already in flight via checkpoint
  }
  window.addEventListener('pagehide', onPageHide)

  setClickRecording(false)
  try {
    showChip(
      resume
        ? `AUTO ${startIndex}/${runs.length} · resume`
        : `AUTO 0/${runs.length} · ${primaryRole}`,
      true,
    )

    for (let i = startIndex; i < runs.length; i++) {
      if (abortRequested) {
        katchLog('auto', 'Aborted by user', 'warn')
        break
      }
      showChip(`AUTO ${i + 1}/${runs.length} · ${primaryRole}`, true)
      katchLog('auto', `Run ${i + 1}/${runs.length} fill`, 'auto')

      // Checkpoint BEFORE submit so navigation mid-click still resumes next combo
      await checkpointPending({
        id: pendingId,
        at: Date.now(),
        startedAt,
        mode,
        origin: location.origin,
        matchPath: matchPathFromLocation(),
        map,
        runs,
        nextIndex: i + 1,
        completed: i,
        planned: runs.length,
        primaryRole,
        primarySelector,
        taughtSubmit: taughtSubmit ?? undefined,
        skipTeach,
        silent: options?.silent,
        lastSubmitSelector,
        lastSubmitLabel,
      })

      await applyFill(runs[i], { resetFirst: mode === 'run' || i > startIndex })

      if (mode === 'run') {
        if (abortRequested) break
        showChip(`AUTO ${i + 1}/${runs.length} · submitting…`, true)

        if (skipTeach && !taughtSubmit) {
          katchLog('auto', `Run ${i + 1}: skip submit (teach declined)`, 'warn')
        } else {
          const result = await submitWithFallback(
            map,
            () => abortRequested,
            taughtSubmit,
          )
          if (result.skippedTeach) skipTeach = true
          if (result.taught) taughtSubmit = result.taught
          else if (result.ok && result.selector) {
            taughtSubmit = {
              selector: result.selector,
              label: result.label ?? 'submit',
            }
          }
          if (result.ok) {
            submitted = true
            lastSubmitSelector = result.selector ?? lastSubmitSelector
            lastSubmitLabel = result.label ?? lastSubmitLabel
            markUserAction()
            await appendTimelineEvent(location.href, {
              kind: 'click',
              selector: result.selector ?? map.submitSelector ?? 'submit',
              label: result.label ?? map.submitLabel ?? 'submit',
              tagName: 'button',
            })
          } else {
            katchLog('auto', `Run ${i + 1}: submit not confirmed`, 'warn')
          }
        }

        // Same-document stay (login validation): settle, then next combo
        await sleep(500)
        // Update checkpoint after successful same-page submit
        await checkpointPending({
          id: pendingId,
          at: Date.now(),
          startedAt,
          mode,
          origin: location.origin,
          matchPath: matchPathFromLocation(),
          map,
          runs,
          nextIndex: i + 1,
          completed: i + 1,
          planned: runs.length,
          primaryRole,
          primarySelector,
          taughtSubmit: taughtSubmit ?? undefined,
          skipTeach,
          silent: options?.silent,
          lastSubmitSelector,
          lastSubmitLabel,
        })
      } else {
        await sleep(350)
      }
      completed = i + 1
    }

    await sleep(600)
    const caught = await listIssuesSince(startedAt)
    const issues = caught.length
    const har =
      mode === 'run' && storage.settings.harLiteEnabled !== false
        ? await stopHarLiteCapture()
        : []
    const assertions =
      mode === 'run' && storage.settings.assertionLiteEnabled !== false
        ? runAssertionLite({
            issues: caught,
            har,
            completed,
            planned: runs.length,
            aborted: abortRequested || completed < runs.length,
          })
        : []
    if (assertions.length) await setLastAssertions(assertions)

    await setLastAutomation({
      runs: completed,
      mode,
      primaryRole,
      submitSelector: lastSubmitSelector,
      at: Date.now(),
    })
    await clearPendingAutomation()
    activePendingId = null

    const wasAborted = abortRequested || completed < runs.length
    katchLog(
      'auto',
      `Finished ${mode} · ${completed}/${runs.length} · submitted=${submitted} · issues=${issues}`,
      wasAborted ? 'warn' : 'ok',
    )

    const subtitle = formatResultLine({
      mode,
      completed,
      planned: runs.length,
      wasAborted,
      submitFound: submitFound || Boolean(taughtSubmit),
      submitted,
      fields: map.fields.length,
      issues,
    })

    if (!options?.silent && !resume?.silent) {
      const summaryOn = storage.settings.runSummaryEnabled !== false
      if (summaryOn) {
        showRunSummary({
          title: mode === 'run' ? 'Auto-run finished' : 'Auto-fill finished',
          subtitle,
          mode,
          completed,
          planned: runs.length,
          fields: map.fields.length,
          submitted,
          aborted: wasAborted,
          issues: caught,
          startedAt,
          assertions,
          har,
        })
      } else {
        showStatusToast(
          mode === 'run' ? 'Auto-run finished' : 'Auto-fill finished',
          subtitle,
          lastSubmitLabel ? `Submit: ${lastSubmitLabel}` : undefined,
        )
      }
    }

    return {
      runs: completed,
      submitted,
      aborted: wasAborted,
      submitFound: submitFound || Boolean(taughtSubmit),
      issues,
    }
  } finally {
    window.removeEventListener('pagehide', onPageHide)
    document.removeEventListener('keydown', onKey, true)
    setClickRecording(true)
    hideChip()
    if (abortRequested) {
      void clearPendingAutomation()
      activePendingId = null
    }
    running = false
    abortRequested = false
  }
}

/**
 * After full page reload / search navigation, continue remaining Auto-run combos.
 */
export async function tryResumePendingAutomation(): Promise<boolean> {
  if (running) return false
  const pending = await getPendingAutomation()
  if (!pending) return false
  if (Date.now() - pending.at > PENDING_TTL_MS) {
    katchLog('auto', 'Pending auto-run expired', 'warn')
    await clearPendingAutomation()
    return false
  }
  if (pending.nextIndex >= pending.runs.length) {
    await clearPendingAutomation()
    return false
  }
  if (!pendingStillOnPage(pending)) {
    if (!pending.backAttempted) {
      katchLog('auto', 'Form not on page — history.back() to continue runs', 'warn')
      await savePendingAutomation({
        ...pending,
        backAttempted: true,
        at: Date.now(),
      })
      try {
        history.back()
      } catch {
        /* ignore */
      }
      return true
    }
    katchLog('auto', 'Pending auto-run: form not recoverable', 'warn')
    await clearPendingAutomation()
    return false
  }

  const primary = resolvePrimaryFromMap(pending.map, pending.primarySelector)
  if (!primary) {
    katchLog('auto', 'Pending auto-run: no field to resume', 'warn')
    return false
  }

  katchLog(
    'auto',
    `Resuming auto-run at ${pending.nextIndex + 1}/${pending.planned}`,
    'ok',
  )
  showStatusToast(
    'Auto-run resuming',
    `Continuing ${pending.nextIndex + 1}–${pending.planned} · after navigation`,
  )

  await runFormAutomation(primary, pending.mode, {
    silent: pending.silent,
    resume: pending,
  })
  return true
}

async function listIssuesSince(startedAt: number): Promise<CaughtIssue[]> {
  const s = await getStorage()
  return s.history.filter((i) => i.timestamp >= startedAt - 500)
}

function formatResultLine(opts: {
  mode: AutomationMode
  completed: number
  planned: number
  wasAborted: boolean
  submitFound: boolean
  submitted: boolean
  fields: number
  issues: number
}): string {
  const issuePart =
    opts.issues === 0 ? 'Clear · no issues' : `${opts.issues} issue${opts.issues === 1 ? '' : 's'} caught`

  if (opts.mode === 'run') {
    const runPart = opts.wasAborted
      ? `Stopped · ${opts.completed}/${opts.planned} runs`
      : opts.submitFound
        ? `Done · ${opts.completed} runs · submit clicked`
        : `Done · ${opts.completed} runs · no submit found`
    return `${runPart} · ${issuePart}`
  }

  const fillPart = opts.wasAborted
    ? `Stopped · filled ${opts.completed} pass(es)`
    : `Done · filled ${opts.completed} pass(es) · ${opts.fields} fields`
  return `${fillPart} · ${issuePart}`
}

/** Run automation on every distinct form on the page. */
export async function runPageAutomation(
  mode: AutomationMode,
): Promise<{
  forms: number
  runs: number
  aborted: boolean
  issues: number
}> {
  if (running) {
    abortRequested = true
    return { forms: 0, runs: 0, aborted: true, issues: 0 }
  }

  const editables = queryEditables()
  const title = mode === 'run' ? 'Page Auto-run finished' : 'Page Auto-fill finished'

  if (editables.length === 0) {
    showStatusToast(title, 'No editable fields found · Clear · no issues')
    return { forms: 0, runs: 0, aborted: false, issues: 0 }
  }

  const startedAt = Date.now()
  const seen = new Set<string>()
  let forms = 0
  let totalRuns = 0
  let aborted = false

  for (const el of editables) {
    if (abortRequested) {
      aborted = true
      break
    }
    const map = discoverFormMap(el)
    if (seen.has(map.rootSelector)) continue
    seen.add(map.rootSelector)

    const result = await runFormAutomation(el, mode, {
      forceRescan: true,
      silent: true,
    })
    forms++
    totalRuns += result.runs
    if (result.aborted) {
      aborted = true
      break
    }
  }

  await sleep(600)
  const caught = await listIssuesSince(startedAt)
  const issues = caught.length
  const issuePart =
    issues === 0 ? 'Clear · no issues' : `${issues} issue${issues === 1 ? '' : 's'} caught`
  const subtitle = aborted
    ? `Stopped · ${forms} form(s) · ${totalRuns} run(s) · ${issuePart}`
    : `Done · ${forms} form(s) · ${totalRuns} run(s) · ${issuePart}`

  const storage = await getStorage()
  if (storage.settings.runSummaryEnabled !== false) {
    showRunSummary({
      title,
      subtitle,
      mode,
      completed: totalRuns,
      planned: totalRuns,
      submitted: mode === 'run',
      aborted,
      issues: caught,
      startedAt,
    })
  } else {
    showStatusToast(title, subtitle)
  }

  katchLog(
    'auto',
    `Page ${mode} done · forms=${forms} runs=${totalRuns} issues=${issues}`,
    aborted ? 'warn' : 'ok',
  )

  return { forms, runs: totalRuns, aborted, issues }
}

/** @deprecated use runPageAutomation('fill') */
export async function runPageAutoFill(): Promise<{
  forms: number
  runs: number
  aborted: boolean
  issues: number
}> {
  return runPageAutomation('fill')
}

export async function runPageAutoRun(): Promise<{
  forms: number
  runs: number
  aborted: boolean
  issues: number
}> {
  return runPageAutomation('run')
}
