/** Client / ad-blocker / tracker noise that should never surface as Katch! catches. */

const IGNORED_NETWORK_ERRORS = new Set([
  'net::ERR_BLOCKED_BY_CLIENT', // uBlock / AdBlock / Brave shields
  'net::ERR_BLOCKED_BY_ORB',
  'net::ERR_BLOCKED_BY_RESPONSE',
  'net::ERR_ABORTED', // navigation cancel, not an app bug
])

/** Host substrings typical of ads, analytics, and tag managers. */
const AD_TRACKER_HOST_MARKERS = [
  'doubleclick.',
  'googlesyndication.',
  'googleadservices.',
  'googletagmanager.',
  'googletagservices.',
  'google-analytics.',
  'adservice.google',
  'pagead2.googlesyndication',
  'pubmatic.',
  'adsystem.',
  'adsrvr.',
  'adsafeprotected.',
  'adnxs.',
  'ads.',
  'advertising.',
  'adform.',
  'adobedtm.',
  'omtrdc.',
  'demdex.',
  'scorecardresearch.',
  'quantserve.',
  'outbrain.',
  'taboola.',
  'criteo.',
  'moatads.',
  'amazon-adsystem.',
  'facebook.net',
  'facebook.com/tr',
  'connect.facebook',
  'hotjar.',
  'fullstory.',
  'segment.io',
  'segment.com',
  'mixpanel.',
  'amplitude.',
  'newrelic.',
  'nr-data.',
  'sentry.io',
  'sentry-cdn.',
  'backtrace.io',
  'bugsnag.',
  'rollbar.',
  'datadoghq.',
  'browser-intake.datadoghq',
  'logrocket.',
  'clarity.ms',
  'bing.com/bat',
  'bat.bing.',
  'twitter.com/i/ads',
  'ads-twitter.',
  'linkedin.com/px',
  'snapchat.',
  'tiktok.com/i18n/pixel',
  'yieldmo.',
  'openx.',
  'rubiconproject.',
  'casalemedia.',
  'contextweb.',
  'media.net',
  'serving-sys.',
  '2mdn.',
  'g.doubleclick',
]

export function isIgnoredNetworkNoise(url: string, error?: string): boolean {
  if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) {
    return true
  }

  if (/\.(css|js|mjs|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|ico|map)(\?|$)/i.test(url)) {
    return true
  }

  if (error && IGNORED_NETWORK_ERRORS.has(error)) {
    return true
  }

  // Also match error string embedded in free-form messages
  if (error) {
    for (const code of IGNORED_NETWORK_ERRORS) {
      if (error.includes(code)) return true
    }
  }

  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    host = url.toLowerCase()
  }

  const haystack = `${host} ${url.toLowerCase()}`
  return AD_TRACKER_HOST_MARKERS.some((marker) => haystack.includes(marker))
}
