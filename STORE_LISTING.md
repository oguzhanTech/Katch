# Chrome Web Store — Listing copy (Katch!)

Paste into the Developer Dashboard. Host `PRIVACY.md` publicly and paste its URL into the Privacy fields.

**Category:** Developer Tools  
**Language:** English  
**Version:** 1.4.1 (public beta)

---

## Single purpose

Help QA engineers inject edge-case payloads into web forms and catch related page errors (JS, console, network) during authorized testing.

---

## Short description (≤132 characters)

Smart QA toolkit: inject edge-case payloads, catch JS/console/network bugs, auto-run forms, export reports.

---

## Detailed description

Katch! is a Manifest V3 Chrome extension for QA engineers and developers who need to stress web forms and catch bugs quickly.

**Payloads & catch**
- Right-click or floating **K** badge → smart edge-case payloads by field role
- Stress-fill all inputs on a page
- Catch JS errors, console errors, and related network failures
- Optional viewport screenshot + DOM snippet on each catch
- Copy Markdown / Jira-style reports; export MD + JSON packs

**Form automation**
- Auto-fill forms (no submit)
- Auto-run combinations with submit (teach-submit + resume across reload)
- Run depth: 1 / half / all
- Rate-limit flood test (PASS on 429 / throttle)
- End-of-run summary with assertion lite score and HAR-lite network log

**Lab**
- Network mock (status, latency, URL match)
- Timeline / replay and coverage overlay
- Layout Inspector and a11y quick scan
- Storage Manager (localStorage / sessionStorage / cookies)
- Scenarios with Playwright / Cypress sketch export and local share packs

**Signal Desk**
- Chrome Side Panel keeps Lab and Catches open beside the page

**Privacy**
- Data stays in your browser (`chrome.storage.local`). No Katch! cloud analytics.

---

## Authorized-use disclaimer (include in listing)

**Authorized testing only.** Use Katch! only on apps and environments you are permitted to test. Auto-run and rate-limit features click real submit buttons and can lock or throttle accounts. Do not use against systems you do not own or have written permission to test.

Captcha, MFA, and OAuth flows are not automated.

---

## Screenshot checklist (capture manually)

1. **Home** — Stress Fill, Auto-fill, Auto-run, Rate limit, authorized-use line  
2. **Catches** — issue list with screenshot thumbnail  
3. **Lab → Network / Inspect** — mock or layout scan  
4. **On-page** — floating K menu or run summary panel  
5. **Signal Desk** — side panel open beside a form  

Suggested size: 1280×800 (or Chrome Store recommended).

---

## Permission justification (dashboard)

See [docs/PERMISSIONS.md](docs/PERMISSIONS.md). Privacy policy: [PRIVACY.md](PRIVACY.md).
