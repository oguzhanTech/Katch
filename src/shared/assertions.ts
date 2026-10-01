import type { AssertionResult, CaughtIssue, HarLiteEntry } from './types'

export function runAssertionLite(opts: {
  issues: CaughtIssue[]
  har: HarLiteEntry[]
  completed: number
  planned: number
  aborted: boolean
}): AssertionResult[] {
  const { issues, har, completed, planned, aborted } = opts
  const network5xx = issues.filter(
    (i) => i.kind === 'network' && (i.statusCode ?? 0) >= 500,
  )
  const consoleErrs = issues.filter((i) => i.kind === 'console' || i.kind === 'js')
  const har5xx = har.filter((h) => h.status >= 500)

  return [
    {
      id: 'no-5xx',
      label: 'No HTTP 5xx',
      passed: network5xx.length === 0 && har5xx.length === 0,
      detail:
        network5xx.length || har5xx.length
          ? `${network5xx.length + har5xx.length} server error(s)`
          : 'Clear',
    },
    {
      id: 'no-console',
      label: 'No JS / console errors',
      passed: consoleErrs.length === 0,
      detail: consoleErrs.length ? `${consoleErrs.length} error(s)` : 'Clear',
    },
    {
      id: 'runs-complete',
      label: 'Runs completed',
      passed: !aborted && completed >= planned,
      detail: `${completed}/${planned}${aborted ? ' · aborted' : ''}`,
    },
    {
      id: 'rate-limit-ok',
      label: 'No unexpected 429 storm',
      passed: har.filter((h) => h.status === 429).length < 10,
      detail: `${har.filter((h) => h.status === 429).length} × 429`,
    },
  ]
}

export function assertionScore(results: AssertionResult[]): {
  passed: number
  total: number
  pct: number
} {
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  return { passed, total, pct: total ? Math.round((passed / total) * 100) : 100 }
}
