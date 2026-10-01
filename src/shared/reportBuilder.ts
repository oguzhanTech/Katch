import type { CaughtIssue, KatchStorage, TimelineEvent, TimelineSession } from './types'

export function buildMarkdownReport(
  issue: CaughtIssue,
  timeline?: TimelineSession | null,
  automation?: KatchStorage['lastAutomation'],
): string {
  const when = new Date(issue.timestamp).toISOString()
  const attrs = issue.fieldContext
    ? [
        `type=${issue.fieldContext.type}`,
        issue.fieldContext.maxlength != null
          ? `maxlength=${issue.fieldContext.maxlength}`
          : null,
        issue.fieldContext.min != null ? `min=${issue.fieldContext.min}` : null,
        issue.fieldContext.max != null ? `max=${issue.fieldContext.max}` : null,
        issue.fieldContext.pattern ? `pattern=${issue.fieldContext.pattern}` : null,
        issue.fieldContext.required ? 'required' : null,
      ]
        .filter(Boolean)
        .join(', ')
    : 'n/a'

  let timelineSection = ''
  if (timeline && timeline.events.length > 0) {
    timelineSection = `

### Timeline
${formatTimelineMarkdown(timeline.events)}
`
  }

  let automationSection = ''
  if (automation && Date.now() - automation.at < 15 * 60 * 1000) {
    automationSection = `

### Automation
- Mode: ${automation.mode}
- Runs: ${automation.runs}
- Primary role: ${automation.primaryRole ?? 'n/a'}
- Submit: \`${automation.submitSelector ?? 'none'}\`
`
  }

  return `## Bug Report — Katch!

**Summary:** ${issue.kind.toUpperCase()} issue caught after QA payload injection

| Field | Value |
| --- | --- |
| URL | ${issue.url} |
| Timestamp | ${when} |
| Kind | ${issue.kind} |
| Status | ${issue.statusCode ?? 'n/a'} |
| Selector | \`${issue.selector ?? 'n/a'}\` |
| Element attrs | ${attrs} |
| Payload | \`${escapeTicks(issue.payload ?? 'n/a')}\` |

### Error / Log
\`\`\`
${issue.message}
${issue.details ? `\n${issue.details}` : ''}
\`\`\`
${timelineSection}${automationSection}
### Environment
- User-Agent: ${issue.userAgent}
- Caught by: Katch! Chrome Extension

### Steps to Reproduce
1. Navigate to ${issue.url}
2. Focus element \`${issue.selector ?? '(unknown)'}\`
3. Inject payload: \`${escapeTicks(issue.payload ?? '')}\`
4. Observe ${issue.kind} failure

### Expected
No uncaught errors / successful response.

### Actual
${issue.message}
`
}

export function buildJiraReport(issue: CaughtIssue): string {
  const when = new Date(issue.timestamp).toISOString()
  return `h2. Bug Report — Katch!

*Summary:* ${issue.kind.toUpperCase()} issue caught after QA payload injection

||Field||Value||
|URL|${issue.url}|
|Timestamp|${when}|
|Kind|${issue.kind}|
|Status|${issue.statusCode ?? 'n/a'}|
|Selector|{{${issue.selector ?? 'n/a'}}}|
|Payload|{{${issue.payload ?? 'n/a'}}}|

h3. Error / Log
{code}
${issue.message}
${issue.details ?? ''}
{code}

h3. Environment
* User-Agent: ${issue.userAgent}
* Caught by: Katch! Chrome Extension

h3. Steps to Reproduce
# Navigate to ${issue.url}
# Focus element {{${issue.selector ?? '(unknown)'}}}
# Inject payload: {{${issue.payload ?? ''}}}
# Observe ${issue.kind} failure
`
}

export function buildCombinedReport(
  issue: CaughtIssue,
  timeline?: TimelineSession | null,
  automation?: KatchStorage['lastAutomation'],
): string {
  return `${buildMarkdownReport(issue, timeline, automation)}

---

### Jira-compatible

${buildJiraReport(issue)}
`
}

export function formatTimelineMarkdown(events: TimelineEvent[]): string {
  return events
    .map((e) => {
      const t = new Date(e.at).toISOString().slice(11, 19)
      if (e.kind === 'inject') {
        return `- \`${t}\` inject \`${e.selector}\` ← \`${escapeTicks(e.payload)}\``
      }
      if (e.kind === 'click') {
        return `- \`${t}\` click \`${e.selector}\` (${escapeTicks(e.label ?? e.tagName ?? 'button')})`
      }
      if (e.kind === 'stressFill') {
        return `- \`${t}\` stressFill (${e.count} fields)`
      }
      if (e.kind === 'catch') {
        return `- \`${t}\` catch ${e.statusCode ?? ''} — ${escapeTicks(e.message)}`
      }
      return `- \`${t}\` navigate ${e.url}`
    })
    .join('\n')
}

function escapeTicks(value: string): string {
  return value.replace(/`/g, "'")
}
