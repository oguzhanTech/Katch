import type { PayloadItem } from '../types'

export const WHITESPACE_PAYLOADS: PayloadItem[] = [
  { id: 'ws-1', category: 'whitespace', featured: true, label: 'Leading spaces', value: '   value' },
  { id: 'ws-2', category: 'whitespace', featured: true, label: 'Trailing spaces', value: 'value   ' },
  { id: 'ws-3', category: 'whitespace', featured: true, label: 'Only spaces', value: '     ' },
  { id: 'ws-4', category: 'whitespace', featured: true, label: 'Tab char', value: 'a\tb' },
  { id: 'ws-5', category: 'whitespace', featured: true, label: 'Newline', value: 'line1\nline2' },
  { id: 'ws-6', category: 'whitespace', featured: true, label: 'CRLF', value: 'line1\r\nline2' },
  { id: 'ws-7', category: 'whitespace', featured: true, label: 'CR only', value: 'a\rb' },
  { id: 'ws-8', category: 'whitespace', featured: true, label: 'NBSP', value: 'a\u00A0b' },
  { id: 'ws-9', category: 'whitespace', label: 'Em space', value: 'a\u2003b' },
  { id: 'ws-10', category: 'whitespace', label: 'Thin space', value: 'a\u2009b' },
  { id: 'ws-11', category: 'whitespace', label: 'Zero-width space', value: 'a\u200Bb' },
  { id: 'ws-12', category: 'whitespace', label: 'Vertical tab', value: 'a\vb' },
  { id: 'ws-13', category: 'whitespace', label: 'Form feed', value: 'a\fb' },
  { id: 'ws-14', category: 'whitespace', label: 'Mixed ws', value: ' \t\n\r ' },
  { id: 'ws-15', category: 'whitespace', label: 'Header inject', value: 'ok\r\nX-Injected: true' },
  { id: 'ws-16', category: 'whitespace', featured: true, label: 'Ideographic space', value: 'a\u3000b' },
  { id: 'ws-17', category: 'whitespace', featured: true, label: 'Line sep', value: 'a\u2028b\u2029c' },
]
