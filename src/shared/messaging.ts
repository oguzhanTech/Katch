import type { KatchMessage } from './types'

export async function sendToActiveTab(message: KatchMessage): Promise<unknown> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    throw new Error('No active tab')
  }
  return chrome.tabs.sendMessage(tab.id, message)
}

/** Broadcast to every tab that might have the content script (settings sync). */
export async function broadcastToTabs(message: KatchMessage): Promise<void> {
  const tabs = await chrome.tabs.query({})
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) return
      try {
        await chrome.tabs.sendMessage(tab.id, message)
      } catch {
        /* no content script */
      }
    }),
  )
}

export async function sendToTab(tabId: number, message: KatchMessage): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message)
}

export function sendToBackground(message: KatchMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message)
}

export function onMessage(
  handler: (
    message: KatchMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => boolean | void,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return handler(message as KatchMessage, sender, sendResponse)
  })
}
