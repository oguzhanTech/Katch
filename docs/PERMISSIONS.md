# Permission justifications — Katch! (Chrome Web Store review)

Use these short answers in the Developer Dashboard permission justification fields.

## storage

Store user settings, catch history, timelines, form maps, and optional screenshots locally on the device. No remote sync.

## activeTab

Access the tab the user is actively testing when they invoke Katch! actions from the popup or keyboard shortcut.

## scripting

Inject payload values into focused form fields and run in-page QA helpers (auto-fill, auto-run, inspectors) on the active tab.

## contextMenus

Provide “Katch! Tools” on editable fields so QA engineers can inject categorized payloads without opening the popup.

## clipboardWrite

Copy issue reports and screenshots to the clipboard when the user explicitly clicks Copy.

## sidePanel

Optional “Signal Desk” side panel so Lab and Catches can stay open beside the page under test.

## webRequest

Observe completed/failed HTTP requests on tabs where the user recently used Katch!, so related 4xx/5xx and network errors can be recorded as catches. Requests are not modified or redirected for MitM; Katch! only listens for status/errors and filters ad/telemetry noise.

## Host permission `<all_urls>`

QA testing targets many origins (localhost, staging, and authorized production apps). Content scripts and network catch attribution must run on whatever origin the engineer is testing. Katch! does not exfiltrate page data; processed catch data remains in `chrome.storage.local`.

## Single purpose statement

Help QA engineers inject edge-case payloads into web forms and catch related page errors during authorized testing.
