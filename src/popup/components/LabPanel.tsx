import { useState } from 'react'
import type { MockSettings, TimelineSession, KatchSettings } from '../../shared/types'
import { NetworkPanel } from './NetworkPanel'
import { TimelinePanel } from './TimelinePanel'
import { CoveragePanel } from './CoveragePanel'
import {
  InspectLabPanel,
  StorageLabPanel,
  ScenarioLabPanel,
} from './InspectPanels'

type LabTab = 'network' | 'timeline' | 'coverage' | 'inspect' | 'storage' | 'scenarios'

export function LabPanel({
  mock,
  timelines,
  settings,
  onMockChange,
  onReplay,
  onNewTimeline,
  onCoverageToggle,
  coverageSummary,
  onRefreshCoverage,
  onFlash,
}: {
  mock: MockSettings
  timelines: TimelineSession[]
  settings: KatchSettings
  onMockChange: (m: MockSettings) => void
  onReplay: (sessionId: string) => void
  onNewTimeline: () => void
  onCoverageToggle: (enabled: boolean) => void
  coverageSummary: { total: number; tested: number; caught: number } | null
  onRefreshCoverage: () => void
  onFlash: (msg: string) => void
}) {
  const [labTab, setLabTab] = useState<LabTab>('network')
  const tabs: LabTab[] = ['network', 'timeline', 'coverage', 'inspect', 'storage', 'scenarios']

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap border-b border-katch-border">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setLabTab(id)}
            className={`px-2 py-2 text-[10px] font-medium capitalize ${
              labTab === id
                ? 'text-katch-signal border-b-2 border-katch-signal'
                : 'text-katch-muted'
            }`}
          >
            {id}
          </button>
        ))}
      </div>
      {labTab === 'network' && <NetworkPanel mock={mock} onChange={onMockChange} />}
      {labTab === 'timeline' && (
        <TimelinePanel
          timelines={timelines}
          onReplay={onReplay}
          onNewTimeline={onNewTimeline}
        />
      )}
      {labTab === 'coverage' && (
        <CoveragePanel
          enabled={settings.coverageOverlayEnabled}
          summary={coverageSummary}
          onToggle={onCoverageToggle}
          onRefresh={onRefreshCoverage}
        />
      )}
      {labTab === 'inspect' && <InspectLabPanel onFlash={onFlash} />}
      {labTab === 'storage' && <StorageLabPanel onFlash={onFlash} />}
      {labTab === 'scenarios' && <ScenarioLabPanel onFlash={onFlash} />}
    </div>
  )
}
