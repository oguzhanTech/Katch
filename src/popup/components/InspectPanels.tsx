import { useEffect, useState } from 'react'
import { sendToActiveTab } from '../../shared/messaging'
import {
  getStorage,
  upsertScenario,
  removeScenario,
} from '../../shared/storage'
import type { Scenario } from '../../shared/types'
import { scenarioToPlaywright, scenarioToCypress } from '../../shared/ciExport'
import { downloadTextFile } from '../../shared/exportDownload'
import {
  buildSharePack,
  downloadSharePack,
  parseSharePack,
} from '../../shared/sharePack'

export function InspectLabPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const run = async (type: 'LAYOUT_SCAN' | 'A11Y_SCAN') => {
    try {
      const res = (await sendToActiveTab({ type })) as { count?: number }
      onFlash(`${type === 'LAYOUT_SCAN' ? 'Layout' : 'A11y'}: ${res.count ?? 0} finding(s)`)
    } catch {
      onFlash('Open a page tab first')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-katch-muted leading-relaxed">
        Scan the active page for layout blockers and accessibility gaps. Findings land in Catches.
      </p>
      <button type="button" className="katch-btn-primary w-full" onClick={() => void run('LAYOUT_SCAN')}>
        Layout Inspector scan
      </button>
      <button type="button" className="katch-btn-primary w-full" onClick={() => void run('A11Y_SCAN')}>
        A11y quick scan
      </button>
    </div>
  )
}

