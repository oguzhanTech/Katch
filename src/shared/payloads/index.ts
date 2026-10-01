import type { FieldContext, PayloadCategory, PayloadItem } from '../types'
import type { FieldRole } from '../fieldRole'
import { inferFieldRole } from '../fieldRole'
import { PAYLOAD_CATEGORIES } from './categories'
import { SQLI_PAYLOADS } from './sqli'
import { XSS_PAYLOADS } from './xss'
import { NOSQL_PAYLOADS } from './nosql'
import { BOUNDARY_PAYLOADS } from './boundary'
import { LONG_PAYLOADS } from './longStrings'
import { EMAIL_PAYLOADS } from './email'
import { SPECIAL_PAYLOADS } from './specialChars'
import { UNICODE_PAYLOADS } from './unicode'
import { WHITESPACE_PAYLOADS } from './whitespace'
import { ENCODING_PAYLOADS } from './encoding'
import { PATH_PAYLOADS } from './pathTraversal'
import { FORMAT_PAYLOADS } from './format'

export { PAYLOAD_CATEGORIES }
export { inferFieldRole } from '../fieldRole'
export type { FieldRole } from '../fieldRole'

export const PAYLOADS: PayloadItem[] = [
  ...SQLI_PAYLOADS,
  ...XSS_PAYLOADS,
  ...NOSQL_PAYLOADS,
  ...BOUNDARY_PAYLOADS,
  ...LONG_PAYLOADS,
  ...EMAIL_PAYLOADS,
  ...SPECIAL_PAYLOADS,
  ...UNICODE_PAYLOADS,
  ...WHITESPACE_PAYLOADS,
  ...ENCODING_PAYLOADS,
  ...PATH_PAYLOADS,
  ...FORMAT_PAYLOADS,
]

function longString(length: number, char = 'A'): string {
  return char.repeat(length)
}

export function getPayloadsByCategory(category: PayloadCategory): PayloadItem[] {
  return PAYLOADS.filter((p) => p.category === category)
}

export function getFeaturedPayloads(category: PayloadCategory): PayloadItem[] {
  return getPayloadsByCategory(category)
    .filter((p) => p.featured)
    .slice(0, 12)
}

export function getPayloadById(id: string): PayloadItem | undefined {
  return PAYLOADS.find((p) => p.id === id)
}

const ROLE_CATEGORIES: Record<FieldRole, PayloadCategory[]> = {
  email: ['email', 'formatViolators'],
  number: ['boundary'],
  url: ['pathTraversal', 'encoding', 'formatViolators'],
  tel: ['formatViolators', 'specialChars'],
  password: ['specialChars', 'unicodeEmoji', 'longStrings', 'xss'],
  search: ['xss', 'specialChars', 'sqli', 'unicodeEmoji'],
  date: ['formatViolators', 'boundary'],
  text: ['specialChars', 'xss', 'sqli', 'whitespace', 'unicodeEmoji'],
  textarea: ['xss', 'specialChars', 'longStrings', 'sqli', 'unicodeEmoji'],
  select: ['boundary'],
  contenteditable: ['xss', 'specialChars', 'unicodeEmoji', 'whitespace'],
}

/** Exclusive, role-scoped suggestions — no full library dump. */
export function getSmartPayloads(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement,
): PayloadItem[] {
  const role = inferFieldRole(el)
  const categories = ROLE_CATEGORIES[role]
  const result: PayloadItem[] = []
  const seen = new Set<string>()

  const push = (item: PayloadItem) => {
    if (seen.has(item.id)) return
    seen.add(item.id)
    result.push(item)
  }

  // maxlength overflow first when relevant
  if (
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
    el.maxLength > 0
  ) {
    const over = el.maxLength + 1
    push({
      id: `smart-over-${el.maxLength}`,
      category: 'longStrings',
      label: `${over} chars (maxlength+1)`,
      value: longString(over),
      description: `Exceeds maxlength=${el.maxLength}`,
      featured: true,
    })
  }

  for (const cat of categories) {
    const featured = getFeaturedPayloads(cat)
    const pool = featured.length > 0 ? featured : getPayloadsByCategory(cat).slice(0, 12)
    for (const item of pool) push(item)
    if (result.length >= 16) break
  }

  return result.slice(0, 16)
}

export function pickSmartValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement,
): string {
  if (el instanceof HTMLSelectElement && el.options.length > 0) {
    return el.options[el.options.length - 1]?.value ?? 'Katch!'
  }
  const smart = getSmartPayloads(el)
  return smart[0]?.value ?? 'Katch!'
}

export function describeField(el: Element): FieldContext | null {
  if (
    !(
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) &&
    !(
      el instanceof HTMLElement &&
      (el.isContentEditable || el.getAttribute('role') === 'textbox')
    )
  ) {
    return null
  }

  const role = inferFieldRole(el)
  const type =
    el instanceof HTMLInputElement
      ? el.type
      : el instanceof HTMLTextAreaElement
        ? 'textarea'
        : el instanceof HTMLSelectElement
          ? 'select'
          : role

  return {
    tagName: el.tagName.toLowerCase(),
    type,
    name: 'name' in el ? String((el as HTMLInputElement).name || '') : '',
    id: el.id || '',
    placeholder:
      'placeholder' in el ? String((el as HTMLInputElement).placeholder || '') : '',
    required: 'required' in el ? Boolean((el as HTMLInputElement).required) : false,
    maxlength:
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? el.maxLength > 0
          ? el.maxLength
          : null
        : null,
    min: el instanceof HTMLInputElement ? el.min || null : null,
    max: el instanceof HTMLInputElement ? el.max || null : null,
    pattern: el instanceof HTMLInputElement ? el.pattern || null : null,
    selector: '',
  }
}
