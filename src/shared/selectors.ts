/**
 * Build a reasonably unique CSS selector for an element.
 */
export function buildSelector(el: Element): string {
  if (el.id) {
    return `#${CSS.escape(el.id)}`
  }

  const parts: string[] = []
  let current: Element | null = el

  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    let part = current.tagName.toLowerCase()
    const node: Element = current

    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`)
      break
    }

    const parent: Element | null = node.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c): c is Element => c.tagName === node.tagName,
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(node) + 1
        part += `:nth-of-type(${index})`
      }
    }

    const name = node.getAttribute('name')
    if (name) {
      part += `[name="${CSS.escape(name)}"]`
    }

    parts.unshift(part)
    current = parent
  }

  return parts.join(' > ')
}
