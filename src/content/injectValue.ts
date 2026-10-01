/**
 * Framework-friendly value injection (React / Vue / native / contenteditable).
 */

export type EditableTarget =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLElement

export function isEditableTarget(el: EventTarget | null): el is EditableTarget {
  if (!el || !(el instanceof Element)) return false
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return true
  }
  if (el instanceof HTMLElement) {
    return el.isContentEditable || el.getAttribute('role') === 'textbox'
  }
  return false
}

/** Walk open shadow roots to find a focused editable. */
export function resolveEditable(el: Element | null): EditableTarget | null {
  if (!el) return null
  if (isEditableTarget(el)) return el

  // Active element inside open shadow
  let current: Element | null = el
  for (let i = 0; i < 6 && current; i++) {
    const root = current.shadowRoot
    if (root?.activeElement) {
      const inner = resolveEditable(root.activeElement)
      if (inner) return inner
    }
    current = current.parentElement
  }
  return null
}

export function getActiveEditable(): EditableTarget | null {
  return resolveEditable(document.activeElement)
}

export function injectValue(el: EditableTarget, value: string): void {
  if (
    el instanceof HTMLElement &&
    !(el instanceof HTMLInputElement) &&
    !(el instanceof HTMLTextAreaElement) &&
    !(el instanceof HTMLSelectElement) &&
    (el.isContentEditable || el.getAttribute('role') === 'textbox')
  ) {
    el.focus()
    try {
      document.execCommand('selectAll', false)
      document.execCommand('insertText', false, value)
    } catch {
      el.textContent = value
    }
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value,
      }),
    )
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    return
  }

  if (
    !(
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    )
  ) {
    return
  }

  el.focus()

  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype

  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  descriptor?.set?.call(el, value)

  // React 17+ often listens on the tracker property
  try {
    const tracker = (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })
      ._valueTracker
    tracker?.setValue('')
  } catch {
    /* ignore */
  }

  el.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: 'insertText',
      data: value,
    }),
  )
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Unidentified' }))
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Unidentified' }))
  el.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
}

export function queryEditables(root: ParentNode = document): EditableTarget[] {
  const nodes = root.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=file]):not([type=image]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"], [contenteditable=""], [role="textbox"]',
  )
  const list: EditableTarget[] = []
  nodes.forEach((n) => {
    if (isEditableTarget(n)) list.push(n)
    // open shadow
    if (n instanceof HTMLElement && n.shadowRoot) {
      list.push(...queryEditables(n.shadowRoot))
    }
  })
  return list
}
