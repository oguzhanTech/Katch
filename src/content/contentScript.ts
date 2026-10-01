import { describeField, inferFieldRole, pickSmartValue } from '../shared/payloads'
import { buildSelector } from '../shared/selectors'
import { onMessage, sendToBackground } from '../shared/messaging'
import {
  appendTimelineEvent,
  ensureActiveTimeline,
  getStorage,
  setLastAction,
  startNewTimeline,
} from '../shared/storage'
import { initFloatingBadge, setBadgeEnabled } from './floatingBadge'
import { runFormAutomation, runPageAutoFill, runPageAutoRun, tryResumePendingAutomation } from './formAutomation'
import { runRateLimitTest } from './rateLimitTest'
import { initNetworkMock, applyMock, shouldNotifyMock } from './networkMock'
import {
  getActiveEditable,
  injectValue,
  isEditableTarget,
  queryEditables,
  type EditableTarget,
} from './injectValue'
import {
  getCoverageSummary,
  initCoverageOverlay,
  markCoverageCaught,
  markCoverageInjected,
  setCoverageOverlay,
} from './coverageOverlay'
import { showIssueToast, hideIssueToast } from './toast'
import {
  initClickRecorder,
  markUserAction,
  replayClick,
  setClickRecording,
} from './clickRecorder'
import { initLogPanel, setLogPanelVisible } from './logPanel'
import { hydrateLogs, katchLog } from './katchLog'
import { isConsoleNoise } from '../shared/consoleNoise'
import { scanLayoutIssues, layoutFindingsToIssues } from './layoutInspector'
import { scanA11yIssues, a11yFindingsToIssues } from './a11yScan'
import { dumpPageStorage, clearPageStorage, setPageStorage } from './storageManager'
import { runScenario } from './scenarioRunner'

import type { CaughtIssue, FieldContext, KatchMessage } from '../shared/types'
import './styles.css'

let recentActionWindowMs = 20_000
let lastActionAt = 0
let toastEnabled = true
let floatingBadgeEnabled = true
let devLogPanelEnabled = true
let screenshotOnCatch = true
let consoleNoiseFilter = true
/** Master switch — when false, page-side Katch is idle */
let extensionEnabled = true

function isLive(): boolean {
  return extensionEnabled
}

function applyUiFromSettings(s: {
  extensionEnabled?: boolean
  floatingBadgeEnabled: boolean
  toastEnabled: boolean
  coverageOverlayEnabled: boolean
  devLogPanelEnabled?: boolean
  screenshotOnCatch?: boolean
  consoleNoiseFilter?: boolean
  attributionWindowMs?: number
}): void {
  extensionEnabled = s.extensionEnabled !== false
  floatingBadgeEnabled = s.floatingBadgeEnabled
  toastEnabled = s.toastEnabled
  devLogPanelEnabled = s.devLogPanelEnabled !== false
  screenshotOnCatch = s.screenshotOnCatch !== false
  consoleNoiseFilter = s.consoleNoiseFilter !== false
  if (typeof s.attributionWindowMs === 'number' && s.attributionWindowMs > 0) {
    recentActionWindowMs = s.attributionWindowMs
  }

  setBadgeEnabled(extensionEnabled && floatingBadgeEnabled)
  setLogPanelVisible(extensionEnabled && devLogPanelEnabled)
  if (!extensionEnabled || !toastEnabled) hideIssueToast()
  void setCoverageOverlay(extensionEnabled && Boolean(s.coverageOverlayEnabled))
  setClickRecording(extensionEnabled)

  if (!extensionEnabled) {
    katchLog('boot', 'Katch disabled', 'warn')
  }
}

async function rememberAction(
  el: EditableTarget,
  payload: string,
): Promise<FieldContext> {
  const ctx = describeField(el) ?? {
    tagName: el.tagName.toLowerCase(),
    type: 'text',
    name: '',
    id: el.id || '',
    placeholder: '',
    required: false,
    maxlength: null,
    min: null,
    max: null,
    pattern: null,
    selector: '',
  }
  ctx.selector = buildSelector(el)
  const role = inferFieldRole(el)
  lastActionAt = Date.now()
  await setLastAction({
    payload,
    selector: ctx.selector,
    fieldContext: ctx,
  })
  void sendToBackground({ type: 'TRACK_ACTION' })
  markUserAction()
  await appendTimelineEvent(location.href, {
    kind: 'inject',
    selector: ctx.selector,
    payload,
    fieldRole: role,
  })
  await markCoverageInjected(ctx.selector, payload)
  return ctx
}