export function StorageLabPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const [dump, setDump] = useState<{
    local: Record<string, string>
    session: Record<string, string>
    cookie: string
  } | null>(null)
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')

  const refresh = async () => {
    try {
      const res = (await sendToActiveTab({ type: 'STORAGE_DUMP' })) as {
        local?: Record<string, string>
        session?: Record<string, string>
        cookie?: string
      }
      setDump({
        local: res.local ?? {},
        session: res.session ?? {},
        cookie: res.cookie ?? '',
      })
    } catch {
      onFlash('Open a page tab first')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" className="katch-btn-ghost flex-1" onClick={() => void refresh()}>
          Refresh
        </button>
        <button
          type="button"
          className="katch-btn-ghost flex-1"
          onClick={async () => {
            await sendToActiveTab({ type: 'STORAGE_CLEAR' })
            onFlash('Storage cleared')
            void refresh()
          }}
        >
          Clear both
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="katch-input font-mono text-xs"
          placeholder="key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <input
          className="katch-input font-mono text-xs"
          placeholder="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="katch-btn-primary w-full"
        onClick={async () => {
          await sendToActiveTab({
            type: 'STORAGE_SET',
            storageArea: 'local',
            storageKey: key,
            storageValue: value,
          })
          onFlash('Saved to localStorage')
          void refresh()
        }}
      >
        Set localStorage
      </button>
      {dump && (
        <div className="max-h-40 overflow-y-auto rounded-katch border border-katch-border p-2 font-mono text-[10px] text-katch-muted">
          <div className="mb-1 text-katch-signal">local ({Object.keys(dump.local).length})</div>
          {Object.entries(dump.local)
            .slice(0, 20)
            .map(([k, v]) => (
              <div key={k} className="truncate">
                {k}={v.slice(0, 40)}
              </div>
            ))}
          <div className="mb-1 mt-2 text-katch-signal">session ({Object.keys(dump.session).length})</div>
          {Object.entries(dump.session)
            .slice(0, 12)
            .map(([k, v]) => (
              <div key={k} className="truncate">
                {k}={v.slice(0, 40)}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export function ScenarioLabPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [name, setName] = useState('My scenario')

  const refresh = async () => {
    const s = await getStorage()
    setScenarios(s.scenarios ?? [])
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-katch-muted">
        Save replayable steps and export Playwright / Cypress sketches for CI.
      </p>
      <input
        className="katch-input text-xs"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Scenario name"
      />
      <button
        type="button"
        className="katch-btn-primary w-full"
        onClick={async () => {
          const scenario: Scenario = {
            id: `sc-${Date.now()}`,
            name: name || 'Scenario',
            steps: [
              { id: '1', kind: 'wait', waitMs: 300 },
              {
                id: '2',
                kind: 'assert',
                assertKind: 'urlIncludes',
                assertValue: location?.hostname ? '' : '/',
              },
            ],
            updatedAt: Date.now(),
          }
          // Prefer a useful default assert against current origin path
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (tab?.url) {
              const u = new URL(tab.url)
              scenario.origin = u.origin
              scenario.steps[1] = {
                id: '2',
                kind: 'assert',
                assertKind: 'urlIncludes',
                assertValue: u.pathname.slice(0, 40) || '/',
              }
            }
          } catch {
            /* ignore */
          }
          setScenarios(await upsertScenario(scenario))
          onFlash('Scenario saved — edit steps later via Auto-run teach')
        }}
      >
        New scenario stub
      </button>
      <ul className="divide-y divide-katch-border rounded-katch border border-katch-border">
        {scenarios.map((sc) => (
          <li key={sc.id} className="space-y-1.5 px-3 py-2">
            <div className="text-[12px] font-medium text-katch-text">{sc.name}</div>
            <div className="font-mono text-[10px] text-katch-muted">
              {sc.steps.length} steps · {sc.origin ?? 'any'}
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="katch-btn-ghost !py-1 text-[10px]"
                onClick={async () => {
                  try {
                    const res = (await sendToActiveTab({
                      type: 'RUN_SCENARIO',
                      scenarioId: sc.id,
                    })) as { ok?: boolean; played?: number; failed?: string }
                    onFlash(
                      res.ok
                        ? `Played ${res.played}`
                        : `Failed: ${res.failed ?? 'unknown'}`,
                    )
                  } catch {
                    onFlash('Open page tab first')
                  }
                }}
              >
                Run
              </button>
              <button
                type="button"
                className="katch-btn-ghost !py-1 text-[10px]"
                onClick={() => {
                  downloadTextFile(
                    `${sc.name.replace(/\s+/g, '-')}.spec.ts`,
                    scenarioToPlaywright(sc),
                    'text/typescript',
                  )
                  onFlash('Playwright export')
                }}
              >
                PW
              </button>
              <button
                type="button"
                className="katch-btn-ghost !py-1 text-[10px]"
                onClick={() => {
                  downloadTextFile(
                    `${sc.name.replace(/\s+/g, '-')}.cy.js`,
                    scenarioToCypress(sc),
                    'text/javascript',
                  )
                  onFlash('Cypress export')
                }}
              >
                Cy
              </button>
              <button
                type="button"
                className="katch-btn-ghost !py-1 text-[10px]"
                onClick={async () => {
                  setScenarios(await removeScenario(sc.id))
                }}
              >
                Del
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="katch-btn-ghost w-full text-[11px]"
        onClick={async () => {
          const s = await getStorage()
          downloadSharePack(
            buildSharePack({
              label: 'Katch share pack',
              issues: s.history.slice(0, 20),
              scenarios: s.scenarios,
              timelines: s.timelines.slice(0, 5),
              lastAutomation: s.lastAutomation,
            }),
          )
          onFlash('Share pack downloaded')
        }}
      >
        Export share pack (JSON)
      </button>
      <label className="katch-btn-ghost flex w-full cursor-pointer justify-center text-[11px]">
        Import share pack
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const text = await file.text()
            const pack = parseSharePack(text)
            if (!pack) {
              onFlash('Invalid share pack')
              return
            }
            if (pack.scenarios?.length) {
              for (const sc of pack.scenarios) await upsertScenario(sc)
            }
            await refresh()
            onFlash(`Imported · ${pack.scenarios?.length ?? 0} scenario(s)`)
          }}
        />
      </label>
    </div>
  )
}
