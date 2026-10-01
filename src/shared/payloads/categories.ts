import type { PayloadCategory } from '../types'

export const PAYLOAD_CATEGORIES: {
  id: Exclude<PayloadCategory, 'custom'>
  label: string
}[] = [
  { id: 'sqli', label: 'SQLi' },
  { id: 'xss', label: 'XSS' },
  { id: 'nosql', label: 'NoSQL' },
  { id: 'boundary', label: 'Boundary' },
  { id: 'longStrings', label: 'Long' },
  { id: 'email', label: 'Email' },
  { id: 'specialChars', label: 'Special' },
  { id: 'unicodeEmoji', label: 'Unicode' },
  { id: 'whitespace', label: 'Whitespace' },
  { id: 'encoding', label: 'Encoding' },
  { id: 'pathTraversal', label: 'Path' },
  { id: 'formatViolators', label: 'Format' },
]
