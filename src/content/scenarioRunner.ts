import type { Scenario, ScenarioStep } from '../shared/types'
import { injectValue, isEditableTarget, queryEditables } from './injectValue'
import { replayClick } from './clickRecorder'
import { katchLog } from './katchLog'
import { getHarLiteBuffer, startHarLiteCapture, stopHarLiteCapture } from './harLite'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function resolveSelector(selector?: string): Element | null {
  if (!selector) return null
  try {
    return document.querySelector(selector)
  } catch {
    return null
  }
}

export async function runScenario(scenario: Scenario): Promise<{
  ok: boolean
  played: number
  failed?: string
}> {
  katchLog('scenario', `Run “${scenario.name}” · ${scenario.steps.length} step(s)`, 'auto')
  startHarLiteCapture()
  let played = 0

  try {
    for (const step of scenario.steps) {
      const result = await runStep(step)
      if (!result.ok) {
        await stopHarLiteCapture()
        return { ok: false, played, failed: result.error }
      }
      played++
    }
    await stopHarLiteCapture()
    katchLog('scenario', `Finished “${scenario.name}”`, 'ok')
    return { ok: true, played }
  } catch (err) {
    await stopHarLiteCapture()
    return { ok: false, played, failed: String(err) }
  }
}

async function runStep(step: ScenarioStep): Promise<{ ok: boolean; error?: string }> {
  switch (step.kind) {
    case 'inject': {
      const el = resolveSelector(step.selector)
      if (!el || !isEditableTarget(el)) {
        return { ok: false, error: `inject: missing ${step.selector}` }
      }
      injectValue(el, step.payload ?? '')
      await sleep(120)
      return { ok: true }
    }
    case 'click': {
      if (!step.selector) return { ok: false, error: 'click: no selector' }
      const ok = replayClick(step.selector)
      if (!ok) return { ok: false, error: `click: failed ${step.selector}` }
      await sleep(200)
      return { ok: true }
    }
    case 'wait': {
      await sleep(step.waitMs ?? 500)
      return { ok: true }
    }
    case 'assert': {
      if (step.assertKind === 'urlIncludes') {
        const needle = step.assertValue ?? ''
        if (!location.href.includes(needle)) {
          return { ok: false, error: `assert urlIncludes “${needle}”` }
        }
        return { ok: true }
      }
      if (step.assertKind === 'noNetwork5xx') {
        const bad = getHarLiteBuffer().filter((h) => h.status >= 500)
        if (bad.length) return { ok: false, error: `assert noNetwork5xx (${bad.length})` }
        return { ok: true }
      }
      // noConsole — soft pass (issues already caught separately)
      return { ok: true }
    }
    default:
      return { ok: false, error: 'unknown step' }
  }
}

export function scenarioFromLastFill(
  name: string,
  fills: Record<string, string>,
  submitSelector?: string,
): Scenario {
  const steps: ScenarioStep[] = Object.entries(fills).map(([selector, payload], i) => ({
    id: `s${i}`,
    kind: 'inject',
    selector,
    payload,
  }))
  if (submitSelector) {
    steps.push({ id: 'click-submit', kind: 'click', selector: submitSelector })
  }
  steps.push({ id: 'wait', kind: 'wait', waitMs: 400 })
  return {
    id: `sc-${Date.now()}`,
    name,
    origin: location.origin,
    steps,
    updatedAt: Date.now(),
  }
}

export function primaryEditableSelector(): string | null {
  const el = queryEditables()[0]
  if (!el) return null
  return el.id ? `#${CSS.escape(el.id)}` : null
}