async function injectIntoFocused(payload: string): Promise<boolean> {
  let el = getActiveEditable()
  if (!el) {
    const candidate = queryEditables()[0]
    if (!candidate) return false
    el = candidate
  }
  injectValue(el, payload)
  await rememberAction(el, payload)
  return true
}

async function injectIntoSelector(
  selector: string,
  payload: string,
): Promise<boolean> {
  let el: Element | null = null
  try {
    el = document.querySelector(selector)
  } catch {
    el = null
  }
  if (!el || !isEditableTarget(el)) return false
  injectValue(el, payload)
  await rememberAction(el, payload)
  return true
}

async function stressFillAll(): Promise<number> {
  const fields = queryEditables()
  let count = 0
  for (const el of fields) {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = true
        el.dispatchEvent(new Event('change', { bubbles: true }))
        count++
        continue
      }
    }
    const value = pickSmartValue(el)
    injectValue(el, value)
    const sel = buildSelector(el)
    await markCoverageInjected(sel, value)
    count++
  }

  lastActionAt = Date.now()
  void sendToBackground({ type: 'TRACK_ACTION' })
  markUserAction()
  await appendTimelineEvent(location.href, { kind: 'stressFill', count })
  if (fields[0]) {
    await setLastAction({
      payload: pickSmartValue(fields[0]),
      selector: buildSelector(fields[0]),
      fieldContext: describeField(fields[0]) ?? undefined,
    })
  }
  return count
}

async function captureEvidence(selector?: string): Promise<{
  screenshotDataUrl?: string
  domSnippet?: string
}> {
  let domSnippet: string | undefined
  if (selector) {
    try {
      const el = document.querySelector(selector)
      if (el) domSnippet = el.outerHTML.slice(0, 2000)
    } catch {
      /* ignore */
    }
  } else {
    const active = getActiveEditable()
    if (active) domSnippet = active.outerHTML.slice(0, 2000)
  }

  let screenshotDataUrl: string | undefined
  if (screenshotOnCatch) {
    try {
      const res = (await sendToBackground({ type: 'CAPTURE_SCREENSHOT' })) as {
        dataUrl?: string
      }
      screenshotDataUrl = res?.dataUrl
    } catch {
      /* ignore */
    }
  }
  return { screenshotDataUrl, domSnippet }
}

async function emitIssue(
  kind: CaughtIssue['kind'],
  message: string,
  details?: string,
  statusCode?: number,
): Promise<void> {
  if (!isLive()) return
  if (kind === 'console' && consoleNoiseFilter && isConsoleNoise(message)) {
    return
  }

  const storage = await getStorage()
  const windowMs = storage.settings.attributionWindowMs || recentActionWindowMs
  const withinWindow = Date.now() - lastActionAt < windowMs

  if (!withinWindow && kind !== 'network' && kind !== 'a11y' && kind !== 'layout') {
    return
  }

  const evidence = await captureEvidence(storage.lastSelector)
  const session = await ensureActiveTimeline(location.href)
  const issue: CaughtIssue = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    url: location.href,
    kind,
    message,
    details,
    statusCode,
    payload: storage.lastPayload,
    selector: storage.lastSelector,
    fieldContext: storage.lastFieldContext,
    userAgent: navigator.userAgent,
    timelineSessionId: session.id,
    screenshotDataUrl: evidence.screenshotDataUrl,
    domSnippet: evidence.domSnippet,
  }

  await appendTimelineEvent(location.href, {
    kind: 'catch',
    issueId: issue.id,
    message: issue.message,
    statusCode: issue.statusCode,
    selector: issue.selector,
  })
  if (issue.selector) await markCoverageCaught(issue.selector)

  showIssueToast(issue, toastEnabled, session)
  await sendToBackground({ type: 'ISSUE_CAUGHT', issue })
}

function installErrorTraps(): void {
  window.addEventListener('error', (event) => {
    void emitIssue(
      'js',
      event.message || 'Uncaught error',
      event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection'
    const details = reason instanceof Error ? reason.stack : undefined
    void emitIssue('unhandled', message, details)
  })

  const original = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    original(...args)
    const message = args
      .map((a) => {
        if (a instanceof Error) return a.message
        try {
          return typeof a === 'string' ? a : JSON.stringify(a)
        } catch {
          return String(a)
        }
      })
      .join(' ')
    void emitIssue('console', message)
  }
}

