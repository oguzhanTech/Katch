/** Copy a data:image / blob URL image to the system clipboard. */
export async function copyImageDataUrl(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const type = blob.type || 'image/png'
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ [type]: blob })])
      return true
    }
    // Fallback: copy data URL as text
    await navigator.clipboard.writeText(dataUrl)
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(dataUrl)
      return true
    } catch {
      return false
    }
  }
}

/** Download a data URL as a PNG file. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
