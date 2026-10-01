import type { PayloadItem } from '../types'

function longString(length: number, char = 'A'): string {
  return char.repeat(length)
}

export const LONG_PAYLOADS: PayloadItem[] = [
  { id: 'long-11', category: 'longStrings', featured: true, label: '11 chars', value: longString(11) },
  { id: 'long-50', category: 'longStrings', featured: true, label: '50 chars', value: longString(50) },
  { id: 'long-255', category: 'longStrings', featured: true, label: '255 chars', value: longString(255) },
  { id: 'long-256', category: 'longStrings', featured: true, label: '256 chars', value: longString(256) },
  { id: 'long-1024', category: 'longStrings', featured: true, label: '1024 chars', value: longString(1024) },
  { id: 'long-4096', category: 'longStrings', featured: true, label: '4096 chars', value: longString(4096) },
  { id: 'long-5000', category: 'longStrings', featured: true, label: '5000 stress', value: longString(5000) },
  { id: 'long-null', category: 'longStrings', featured: true, label: 'Null mixed', value: `AAA${'\0'}BBB${'\0'}CCC` },
  { id: 'long-z', category: 'longStrings', label: '100 Z', value: longString(100, 'Z') },
  { id: 'long-digit', category: 'longStrings', label: '100 digits', value: longString(100, '9') },
  { id: 'long-space', category: 'longStrings', label: '100 spaces', value: longString(100, ' ') },
  { id: 'long-emoji', category: 'longStrings', label: '50 emoji', value: '🔥'.repeat(50) },
  { id: 'long-json', category: 'longStrings', label: 'Nested braces', value: '{'.repeat(200) + '}'.repeat(200) },
  { id: 'long-path', category: 'longStrings', label: 'Deep path', value: '../'.repeat(100) + 'x' },
  { id: 'long-url', category: 'longStrings', label: 'Long query', value: 'https://x.test/?' + 'a=1&'.repeat(200) },
  { id: 'long-8k', category: 'longStrings', featured: true, label: '8192 chars', value: longString(8192) },
  { id: 'long-mixed', category: 'longStrings', featured: true, label: 'Mixed alphabet', value: ('Ab1!'.repeat(512)) },
]
