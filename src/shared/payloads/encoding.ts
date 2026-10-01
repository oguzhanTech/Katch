import type { PayloadItem } from '../types'

export const ENCODING_PAYLOADS: PayloadItem[] = [
  { id: 'enc-1', category: 'encoding', featured: true, label: 'URL space', value: '%20' },
  { id: 'enc-2', category: 'encoding', featured: true, label: 'Double URL', value: '%2527' },
  { id: 'enc-3', category: 'encoding', featured: true, label: 'HTML entity', value: '&#60;script&#62;' },
  { id: 'enc-4', category: 'encoding', featured: true, label: 'Hex entity', value: '&#x3C;img&#x20;src=x&#x3E;' },
  { id: 'enc-5', category: 'encoding', featured: true, label: 'Unicode escape', value: '\\u003cscript\\u003e' },
  { id: 'enc-6', category: 'encoding', featured: true, label: 'Base64-ish', value: 'PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' },
  { id: 'enc-7', category: 'encoding', featured: true, label: 'Overlong slash', value: '%c0%af' },
  { id: 'enc-8', category: 'encoding', featured: true, label: 'UTF-7', value: '+ADw-script+AD4-' },
  { id: 'enc-9', category: 'encoding', label: 'Plus space', value: 'hello+world' },
  { id: 'enc-10', category: 'encoding', label: 'Mixed encode', value: '%3Cscript%3Ealert(1)%3C/script%3E' },
  { id: 'enc-11', category: 'encoding', label: 'Null URL', value: '%00' },
  { id: 'enc-12', category: 'encoding', label: 'CRLF URL', value: '%0d%0a' },
  { id: 'enc-13', category: 'encoding', label: 'JSON escape', value: '\\n\\r\\t\\"' },
  { id: 'enc-14', category: 'encoding', label: 'Punycode', value: 'xn--e1afmkfd.xn--p1ai' },
  { id: 'enc-15', category: 'encoding', label: 'Quoted-printable', value: '=3Cscript=3E' },
  { id: 'enc-16', category: 'encoding', featured: true, label: 'UTF-16LE BOM', value: '\uFFFE<script>' },
  { id: 'enc-17', category: 'encoding', featured: true, label: 'Mixed case URL', value: '%3cScRiPt%3e' },
]
