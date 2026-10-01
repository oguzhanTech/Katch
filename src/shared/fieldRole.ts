export type FieldRole =
  | 'email'
  | 'number'
  | 'url'
  | 'tel'
  | 'password'
  | 'search'
  | 'date'
  | 'text'
  | 'textarea'
  | 'select'
  | 'contenteditable'

function metaBlob(el: Element): string {
  const parts = [
    el.getAttribute('name'),
    el.getAttribute('id'),
    el.getAttribute('placeholder'),
    el.getAttribute('aria-label'),
    el.getAttribute('autocomplete'),
    el.getAttribute('inputmode'),
    el.className?.toString?.(),
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function inferFieldRole(el: Element): FieldRole {
  if (el instanceof HTMLSelectElement) return 'select'
  if (el instanceof HTMLTextAreaElement) return 'textarea'

  if (
    el instanceof HTMLElement &&
    (el.isContentEditable || el.getAttribute('role') === 'textbox')
  ) {
    return 'contenteditable'
  }

  if (!(el instanceof HTMLInputElement)) return 'text'

  const type = (el.type || 'text').toLowerCase()
  const meta = metaBlob(el)
  const ac = (el.autocomplete || '').toLowerCase()
  const mode = (el.inputMode || '').toLowerCase()

  if (type === 'email' || ac.includes('email') || /e-?mail|mailaddress/.test(meta)) {
    return 'email'
  }
  if (
    type === 'tel' ||
    mode === 'tel' ||
    ac.includes('tel') ||
    /phone|mobile|tel\b|gsm/.test(meta)
  ) {
    return 'tel'
  }
  if (type === 'url' || ac.includes('url') || /\burl\b|website|homepage/.test(meta)) {
    return 'url'
  }
  if (
    type === 'number' ||
    type === 'range' ||
    mode === 'numeric' ||
    mode === 'decimal' ||
    el.min !== '' ||
    el.max !== '' ||
    /\b(amount|qty|quantity|age|count|price|number)\b/.test(meta)
  ) {
    return 'number'
  }
  if (type === 'password' || ac.includes('password') || /password|passwd|pwd/.test(meta)) {
    return 'password'
  }
  if (type === 'search' || ac.includes('search') || /\bsearch\b|query|q\b/.test(meta)) {
    return 'search'
  }
  if (
    type === 'date' ||
    type === 'datetime-local' ||
    type === 'month' ||
    type === 'week' ||
    type === 'time' ||
    /birthday|dob|date/.test(meta)
  ) {
    return 'date'
  }

  return 'text'
}
