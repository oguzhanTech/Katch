/** Filter noisy console.error messages that are not app bugs. */
const CONSOLE_NOISE = [
  /ResizeObserver loop/i,
  /Non-Error promise rejection/i,
  /Script error\.?/i,
  /Loading CSS chunk/i,
  /ChunkLoadError/i,
  /Extension context invalidated/i,
  /chrome-extension:\/\//i,
  /Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/i,
  /\[Katch!/i,
]

export function isConsoleNoise(message: string): boolean {
  return CONSOLE_NOISE.some((re) => re.test(message))
}
