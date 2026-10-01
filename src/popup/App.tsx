import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKatchStore } from '../shared/store'
import {
  addCustomPayload,
  clearHistory,
  getStorage,
  removeCustomPayload,
  setMockSettings,
  setSettings,
  upsertSiteProfile,
} from '../shared/storage'
import { sendToActiveTab, broadcastToTabs } from '../shared/messaging'
import type { AutomationDepth, KatchSettings, MockSettings } from '../shared/types'
import {
  StressFillBtn,
  PageAutoRunBtn,
  PageAutoFillBtn,
  RateLimitBtn,
} from './components/StressFillBtn'
import { SettingsPanel } from './components/SettingsPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { PayloadManager } from './components/PayloadManager'
import { LabPanel } from './components/LabPanel'

type Tab = 'home' | 'payloads' | 'lab' | 'history' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'payloads', label: 'Payloads' },
  { id: 'lab', label: 'Lab' },
  { id: 'history', label: 'Catches' },
  { id: 'settings', label: 'Settings' },
]

export default function App({ deskMode = false }: { deskMode?: boolean }) {
  const [tab, setTab] = useState<Tab>(deskMode ? 'lab' : 'home')
  const [status, setStatus] = useState<string | null>(null)
  const [coverageSummary, setCoverageSummary] = useState<{
    total: number
    tested: number
    caught: number
  } | null>(null)

  const {
    settings,
    mock,
    history,
    customPayloads,
    timelines,
    loaded,
    setSettings: setStoreSettings,
    setMock,
    setHistory,
    setCustomPayloads,
    setTimelines,
    setLoaded,
  } = useKatchStore()

  const refreshCoverage = useCallback(async () => {
    try {
      const res = (await sendToActiveTab({ type: 'COVERAGE_SUMMARY' })) as {
        total?: number
        tested?: number
        caught?: number
      }
      if (typeof res?.total === 'number') {
        setCoverageSummary({
          total: res.total,
          tested: res.tested ?? 0,
          caught: res.caught ?? 0,
        })
      }
    } catch {
      setCoverageSummary(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const data = await getStorage()
      setStoreSettings(data.settings)
      setMock(data.mock)
      setHistory(data.history)
      setCustomPayloads(data.customPayloads)
      setTimelines(data.timelines)
      setLoaded(true)
    })()

    const onChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== 'local') return
      if (changes.history) setHistory(changes.history.newValue ?? [])
      if (changes.settings) setStoreSettings(changes.settings.newValue)
      if (changes.mock) setMock(changes.mock.newValue)
      if (changes.customPayloads)
        setCustomPayloads(changes.customPayloads.newValue ?? [])
      if (changes.timelines) setTimelines(changes.timelines.newValue ?? [])
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [
    setStoreSettings,
    setMock,
    setHistory,
    setCustomPayloads,
    setTimelines,
    setLoaded,
  ])

  useEffect(() => {
    if (tab === 'lab') void refreshCoverage()
  }, [tab, refreshCoverage])

  const flash = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(null), 2200)
  }

  const onStressFill = async () => {
    try {
      const res = (await sendToActiveTab({ type: 'STRESS_FILL' })) as {
        count?: number
      }
      flash(`Filled ${res?.count ?? 0} fields`)
    } catch {
      flash('Open a page tab and try again')
    }
  }

  const onPageAutoFill = async () => {
    try {
      const res = (await sendToActiveTab({ type: 'AUTO_FILL_PAGE' })) as {
        forms?: number
      }
      flash(`Auto-fill ${res?.forms ?? 0} form(s)`)
    } catch {
      flash('Open a page tab and try again')
    }
  }

  const onPageAutoRun = async () => {
    try {
      const res = (await sendToActiveTab({ type: 'AUTO_RUN_PAGE' })) as {
        forms?: number
        runs?: number
        issues?: number
      }
      const issues = res?.issues ?? 0
      flash(
        issues === 0
          ? `Auto-run ${res?.forms ?? 0} form(s) · clear`
          : `Auto-run ${res?.forms ?? 0} form(s) · ${issues} issue(s)`,
      )
    } catch {
      flash('Open a page tab and try again')
    }
  }

  const onRateLimit = async () => {
    try {
      const res = (await sendToActiveTab({ type: 'RATE_LIMIT_TEST' })) as {
        passed?: boolean
        sent?: number
        status?: number
        aborted?: boolean
        error?: string
      }
      if (res?.error) {
        flash(res.error)
        return
      }
      if (res?.passed) {
        flash(`Rate limit PASS · ${res.sent ?? 0} · HTTP ${res.status ?? '?'}`)
      } else if (res?.aborted) {
        flash(`Rate limit stopped · ${res.sent ?? 0}`)
      } else {
        flash(`Rate limit FAIL · ${res.sent ?? 0} sent`)
      }
    } catch {
      flash('Open a page tab and try again')
    }
  }

  const onDepthChange = async (depth: AutomationDepth) => {
    const next = await setSettings({ automationDepth: depth })
    setStoreSettings(next)
    await broadcastToTabs({ type: 'SETTINGS_UPDATED', settings: next })
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url) {
        const origin = new URL(tab.url).origin
        if (origin.startsWith('http')) {
          await upsertSiteProfile({ origin, preferredDepth: depth })
        }
      }
    } catch {
      /* ignore */
    }
    const label = depth === 'one' ? '1 run' : depth === 'half' ? 'Half set' : 'Full set'
    flash(`Depth · ${label}`)
  }

  const onToggleExtension = async (enabled: boolean) => {
    const next = await setSettings({ extensionEnabled: enabled })
    setStoreSettings(next)
    await broadcastToTabs({ type: 'SETTINGS_UPDATED', settings: next })
    flash(enabled ? 'Katch on' : 'Katch off')
  }

  const onSettingsPatch = async (patch: Partial<KatchSettings>) => {
    const next = await setSettings(patch)
    setStoreSettings(next)
    await broadcastToTabs({ type: 'SETTINGS_UPDATED', settings: next })
    flash('Settings saved')
  }

  const onMockChange = async (next: MockSettings) => {
    const saved = await setMockSettings(next)
    setMock(saved)
    try {
      await sendToActiveTab({ type: 'MOCK_UPDATED', mock: saved })
    } catch {
      /* ignore */
    }
    flash(saved.enabled ? `Mock ${saved.statusCode} on` : 'Mock off')
  }

  const onCoverageToggle = async (enabled: boolean) => {
    const next = await setSettings({ coverageOverlayEnabled: enabled })
    setStoreSettings(next)
    await broadcastToTabs({ type: 'SETTINGS_UPDATED', settings: next })
    await broadcastToTabs({ type: 'COVERAGE_TOGGLE', coverageEnabled: enabled })
    flash(enabled ? 'Coverage on' : 'Coverage off')
    void refreshCoverage()
  }

  const openDesk = async () => {
    try {
      const [t] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (t?.windowId != null) {
        await chrome.sidePanel.open({ windowId: t.windowId })
        flash('Signal Desk open')
      }
    } catch {
      flash('Side panel unavailable')
    }
  }

  if (!loaded) {
    return (
      <div className="flex h-[520px] items-center justify-center text-sm text-katch-muted">
        Loading Katch!…
      </div>
    )
  }

  return (
    <div
      className={`relative flex flex-col bg-katch-bg ${
        deskMode ? 'min-h-screen' : 'min-h-[520px]'
      }`}
    >
      <header className="border-b border-katch-border px-4 pb-2.5 pt-3.5">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[17px] font-semibold tracking-tight text-katch-text">
            Katch<span className="text-katch-signal">!</span>
            {deskMode && (
              <span className="ml-2 text-[11px] font-normal text-katch-muted">
                Signal Desk
              </span>
            )}
          </h1>
          <span
            className={`font-mono text-[10px] ${
              settings.extensionEnabled === false
                ? 'text-katch-muted'
                : mock.enabled
                  ? 'text-katch-signal'
                  : 'text-katch-muted'
            }`}
          >
            {settings.extensionEnabled === false
              ? 'OFF'
              : mock.enabled
                ? `MOCK ${mock.statusCode}`
                : 'READY'}
          </span>
        </div>
      </header>

      <nav className="flex border-b border-katch-border px-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`relative flex-1 px-0.5 py-2.5 text-[11px] font-medium ${
              tab === id ? 'text-katch-text' : 'text-katch-muted hover:text-katch-text'
            }`}
          >
            {label}
            {tab === id && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-1 bottom-0 h-[2px] bg-katch-signal"
              />
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-4">
        {tab === 'home' && (
          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-katch border border-katch-border px-4 py-3 text-left"
              onClick={() =>
                void onToggleExtension(!(settings.extensionEnabled !== false))
              }
            >
              <div>
                <div className="text-sm font-medium text-katch-text">Katch!</div>
                <div className="text-[12px] text-katch-muted">
                  {settings.extensionEnabled !== false
                    ? 'Active on this browser'
                    : 'Paused — page tools idle'}
                </div>
              </div>
              <span
                role="switch"
                aria-checked={settings.extensionEnabled !== false}
                className={`relative h-5 w-9 shrink-0 rounded-full border ${
                  settings.extensionEnabled !== false
                    ? 'border-katch-signal/50 bg-katch-signal/30'
                    : 'border-katch-border bg-katch-bg'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3.5 w-3.5 rounded-full ${
                    settings.extensionEnabled !== false
                      ? 'left-[16px] bg-katch-signal'
                      : 'left-0.5 bg-katch-muted'
                  }`}
                />
              </span>
            </button>

            <div
              className={`space-y-3 ${
                settings.extensionEnabled === false
                  ? 'pointer-events-none opacity-40'
                  : ''
              }`}
            >
              <StressFillBtn onClick={onStressFill} />
              <PageAutoFillBtn onClick={() => void onPageAutoFill()} />
              <PageAutoRunBtn
                onClick={onPageAutoRun}
                depth={settings.automationDepth ?? 'half'}
                onDepthChange={(d) => void onDepthChange(d)}
              />
              <RateLimitBtn onClick={() => void onRateLimit()} />
              {!deskMode && (
                <button
                  type="button"
                  onClick={() => void openDesk()}
                  className="w-full rounded-katch border border-dashed border-katch-border px-4 py-2.5 text-left text-[12px] text-katch-muted hover:border-katch-signal/40 hover:text-katch-signal"
                >
                  Open Signal Desk (side panel) →
                </button>
              )}
            </div>
            <div className="space-y-1.5 border-t border-katch-border pt-3 text-[12px] text-katch-muted leading-relaxed">
              <p>
                Right-click → <span className="text-katch-text">Katch! Tools</span>
              </p>
              <p>
                Floating <span className="font-mono text-katch-signal">K</span> · Auto-fill /
                Auto-run · Rate limit
              </p>
              <p className="text-katch-signal/90">
                Authorized testing only. Auto-run and rate-limit can lock accounts.
              </p>
            </div>
            <button
              type="button"
              className="text-[11px] text-katch-muted hover:text-katch-signal"
              onClick={() => setTab('history')}
            >
              {history.length} catches →
            </button>
          </div>
        )}

        {tab === 'payloads' && (
          <PayloadManager
            customPayloads={customPayloads}
            onAdd={async (label, value) => {
              const next = await addCustomPayload({
                id: `custom-${Date.now()}`,
                label,
                value,
                category: 'custom',
              })
              setCustomPayloads(next)
              flash('Saved')
            }}
            onRemove={async (id) => {
              setCustomPayloads(await removeCustomPayload(id))
            }}
            onInject={async (value) => {
              try {
                await sendToActiveTab({ type: 'INJECT_PAYLOAD', payload: value })
                flash('Injected')
              } catch {
                flash('Focus a page input first')
              }
            }}
          />
        )}

        {tab === 'lab' && (
          <LabPanel
            mock={mock}
            timelines={timelines}
            settings={settings}
            onMockChange={onMockChange}
            onReplay={async (sessionId) => {
              try {
                const res = (await sendToActiveTab({
                  type: 'REPLAY_SESSION',
                  sessionId,
                })) as { played?: number; skipped?: number }
                flash(`Replay ${res.played ?? 0} · skip ${res.skipped ?? 0}`)
              } catch {
                flash('Open the page tab first')
              }
            }}
            onNewTimeline={async () => {
              try {
                await sendToActiveTab({ type: 'NEW_TIMELINE' })
                const data = await getStorage()
                setTimelines(data.timelines)
                flash('New session')
              } catch {
                flash('Open a page tab first')
              }
            }}
            onCoverageToggle={onCoverageToggle}
            coverageSummary={coverageSummary}
            onRefreshCoverage={() => void refreshCoverage()}
            onFlash={flash}
          />
        )}

        {tab === 'history' && (
          <HistoryPanel
            history={history}
            timelines={timelines}
            onClear={async () => {
              await clearHistory()
              setHistory([])
              flash('Cleared')
            }}
            onFlash={flash}
          />
        )}

        {tab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onChange={(patch) => void onSettingsPatch(patch)}
            onDepthChange={(d) => void onDepthChange(d)}
          />
        )}
      </main>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-katch border border-katch-border bg-katch-surface px-3 py-1.5 text-[11px] text-katch-signal"
          >
            {status}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