async function boot(): Promise<void> {
  await hydrateLogs()
  const storage = await getStorage()
  applyUiFromSettings(storage.settings)

  initFloatingBadge(
    (value) => {
      if (!isLive()) return
      void injectIntoFocused(value)
    },
    () => isLive() && floatingBadgeEnabled,
    (mode, el) => {
      if (!isLive()) return
      void (async () => {
        katchLog('badge', `Menu → Auto-${mode}`)
        const result = await runFormAutomation(el, mode)
        if (mode === 'run' && !result.submitFound) {
          katchLog('badge', 'Auto-run: no submit found', 'warn')
        }
      })()
    },
    (el) => {
      if (!isLive()) return
      void (async () => {
        katchLog('badge', 'Menu → Rate limit test')
        await runRateLimitTest(el)
      })()
    },
  )

  initNetworkMock(storage.mock)
  initCoverageOverlay(
    storage.settings.extensionEnabled !== false &&
      storage.settings.coverageOverlayEnabled,
  )
  initClickRecorder()
  setClickRecording(storage.settings.extensionEnabled !== false)
  initLogPanel(
    storage.settings.extensionEnabled !== false &&
      storage.settings.devLogPanelEnabled !== false,
  )
  katchLog(
    'boot',
    `Katch content ready · enabled=${storage.settings.extensionEnabled !== false}`,
    'ok',
  )
  void ensureActiveTimeline(location.href)

  // Resume Auto-run after search/login full-page navigation
  if (storage.settings.extensionEnabled !== false) {
    window.setTimeout(() => {
      void tryResumePendingAutomation()
    }, 450)
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (!isLive()) return
    const data = event.data
    if (!data || data.source !== 'katch-page' || data.type !== 'KATCH_MOCKED_REQUEST') {
      return
    }
    if (!shouldNotifyMock()) return
    lastActionAt = Date.now()
    void emitIssue(
      'network',
      `Mocked HTTP ${data.status} on ${data.url}`,
      'Katch! network mock',
      data.status,
    )
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (changes.settings) {
      applyUiFromSettings(
        changes.settings.newValue as {
          extensionEnabled?: boolean
          floatingBadgeEnabled: boolean
          toastEnabled: boolean
          coverageOverlayEnabled: boolean
          devLogPanelEnabled?: boolean
        },
      )
    }
  })

  installErrorTraps()

  onMessage((message: KatchMessage, _sender, sendResponse) => {
    void (async () => {
      // Always allow settings / ping while disabled
      if (
        !isLive() &&
        message.type !== 'SETTINGS_UPDATED' &&
        message.type !== 'PING' &&
        message.type !== 'GET_FIELD_CONTEXT'
      ) {
        sendResponse({ ok: false, error: 'Katch disabled' })
        return
      }

      switch (message.type) {
        case 'INJECT_PAYLOAD': {
          const ok = message.selector
            ? await injectIntoSelector(message.selector, message.payload ?? '')
            : await injectIntoFocused(message.payload ?? '')
          sendResponse({ ok })
          break
        }
        case 'STRESS_FILL': {
          const count = await stressFillAll()
          sendResponse({ ok: true, count })
          break
        }
        case 'NETWORK_ISSUE': {
          if (message.issue) {
            lastActionAt = Date.now()
            const storageNow = await getStorage()
            const session = await ensureActiveTimeline(location.href)
            const evidence = await captureEvidence(
              storageNow.lastSelector ?? message.issue.selector,
            )
            const issue: CaughtIssue = {
              ...message.issue,
              url: location.href,
              payload: storageNow.lastPayload ?? message.issue.payload,
              selector: storageNow.lastSelector ?? message.issue.selector,
              fieldContext:
                storageNow.lastFieldContext ?? message.issue.fieldContext,
              userAgent: navigator.userAgent,
              timelineSessionId: session.id,
              screenshotDataUrl:
                evidence.screenshotDataUrl ?? message.issue.screenshotDataUrl,
              domSnippet: evidence.domSnippet ?? message.issue.domSnippet,
            }
            await appendTimelineEvent(location.href, {
              kind: 'catch',
              issueId: issue.id,
              message: issue.message,
              statusCode: issue.statusCode,
              selector: issue.selector,
            })
            if (issue.selector) await markCoverageCaught(issue.selector)
            showIssueToast(issue, toastEnabled, session)
            await sendToBackground({ type: 'ISSUE_CAUGHT', issue })
          }
          sendResponse({ ok: true })
          break
        }
        case 'SETTINGS_UPDATED': {
          if (message.settings) {
            applyUiFromSettings(message.settings)
          }
          sendResponse({ ok: true })
          break
        }
        case 'MOCK_UPDATED': {
          if (message.mock) applyMock(message.mock)
          sendResponse({ ok: true })
          break
        }
        case 'COVERAGE_TOGGLE': {
          const enabled = Boolean(message.coverageEnabled)
          await setCoverageOverlay(isLive() && enabled)
          sendResponse({ ok: true })
          break
        }
        case 'COVERAGE_SUMMARY': {
          const summary = await getCoverageSummary()
          sendResponse({ ok: true, ...summary })
          break
        }
        case 'REPLAY_SESSION': {
          const storageNow = await getStorage()
          const session = storageNow.timelines.find((t) => t.id === message.sessionId)
          if (!session) {
            sendResponse({ ok: false, error: 'session not found' })
            break
          }
          setClickRecording(false)
          let played = 0
          let skipped = 0
          try {
            for (const ev of session.events) {
              if (ev.kind === 'inject') {
                const ok = await injectIntoSelector(ev.selector, ev.payload)
                if (ok) played++
                else skipped++
                await new Promise((r) => setTimeout(r, 180))
              } else if (ev.kind === 'stressFill') {
                await stressFillAll()
                played++
                await new Promise((r) => setTimeout(r, 180))
              } else if (ev.kind === 'click') {
                const ok = replayClick(ev.selector)
                if (ok) played++
                else skipped++
                await new Promise((r) => setTimeout(r, 250))
              }
            }
          } finally {
            setClickRecording(isLive())
            markUserAction()
          }
          sendResponse({ ok: true, played, skipped })
          break
        }
        case 'NEW_TIMELINE': {
          const session = await startNewTimeline(location.href)
          sendResponse({ ok: true, sessionId: session.id })
          break
        }
        case 'AUTO_FILL_PAGE': {
          const result = await runPageAutoFill()
          sendResponse({ ok: true, ...result })
          break
        }
        case 'AUTO_RUN_PAGE': {
          const result = await runPageAutoRun()
          sendResponse({ ok: true, ...result })
          break
        }
        case 'RATE_LIMIT_TEST': {
          const el = getActiveEditable()
          if (!el) {
            sendResponse({ ok: false, error: 'Focus an input first' })
            break
          }
          const result = await runRateLimitTest(el)
          sendResponse({ ok: true, ...result })
          break
        }
        case 'LAYOUT_SCAN': {
          const findings = scanLayoutIssues()
          const issues = layoutFindingsToIssues(findings)
          for (const issue of issues) {
            await sendToBackground({ type: 'ISSUE_CAUGHT', issue })
          }
          sendResponse({ ok: true, count: findings.length, findings })
          break
        }
        case 'A11Y_SCAN': {
          const findings = scanA11yIssues()
          const issues = a11yFindingsToIssues(findings)
          for (const issue of issues) {
            await sendToBackground({ type: 'ISSUE_CAUGHT', issue })
          }
          sendResponse({ ok: true, count: findings.length, findings })
          break
        }
        case 'STORAGE_DUMP': {
          sendResponse({ ok: true, ...dumpPageStorage() })
          break
        }
        case 'STORAGE_CLEAR': {
          clearPageStorage(
            message.storageArea === 'local'
              ? 'local'
              : message.storageArea === 'session'
                ? 'session'
                : 'both',
          )
          sendResponse({ ok: true })
          break
        }
        case 'STORAGE_SET': {
          const ok = setPageStorage(
            message.storageArea === 'session' ? 'session' : 'local',
            message.storageKey ?? '',
            message.storageValue ?? '',
          )
          sendResponse({ ok })
          break
        }
        case 'RUN_SCENARIO': {
          const storageNow = await getStorage()
          const scenario = (storageNow.scenarios ?? []).find(
            (s) => s.id === message.scenarioId,
          )
          if (!scenario) {
            sendResponse({ ok: false, error: 'scenario not found' })
            break
          }
          const result = await runScenario(scenario)
          sendResponse({ ...result })
          break
        }
        case 'GET_FIELD_CONTEXT': {
          const el = getActiveEditable()
          if (el) {
            const ctx = describeField(el)!
            ctx.selector = buildSelector(el)
            sendResponse({ fieldContext: ctx })
          } else {
            sendResponse({ fieldContext: null })
          }
          break
        }
        case 'PING':
          sendResponse({ ok: true, enabled: isLive() })
          break
        default:
          sendResponse({ ok: false })
      }
    })()
    return true
  })
}

void boot()
