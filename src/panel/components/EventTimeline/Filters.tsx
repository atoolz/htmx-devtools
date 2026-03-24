import { signal } from '@preact/signals'
import { EVENT_CATEGORIES } from '../../../shared/constants'

const uniqueCategories = [...new Set(Object.values(EVENT_CATEGORIES))]

export const activeCategories = signal<Set<string>>(new Set(uniqueCategories))

export function toggleCategory(cat: string): void {
  const current = activeCategories.value
  const next = new Set(current)
  if (next.has(cat)) {
    next.delete(cat)
  } else {
    next.add(cat)
  }
  activeCategories.value = next
}

const CATEGORY_COLORS: Record<string, string> = {
  init: '#6366f1',
  request: '#3b82f6',
  xhr: '#8b5cf6',
  response: '#06b6d4',
  swap: '#22c55e',
  oob: '#14b8a6',
  history: '#f59e0b',
  transition: '#a855f7',
  error: '#ef4444',
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? 'var(--text-muted)'
}

export function Filters() {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {uniqueCategories.map(cat => {
        const active = activeCategories.value.has(cat)
        return (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            style={{
              padding: '2px 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: active ? getCategoryColor(cat) : 'transparent',
              color: active ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
