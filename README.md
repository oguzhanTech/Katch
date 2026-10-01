# Katch! - Smart QA & Testing Chrome Extension

Katch! is a modern Chrome Extension (Manifest V3) for QA Engineers — edge-case payloads, issue catch with screenshots, network mocking, timeline replay, coverage heatmap, form auto-run, layout/a11y inspectors, and CI scenario export.

**v1.4** — Signal Desk side panel, assertion lite, HAR-lite, export packs, Layout Inspector, Storage Manager, scenarios.

---

## Local Development & Build Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm
- Google Chrome Browser

### 1. Installation

```bash
npm install
```

### 2. Build the Extension

```bash
npm run build
# or live: npm run dev
```

---

## How to Load in Chrome

1. `chrome://extensions/` → Developer mode
2. **Load unpacked** → select `dist/`
3. Refresh the extension after rebuilds, then refresh the test page

---

## Core — Payloads & Catch

- Right-click input → **Katch! Tools**
- Floating **K** → **Smart · {role}** payloads
- Popup **Stress Fill All Inputs**
- Toast **Issue Caught!** → copy report (console noise filtered)
- Optional **screenshot + DOM snippet** on catch (Settings)

---

## Network Mock

**Lab → Network**: enable mock, status, latency, URL match → refresh page → trigger fetch/XHR.

---

## Timeline / Replay & Coverage

- **Lab → Timeline**: sessions, Replay (inject + click)
- **Lab → Coverage**: page overlay for untested / tested / caught

---

## Form automation

Floating **K** menu + **Home**:

1. **Auto-fill** — fills forms with smart payloads (no submit)
2. **Auto-run (+ submit)** — combinations + Login/Submit; teach-submit if needed; resumes across reload
3. **Rate limit test** — flood endpoint; PASS on 429 / throttle
4. **Run summary** — end-of-run score (assertion lite), HAR-lite network log, export MD/JSON

Progress chip: `AUTO 3/N · email` + **Stop** (or Esc)

- **Run depth**: `1` / `½` / `All` (Home slider + Settings); remembered per site profile
- Site profiles store taught submit + preferred depth per origin
- Catches during Auto-run include timeline + automation block in the report

**Warning:** Auto-run clicks real submit buttons. Use only on apps you are allowed to stress-test (lockout / rate-limit risk).

---

## Lab — Inspectors & Scenarios

- **Inspect**: Layout Inspector (overflow, zero hit, overlay) · A11y quick scan
- **Storage**: localStorage / sessionStorage / cookies — view, edit, clear
- **Scenarios**: build fill → click → wait → assert; export Playwright / Cypress sketch; import/export share pack

---

## Signal Desk (Side Panel)

Home → **Open Signal Desk** keeps Lab / Catches open beside the page while you test.

---

## Popup tabs

`Home | Payloads | Lab | Catches | Settings`  
Lab: `Network | Timeline | Coverage | Inspect | Storage | Scenarios`

## Shortcut

`Ctrl/Cmd + Shift + K`

## Notes

- Authorized testing only
- Captcha / MFA / OAuth not automated
- English UI throughout (teach-submit, summaries, settings)
- **Store beta:** all catch data and screenshots stay local (`chrome.storage.local`); see [PRIVACY.md](PRIVACY.md)
- Listing copy: [STORE_LISTING.md](STORE_LISTING.md) · permissions: [docs/PERMISSIONS.md](docs/PERMISSIONS.md)
