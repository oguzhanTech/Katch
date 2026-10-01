import { create } from 'zustand'
import type {
  CaughtIssue,
  CustomPayload,
  KatchSettings,
  MockSettings,
  TimelineSession,
} from './types'
import { DEFAULT_MOCK, DEFAULT_SETTINGS } from './storage'

interface KatchStore {
  settings: KatchSettings
  mock: MockSettings
  history: CaughtIssue[]
  customPayloads: CustomPayload[]
  timelines: TimelineSession[]
  loaded: boolean
  setSettings: (settings: KatchSettings) => void
  setMock: (mock: MockSettings) => void
  setHistory: (history: CaughtIssue[]) => void
  setCustomPayloads: (payloads: CustomPayload[]) => void
  setTimelines: (timelines: TimelineSession[]) => void
  setLoaded: (loaded: boolean) => void
}

export const useKatchStore = create<KatchStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  mock: DEFAULT_MOCK,
  history: [],
  customPayloads: [],
  timelines: [],
  loaded: false,
  setSettings: (settings) => set({ settings }),
  setMock: (mock) => set({ mock }),
  setHistory: (history) => set({ history }),
  setCustomPayloads: (customPayloads) => set({ customPayloads }),
  setTimelines: (timelines) => set({ timelines }),
  setLoaded: (loaded) => set({ loaded }),
}))
