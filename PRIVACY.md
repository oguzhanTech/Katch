# Privacy Policy — Katch!

**Last updated:** 2026-09-26

Katch! is a Chrome extension for authorized QA testing. This policy describes what data the extension handles and where it stays.

## Summary

- **No accounts.** Katch! does not require sign-in.
- **No analytics or telemetry** from the extension to Katch! servers.
- **No sale of personal data.**
- Catch evidence (messages, screenshots, payloads you inject) is stored **locally** in your browser via `chrome.storage.local`.

## Data we process (on your device only)

| Data | Purpose | Storage |
|------|---------|---------|
| Settings (badge, depth, filters, …) | Remember preferences | `chrome.storage.local` |
| Caught issues (message, URL, status, payload, selector) | Bug reports / history | `chrome.storage.local` |
| Screenshots / DOM snippets (optional) | Evidence at catch time | `chrome.storage.local` (data URLs) |
| Timelines, form maps, site profiles, scenarios | Replay & automation | `chrome.storage.local` |
| Page DOM / network events | Detect errors while you test | In-memory / page context only |

Clearing extension storage or uninstalling removes this data.

## What we do **not** do

- We do **not** upload catches, screenshots, or browsing history to a Katch! backend.
- We do **not** run third-party ads or tracking pixels inside the extension UI.
- We do **not** read your data outside the tabs you interact with while testing.

## Permissions (why)

- **`storage`** — Save settings and catch history locally.
- **`activeTab` / `scripting`** — Inject payloads and run page tools on the tab you are testing.
- **`contextMenus`** — Right-click “Katch! Tools” on inputs.
- **`webRequest`** — Observe HTTP status/errors related to recent Katch! actions so network issues can be caught.
- **`sidePanel`** — Optional Signal Desk UI beside the page.
- **`clipboardWrite`** — Copy reports and screenshots when you ask.
- **Host access (`<all_urls>`)** — QA work happens on many origins (local, staging, production you are authorized to test). Content scripts and network observation need to run on those pages.

## Screenshots

When “Screenshot on catch” is enabled, Katch! may capture the **visible tab** at catch time and store the image locally with the issue. Screenshots are not transmitted by the extension.

## Authorized use

Use Katch! only on applications and environments you are allowed to test. Features such as auto-run and rate-limit tests can stress or lock accounts.

## Contact

For privacy questions about this extension, open an issue on the project repository or contact the maintainer listed on the Chrome Web Store listing.

## Changes

We may update this policy as the product evolves. The “Last updated” date at the top will change when material updates are made.
