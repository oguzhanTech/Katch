export type PayloadCategory =
  | 'sqli'
  | 'xss'
  | 'boundary'
  | 'longStrings'
  | 'unicodeEmoji'
  | 'formatViolators'
  | 'email'
  | 'specialChars'
  | 'pathTraversal'
  | 'encoding'
  | 'whitespace'
  | 'nosql'
  | 'custom'

export interface PayloadItem {
  id: string
  label: string
  value: string
  category: PayloadCategory
  description?: string
  featured?: boolean
}

export interface FieldContext {
  tagName: string
  type: string
  name: string
  id: string
  placeholder: string
  required: boolean
  maxlength: number | null
  min: string | null
  max: string | null
  pattern: string | null
  selector: string
}

export interface CaughtIssue {
  id: string
  timestamp: number
  url: string
  kind: 'js' | 'console' | 'network' | 'unhandled' | 'a11y' | 'layout'
  message: string
  details?: string
  statusCode?: number
  payload?: string
  selector?: string
  fieldContext?: FieldContext
  userAgent: string
  timelineSessionId?: string
  /** data:image/png;base64,... captured at catch time */
  screenshotDataUrl?: string
  /** Snippet of focused / related DOM */
  domSnippet?: string
}

export type AutomationDepth = 'one' | 'half' | 'all'

export interface KatchSettings {
  /** Master kill switch — default on */
  extensionEnabled: boolean
  floatingBadgeEnabled: boolean
  toastEnabled: boolean
  coverageOverlayEnabled: boolean
  /** @deprecated prefer automationDepth — ignored at runtime; kept optional for old storage */
  automationMaxRuns?: number
  /** one = 1 combo · half = ~50% of smart payloads · all = full set */
  automationDepth: AutomationDepth
  /** Floating on-page log panel (dev) */
  devLogPanelEnabled: boolean
  /** End-of-run summary panel with issue list */
  runSummaryEnabled: boolean
  /** Capture viewport screenshot when an issue is caught */
  screenshotOnCatch: boolean
  /** Filter common console noise (ResizeObserver, extension URLs, …) */
  consoleNoiseFilter: boolean
  /** ms after last Katch action to attribute JS/console catches */
  attributionWindowMs: number
  /** Run lightweight assertion scoring after auto-run */
  assertionLiteEnabled: boolean
  /** Capture HAR-lite network log during auto-run */
  harLiteEnabled: boolean
}

export interface SiteProfile {
  origin: string
  taughtSubmit?: { selector: string; label: string }
  preferredDepth?: AutomationDepth
  formMapPageKey?: string
  updatedAt: number
}

export interface HarLiteEntry {
  at: number
  method: string
  url: string
  status: number
  durationMs: number
}

export interface AssertionResult {
  id: string
  label: string
  passed: boolean
  detail?: string
}

export interface ScenarioStep {
  id: string
  kind: 'inject' | 'click' | 'wait' | 'assert'
  selector?: string
  payload?: string
  waitMs?: number
  assertKind?: 'noConsole' | 'noNetwork5xx' | 'urlIncludes'
  assertValue?: string
}

export interface Scenario {
  id: string
  name: string
  origin?: string
  steps: ScenarioStep[]
  updatedAt: number
}

export interface MockSettings {
  enabled: boolean
  statusCode: number
  latencyMs: number
  urlMatch: string
}

export interface CustomPayload {
  id: string
  label: string
  value: string
  category: PayloadCategory
}

export type TimelineEventInput =
  | {
      kind: 'inject'
      selector: string
      payload: string
      fieldRole?: string
    }
  | {
      kind: 'stressFill'
      count: number
    }
  | {
      kind: 'click'
      selector: string
      label?: string
      tagName?: string
    }
  | {
      kind: 'catch'
      issueId: string
      message: string
      statusCode?: number
      selector?: string
    }
  | {
      kind: 'navigate'
      url: string
    }

export type TimelineEvent = TimelineEventInput & {
  id: string
  at: number
}

export interface TimelineSession {
  id: string
  startedAt: number
  url: string
  title?: string
  events: TimelineEvent[]
}

export interface CoverageFieldState {
  selector: string
  injected: boolean
  caught: boolean
  lastPayload?: string
}

export interface CoveragePageState {
  pageKey: string
  fields: Record<string, CoverageFieldState>
  updatedAt: number
}

export interface FormMapField {
  selector: string
  role: string
}

export interface FormMap {
  pageKey: string
  rootSelector: string
  fields: FormMapField[]
  submitSelector?: string
  submitLabel?: string
  /** Ranked alternate click targets (class/id contains button, nearby CTAs, …) */
  submitCandidates?: string[]
  scannedAt: number
}

export interface PendingAutomation {
  id: string
  at: number
  startedAt: number
  mode: 'fill' | 'run'
  origin: string
  /** pathname when started (query ignored for matching) */
  matchPath: string
  map: FormMap
  runs: Record<string, string>[]
  /** Index of the next run to execute */
  nextIndex: number
  completed: number
  planned: number
  primaryRole: string
  primarySelector?: string
  taughtSubmit?: { selector: string; label: string }
  skipTeach?: boolean
  silent?: boolean
  lastSubmitSelector?: string
  lastSubmitLabel?: string
  /** Tried history.back() once when form vanished after navigation */
  backAttempted?: boolean
}

export interface KatchStorage {
  settings: KatchSettings
  mock: MockSettings
  history: CaughtIssue[]
  customPayloads: CustomPayload[]
  timelines: TimelineSession[]
  activeTimelineId?: string
  coverageByPage: Record<string, CoveragePageState>
  formMaps: Record<string, FormMap>
  lastPayload?: string
  lastSelector?: string
  lastFieldContext?: FieldContext
  lastAutomation?: {
    runs: number
    mode: 'fill' | 'run'
    primaryRole?: string
    submitSelector?: string
    at: number
  }
  pendingAutomation?: PendingAutomation
  siteProfiles?: Record<string, SiteProfile>
  scenarios?: Scenario[]
  lastHarLite?: HarLiteEntry[]
  lastAssertions?: AssertionResult[]
}

export type MessageType =
  | 'INJECT_PAYLOAD'
  | 'STRESS_FILL'
  | 'ISSUE_CAUGHT'
  | 'NETWORK_ISSUE'
  | 'GET_FIELD_CONTEXT'
  | 'FIELD_CONTEXT'
  | 'SETTINGS_UPDATED'
  | 'MOCK_UPDATED'
  | 'TRACK_ACTION'
  | 'TIMELINE_EVENT'
  | 'REPLAY_SESSION'
  | 'COVERAGE_TOGGLE'
  | 'COVERAGE_SUMMARY'
  | 'NEW_TIMELINE'
  | 'AUTO_FILL_PAGE'
  | 'AUTO_RUN_PAGE'
  | 'RATE_LIMIT_TEST'
  | 'CAPTURE_SCREENSHOT'
  | 'LAYOUT_SCAN'
  | 'A11Y_SCAN'
  | 'STORAGE_DUMP'
  | 'STORAGE_CLEAR'
  | 'STORAGE_SET'
  | 'RUN_SCENARIO'
  | 'PING'

export interface KatchMessage {
  type: MessageType
  payload?: string
  selector?: string
  category?: PayloadCategory
  issue?: CaughtIssue
  settings?: KatchSettings
  mock?: MockSettings
  fieldContext?: FieldContext
  timelineEvent?: TimelineEvent
  sessionId?: string
  coverageEnabled?: boolean
  fieldRole?: string
  scenarioId?: string
  storageArea?: 'local' | 'session'
  storageKey?: string
  storageValue?: string
}
