import {
  PAYLOAD_CATEGORIES,
  getFeaturedPayloads,
  getPayloadById,
} from '../shared/payloads'
import { addIssue, getStorage } from '../shared/storage'
import { sendToTab } from '../shared/messaging'
import { isIgnoredNetworkNoise } from '../shared/networkNoise'
import type { CaughtIssue, KatchMessage } from '../shared/types'

const MENU_ROOT = 'katch-root'
const recentTabActions = new Map<number, number>()

function trackTabAction(tabId: number): void {
  recentTabActions.set(tabId, Date.now())
}

function wasRecentlyActive(tabId: number, windowMs = 20_000): boolean {
  const t = recentTabActions.get(tabId)
  return t != null && Date.now() - t < windowMs
}

async function attributionMs(): Promise<number> {
  const storage = await getStorage()
  return storage.settings.attributionWindowMs ?? 20_000
}

function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ROOT,
      title: 'Katch! Tools',
      contexts: ['editable'],
    })

    for (const cat of PAYLOAD_CATEGORIES) {
      chrome.contextMenus.create({
        id: `katch-cat-${cat.id}`,
        parentId: MENU_ROOT,
        title: cat.label,
        contexts: ['editable'],
      })

      const items = getFeaturedPayloads(cat.id)
      for (const item of items) {
        chrome.contextMenus.create({
          id: `katch-payload-${item.id}`,
          parentId: `katch-cat-${cat.id}`,
          title: item.label,
          contexts: ['editable'],
        })
      }
    }

    chrome.contextMenus.create({
      id: 'katch-stress-fill',
      parentId: MENU_ROOT,
      title: 'Stress Fill All Inputs',
      contexts: ['editable', 'page'],
    })
  })
}

async function enableSidePanel(): Promise<void> {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  } catch {
    /* older Chrome */
  }
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenus()
  void enableSidePanel()
})

chrome.runtime.onStartup.addListener(() => {
  createContextMenus()
  void enableSidePanel()
})

// Ensure menus exist even if SW wakes without install event
createContextMenus()
void enableSidePanel()

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return
  const storage = await getStorage()
  if (storage.settings.extensionEnabled === false) return

  const tabId = tab.id
  trackTabAction(tabId)

  if (info.menuItemId === 'katch-stress-fill') {
    await sendToTab(tabId, { type: 'STRESS_FILL' })
    return
  }

  const id = String(info.menuItemId)
  if (id.startsWith('katch-payload-')) {
    const payloadId = id.replace('katch-payload-', '')
    const item = getPayloadById(payloadId)
    if (!item) return
    await sendToTab(tabId, {
      type: 'INJECT_PAYLOAD',
      payload: item.value,
      category: item.category,
    })
  }
})

chrome.runtime.onMessage.addListener(
  (message: KatchMessage, sender, sendResponse) => {
    void (async () => {
      if (message.type === 'ISSUE_CAUGHT' && message.issue) {
        await addIssue(message.issue)
        sendResponse({ ok: true })
        return
      }

      if (message.type === 'CAPTURE_SCREENSHOT') {
        try {
          const tabId = sender.tab?.id
          const windowId = sender.tab?.windowId
          const dataUrl =
            windowId != null
              ? await chrome.tabs.captureVisibleTab(windowId, {
                  format: 'png',
                  quality: 80,
                })
              : await chrome.tabs.captureVisibleTab({
                  format: 'png',
                  quality: 80,
                })
          sendResponse({ ok: true, dataUrl, tabId })
        } catch (err) {
          sendResponse({ ok: false, error: String(err) })
        }
        return
      }

      if (
        message.type === 'TRACK_ACTION' ||
        message.type === 'INJECT_PAYLOAD' ||
        message.type === 'STRESS_FILL' ||
        message.type === 'AUTO_RUN_PAGE' ||
        message.type === 'RATE_LIMIT_TEST'
      ) {
        if (sender.tab?.id) trackTabAction(sender.tab.id)
      }

      sendResponse({ ok: true })
    })()
    return true
  },
)

// Network 4xx / 5xx listener
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId < 0) return
    const status = details.statusCode
    if (status < 400) return
    void (async () => {
      const windowMs = await attributionMs()
      if (!wasRecentlyActive(details.tabId, windowMs)) return
      if (isIgnoredNetworkNoise(details.url)) return

      const storage = await getStorage()
      if (storage.settings.extensionEnabled === false) return

      const issue: CaughtIssue = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        url: details.url,
        kind: 'network',
        message: `HTTP ${status} on ${details.method} ${details.url}`,
        statusCode: status,
        userAgent: 'service-worker',
      }

      void sendToTab(details.tabId, {
        type: 'NETWORK_ISSUE',
        issue,
      }).catch(() => {
        // content script may not be ready
      })
    })()
  },
  { urls: ['<all_urls>'] },
)

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.tabId < 0) return
    void (async () => {
      const windowMs = await attributionMs()
      if (!wasRecentlyActive(details.tabId, windowMs)) return
      if (isIgnoredNetworkNoise(details.url, details.error)) return

      const storage = await getStorage()
      if (storage.settings.extensionEnabled === false) return

      const issue: CaughtIssue = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        url: details.url,
        kind: 'network',
        message: `Network error: ${details.error} on ${details.url}`,
        userAgent: 'service-worker',
      }

      void sendToTab(details.tabId, { type: 'NETWORK_ISSUE', issue }).catch(
        () => undefined,
      )
    })()
  },
  { urls: ['<all_urls>'] },
)

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-katch') {
    // MV3 cannot programmatically open popup in all cases; open options-like via action
    // Best effort: focus extension action
    try {
      await chrome.action.openPopup()
    } catch {
      // Fallback: no-op — user can click the icon
    }
  }
})

// Track stress/inject from popup via storage ping of lastPayload writes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes.lastPayload) {
    // mark all active tabs — popup inject already messages content which tracks locally
  }
})

void getStorage()
