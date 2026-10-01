import type {
  CaughtIssue,
  CustomPayload,
  FieldContext,
  KatchSettings,
  KatchStorage,
  MockSettings,
  TimelineEvent,
  TimelineEventInput,
  TimelineSession,
  CoveragePageState,
  CoverageFieldState,
  FormMap,
  PendingAutomation,
  SiteProfile,
  Scenario,
  HarLiteEntry,
  AssertionResult,
} from './types'

export const DEFAULT_SETTINGS: KatchSettings = {
  extensionEnabled: true,
  floatingBadgeEnabled: true,
  toastEnabled: true,
  coverageOverlayEnabled: false,
  automationDepth: 'half',
  devLogPanelEnabled: true,
  runSummaryEnabled: true,
  screenshotOnCatch: true,
  consoleNoiseFilter: true,
  attributionWindowMs: 20_000,
  assertionLiteEnabled: true,
  harLiteEnabled: true,
}

export const DEFAULT_MOCK: MockSettings = {
  enabled: false,
  statusCode: 500,
  latencyMs: 0,
  urlMatch: '*',
}

export const DEFAULT_STORAGE: KatchStorage = {
  settings: DEFAULT_SETTINGS,
  mock: DEFAULT_MOCK,
  history: [],
  customPayloads: [],
  timelines: [],
  coverageByPage: {},
  formMaps: {},
}

const MAX_HISTORY = 50
const MAX_TIMELINES = 20
const MAX_EVENTS = 50
const IDLE_MS = 5 * 60 * 1000

export async function getStorage(): Promise<KatchStorage> {
  const result = await chrome.storage.local.get([
    'settings',
    'mock',
    'history',
    'customPayloads',
    'timelines',
    'activeTimelineId',
    'coverageByPage',
    'formMaps',
    'lastPayload',
    'lastSelector',
    'lastFieldContext',
    'lastAutomation',
    'pendingAutomation',
    'siteProfiles',
    'scenarios',
    'lastHarLite',
    'lastAssertions',
  ])

  return {
    settings: (() => {
      const merged = {
        ...DEFAULT_SETTINGS,
        ...(result.settings as KatchSettings | undefined),
      }
      // Drop deprecated max-runs; automationDepth is the source of truth
      delete merged.automationMaxRuns
      return merged
    })(),
    mock: { ...DEFAULT_MOCK, ...(result.mock as MockSettings | undefined) },
    history: (result.history as CaughtIssue[] | undefined) ?? [],
    customPayloads: (result.customPayloads as CustomPayload[] | undefined) ?? [],
    timelines: (result.timelines as TimelineSession[] | undefined) ?? [],
    activeTimelineId: result.activeTimelineId as string | undefined,
    coverageByPage:
      (result.coverageByPage as Record<string, CoveragePageState> | undefined) ?? {},
    formMaps: (result.formMaps as Record<string, FormMap> | undefined) ?? {},
    lastPayload: result.lastPayload as string | undefined,
    lastSelector: result.lastSelector as string | undefined,
    lastFieldContext: result.lastFieldContext as FieldContext | undefined,
    lastAutomation: result.lastAutomation as KatchStorage['lastAutomation'],
    pendingAutomation: result.pendingAutomation as PendingAutomation | undefined,
    siteProfiles: (result.siteProfiles as Record<string, SiteProfile> | undefined) ?? {},
    scenarios: (result.scenarios as Scenario[] | undefined) ?? [],
    lastHarLite: (result.lastHarLite as HarLiteEntry[] | undefined) ?? [],
    lastAssertions: (result.lastAssertions as AssertionResult[] | undefined) ?? [],
  }
}

export async function setSettings(settings: Partial<KatchSettings>): Promise<KatchSettings> {
  const current = await getStorage()
  const next = { ...current.settings, ...settings }
  await chrome.storage.local.set({ settings: next })
  return next
}

export async function setMockSettings(mock: Partial<MockSettings>): Promise<MockSettings> {
  const current = await getStorage()
  const next = { ...current.mock, ...mock }
  await chrome.storage.local.set({ mock: next })
  return next
}

export async function addIssue(issue: CaughtIssue): Promise<CaughtIssue[]> {
  const current = await getStorage()
  const history = [issue, ...current.history].slice(0, MAX_HISTORY)
  await chrome.storage.local.set({ history })
  return history
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ history: [] })
}

export async function setLastAction(data: {
  payload?: string
  selector?: string
  fieldContext?: FieldContext
}): Promise<void> {
  await chrome.storage.local.set({
    lastPayload: data.payload,
    lastSelector: data.selector,
    lastFieldContext: data.fieldContext,
  })
}

export async function setCustomPayloads(payloads: CustomPayload[]): Promise<void> {
  await chrome.storage.local.set({ customPayloads: payloads })
}

export async function addCustomPayload(payload: CustomPayload): Promise<CustomPayload[]> {
  const current = await getStorage()
  const customPayloads = [...current.customPayloads, payload]
  await chrome.storage.local.set({ customPayloads })
  return customPayloads
}

