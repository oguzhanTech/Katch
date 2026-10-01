// @ts-nocheck
/**
 * Runs in the PAGE (MAIN) world. Patches fetch + XHR when Katch mock is enabled.
 */
;(() => {
  const FLAG = '__KATCH_NETWORK_HOOK__'
  if (window[FLAG]) return
  window[FLAG] = true

  let cfg = {
    enabled: false,
    statusCode: 500,
    latencyMs: 0,
    urlMatch: '*',
  }

  const originalFetch = window.fetch.bind(window)
  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send

  function matches(url) {
    if (!cfg.enabled) return false
    const m = String(cfg.urlMatch || '').trim()
    if (!m || m === '*') return true
    return url.includes(m)
  }

  function resolveUrl(input) {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.href
    return input.url
  }

  function delay(ms) {
    return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve()
  }

  function mockBody() {
    return JSON.stringify({
      error: 'Katch! mock',
      status: cfg.statusCode,
      mocked: true,
    })
  }

  function notify(url) {
    window.postMessage(
      {
        source: 'katch-page',
        type: 'KATCH_MOCKED_REQUEST',
        url,
        status: cfg.statusCode,
      },
      '*',
    )
  }

  window.fetch = async (input, init) => {
    const url = resolveUrl(input)
    if (!matches(url)) {
      return originalFetch(input, init)
    }
    await delay(cfg.latencyMs)
    notify(url)
    return new Response(mockBody(), {
      status: cfg.statusCode,
      statusText: 'Katch Mock',
      headers: { 'Content-Type': 'application/json', 'X-Katch-Mock': '1' },
    })
  }

  XMLHttpRequest.prototype.open = function (method, url, async, username, password) {
    this.__katchUrl = String(url)
    return originalOpen.call(this, method, url, async !== false, username, password)
  }

  XMLHttpRequest.prototype.send = function (body) {
    const url = String(this.__katchUrl || '')
    if (!matches(url)) {
      return originalSend.call(this, body)
    }

    const xhr = this
    const finish = () => {
      Object.defineProperty(xhr, 'readyState', { configurable: true, get: () => 4 })
      Object.defineProperty(xhr, 'status', { configurable: true, get: () => cfg.statusCode })
      Object.defineProperty(xhr, 'statusText', {
        configurable: true,
        get: () => 'Katch Mock',
      })
      Object.defineProperty(xhr, 'responseText', {
        configurable: true,
        get: () => mockBody(),
      })
      Object.defineProperty(xhr, 'response', {
        configurable: true,
        get: () => mockBody(),
      })
      notify(url)
      xhr.dispatchEvent(new Event('readystatechange'))
      xhr.dispatchEvent(new Event('load'))
      xhr.dispatchEvent(new Event('loadend'))
    }

    if (cfg.latencyMs > 0) {
      setTimeout(finish, cfg.latencyMs)
    } else {
      finish()
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data
    if (!data || data.source !== 'katch-extension' || data.type !== 'KATCH_MOCK_CFG') {
      return
    }
    cfg = { ...cfg, ...data.payload }
  })
})()
