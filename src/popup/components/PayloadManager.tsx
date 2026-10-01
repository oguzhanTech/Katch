import { useMemo, useState, type ReactNode } from 'react'
import { Plus, Trash2, Syringe } from 'lucide-react'
import { PAYLOAD_CATEGORIES, PAYLOADS } from '../../shared/payloads'
import type { CustomPayload, PayloadCategory } from '../../shared/types'

export function PayloadManager({
  customPayloads,
  onAdd,
  onRemove,
  onInject,
}: {
  customPayloads: CustomPayload[]
  onAdd: (label: string, value: string) => void
  onRemove: (id: string) => void
  onInject: (value: string) => void
}) {
  const [category, setCategory] = useState<PayloadCategory | 'all' | 'custom'>('all')
  const [query, setQuery] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')

  const items = useMemo(() => {
    let list =
      category === 'custom'
        ? customPayloads
        : category === 'all'
          ? PAYLOADS
          : PAYLOADS.filter((p) => p.category === category)

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.value.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
    }
    return list
  }, [category, customPayloads, query])

  return (
    <div className="space-y-3">
      <input
        className="katch-input font-mono text-xs"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-1">
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>
          All
        </Chip>
        {PAYLOAD_CATEGORIES.map((c) => (
          <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label}
          </Chip>
        ))}
        <Chip active={category === 'custom'} onClick={() => setCategory('custom')}>
          Custom
        </Chip>
      </div>

      <button
        type="button"
        className="text-[11px] text-katch-muted hover:text-katch-signal"
        onClick={() => setShowCustom((v) => !v)}
      >
        {showCustom ? '− Hide custom form' : '+ Custom'}
      </button>

      {showCustom && (
        <div className="space-y-2 border border-katch-border rounded-katch p-3">
          <input
            className="katch-input"
            placeholder="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <textarea
            className="katch-input min-h-[56px] font-mono text-xs"
            placeholder="Payload value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            type="button"
            className="katch-btn-primary w-full"
            disabled={!label.trim() || !value}
            onClick={() => {
              onAdd(label.trim(), value)
              setLabel('')
              setValue('')
            }}
          >
            <Plus size={14} />
            Save
          </button>
        </div>
      )}

      <p className="katch-label">{items.length}</p>

      <ul className="max-h-56 divide-y divide-katch-border overflow-y-auto rounded-katch border border-katch-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 px-2.5 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-katch-text">{item.label}</div>
              <div className="truncate font-mono text-[10px] text-katch-muted">
                {item.value || '(empty)'}
              </div>
            </div>
            <button
              type="button"
              className="katch-btn-ghost !p-1"
              title="Inject"
              onClick={() => onInject(item.value)}
            >
              <Syringe size={13} />
            </button>
            {item.category === 'custom' && (
              <button
                type="button"
                className="katch-btn-ghost !p-1"
                title="Remove"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-katch px-1.5 py-0.5 text-[10px] font-medium ${
        active
          ? 'border border-katch-signal/40 bg-katch-signal/15 text-katch-signal'
          : 'border border-katch-border text-katch-muted hover:text-katch-text'
      }`}
    >
      {children}
    </button>
  )
}
