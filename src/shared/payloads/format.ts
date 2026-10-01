import type { PayloadItem } from '../types'

export const FORMAT_PAYLOADS: PayloadItem[] = [
  { id: 'fmt-1', category: 'formatViolators', featured: true, label: 'Broken phone', value: '++1-(999)-ABC' },
  { id: 'fmt-2', category: 'formatViolators', featured: true, label: 'Invalid date', value: '32/13/0000' },
  { id: 'fmt-3', category: 'formatViolators', featured: true, label: 'Broken URL', value: 'ht!tp://[::1]:99999/../' },
  { id: 'fmt-4', category: 'formatViolators', featured: true, label: 'Broken JSON', value: '{"unclosed": true,' },
  { id: 'fmt-5', category: 'formatViolators', featured: true, label: 'Bad UUID', value: 'not-a-uuid-xxxxx' },
  { id: 'fmt-6', category: 'formatViolators', featured: true, label: 'Bad IP', value: '999.999.999.999' },
  { id: 'fmt-7', category: 'formatViolators', featured: true, label: 'Bad color', value: '#GG0000' },
  { id: 'fmt-8', category: 'formatViolators', featured: true, label: 'Bad time', value: '25:61:99' },
  { id: 'fmt-9', category: 'formatViolators', label: 'ISO date junk', value: '2020-13-40T99:99:99Z' },
  { id: 'fmt-10', category: 'formatViolators', label: 'Credit card fake', value: '0000-0000-0000-0000' },
  { id: 'fmt-11', category: 'formatViolators', label: 'ZIP nonsense', value: 'ABCDE' },
  { id: 'fmt-12', category: 'formatViolators', label: 'SSN pattern', value: '000-00-0000' },
  { id: 'fmt-13', category: 'formatViolators', label: 'Negative money', value: '-$999999.999' },
  { id: 'fmt-14', category: 'formatViolators', label: 'Percent over', value: '150%' },
  { id: 'fmt-15', category: 'formatViolators', label: 'Boolean junk', value: 'yesnt' },
  { id: 'fmt-16', category: 'formatViolators', label: 'XML broken', value: '<root><child></root>' },
  { id: 'fmt-17', category: 'formatViolators', label: 'YAML inject', value: '!!js/function >-' },
  { id: 'fmt-18', category: 'formatViolators', label: 'IBAN junk', value: 'TR00INVALID' },
  { id: 'fmt-19', category: 'formatViolators', featured: true, label: 'Week 54', value: '2024-W54' },
  { id: 'fmt-20', category: 'formatViolators', featured: true, label: 'Lat out of range', value: '91.000000,-181.000000' },
]