export async function removeCustomPayload(id: string): Promise<CustomPayload[]> {
  const current = await getStorage()
  const customPayloads = current.customPayloads.filter((p) => p.id !== id)
  await chrome.storage.local.set({ customPayloads })
  return customPayloads
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function ensureActiveTimeline(url: string): Promise<TimelineSession> {
  const current = await getStorage()
  const active = current.timelines.find((t) => t.id === current.activeTimelineId)
  const lastEventAt = active?.events[active.events.length - 1]?.at ?? active?.startedAt
  const idle = lastEventAt != null && Date.now() - lastEventAt > IDLE_MS

  if (active && !idle) {
    return active
  }

  const session: TimelineSession = {
    id: newId(),
    startedAt: Date.now(),
    url,
    title: new URL(url).hostname,
    events: [
      {
        id: newId(),
        at: Date.now(),
        kind: 'navigate',
        url,
      },
    ],
  }
  const timelines = [session, ...current.timelines].slice(0, MAX_TIMELINES)
  await chrome.storage.local.set({ timelines, activeTimelineId: session.id })
  return session
}

export async function startNewTimeline(url: string): Promise<TimelineSession> {
  const current = await getStorage()
  const session: TimelineSession = {
    id: newId(),
    startedAt: Date.now(),
    url,
    title: (() => {
      try {
        return new URL(url).hostname
      } catch {
        return url
      }
    })(),
    events: [{ id: newId(), at: Date.now(), kind: 'navigate', url }],
  }
  const timelines = [session, ...current.timelines].slice(0, MAX_TIMELINES)
  await chrome.storage.local.set({ timelines, activeTimelineId: session.id })
  return session
}

export async function appendTimelineEvent(
  url: string,
  event: TimelineEventInput,
): Promise<TimelineSession> {
  const session = await ensureActiveTimeline(url)
  const current = await getStorage()
  const full = {
    ...event,
    id: newId(),
    at: Date.now(),
  } as TimelineEvent

  const timelines = current.timelines.map((t) => {
    if (t.id !== session.id) return t
    return {
      ...t,
      events: [...t.events, full].slice(-MAX_EVENTS),
    }
  })
  await chrome.storage.local.set({ timelines })
  return timelines.find((t) => t.id === session.id)!
}

export async function getTimelines(): Promise<TimelineSession[]> {
  const s = await getStorage()
  return s.timelines
}

export async function updateCoverageField(
  pageKey: string,
  selector: string,
  patch: Partial<CoverageFieldState>,
): Promise<CoveragePageState> {
  const current = await getStorage()
  const page = current.coverageByPage[pageKey] ?? {
    pageKey,
    fields: {},
    updatedAt: Date.now(),
  }
  const prev = page.fields[selector] ?? {
    selector,
    injected: false,
    caught: false,
  }
  page.fields[selector] = { ...prev, ...patch, selector }
  page.updatedAt = Date.now()
  const coverageByPage = { ...current.coverageByPage, [pageKey]: page }
  await chrome.storage.local.set({ coverageByPage })
  return page
}

export async function getCoveragePage(pageKey: string): Promise<CoveragePageState | null> {
  const s = await getStorage()
  return s.coverageByPage[pageKey] ?? null
}

export async function saveFormMap(map: FormMap): Promise<void> {
  const current = await getStorage()
  const formMaps = { ...current.formMaps, [map.pageKey]: map }
  await chrome.storage.local.set({ formMaps })
}

export async function getCachedFormMap(pageKey: string): Promise<FormMap | null> {
  const s = await getStorage()
  return s.formMaps[pageKey] ?? null
}

export async function setLastAutomation(
  data: NonNullable<KatchStorage['lastAutomation']>,
): Promise<void> {
  await chrome.storage.local.set({ lastAutomation: data })
}

export async function savePendingAutomation(
  pending: PendingAutomation,
): Promise<void> {
  await chrome.storage.local.set({ pendingAutomation: pending })
}

export async function getPendingAutomation(): Promise<PendingAutomation | null> {
  const s = await getStorage()
  return s.pendingAutomation ?? null
}

export async function clearPendingAutomation(): Promise<void> {
  await chrome.storage.local.remove('pendingAutomation')
}

export async function upsertSiteProfile(
  patch: Omit<SiteProfile, 'updatedAt'> & { updatedAt?: number },
): Promise<SiteProfile> {
  const current = await getStorage()
  const prev = current.siteProfiles?.[patch.origin]
  const next: SiteProfile = {
    ...prev,
    ...patch,
    updatedAt: Date.now(),
  }
  const siteProfiles = { ...(current.siteProfiles ?? {}), [patch.origin]: next }
  await chrome.storage.local.set({ siteProfiles })
  return next
}

export async function getSiteProfile(origin: string): Promise<SiteProfile | null> {
  const s = await getStorage()
  return s.siteProfiles?.[origin] ?? null
}

export async function saveScenarios(scenarios: Scenario[]): Promise<void> {
  await chrome.storage.local.set({ scenarios })
}

export async function upsertScenario(scenario: Scenario): Promise<Scenario[]> {
  const current = await getStorage()
  const list = [...(current.scenarios ?? [])]
  const idx = list.findIndex((s) => s.id === scenario.id)
  if (idx >= 0) list[idx] = scenario
  else list.unshift(scenario)
  const next = list.slice(0, 30)
  await chrome.storage.local.set({ scenarios: next })
  return next
}

export async function removeScenario(id: string): Promise<Scenario[]> {
  const current = await getStorage()
  const next = (current.scenarios ?? []).filter((s) => s.id !== id)
  await chrome.storage.local.set({ scenarios: next })
  return next
}

export async function setLastHarLite(entries: HarLiteEntry[]): Promise<void> {
  await chrome.storage.local.set({ lastHarLite: entries.slice(-200) })
}

export async function setLastAssertions(results: AssertionResult[]): Promise<void> {
  await chrome.storage.local.set({ lastAssertions: results })
}
