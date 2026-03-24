import type { CapturedEvent } from '../../../shared/types'
import { EVENT_CATEGORIES } from '../../../shared/constants'
import { getCategoryColor } from './Filters'
import { ElementTag } from '../shared/ElementTag'
import { useSignal } from '@preact/signals'

export function EventRow({ event, baseTime }: { event: CapturedEvent; baseTime: number }) {
  const expanded = useSignal(false)
  const category = EVENT_CATEGORIES[event.name] ?? 'unknown'
  const color = getCategoryColor(category)
  const offset = event.timestamp - baseTime

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        class="list-item"
        onClick={() => { expanded.value = !expanded.value }}
        style={{ padding: '3px 8px' }}
      >
        <span class="time" style={{ minWidth: '60px' }}>
          +{offset < 1000 ? `${Math.round(offset)}ms` : `${(offset / 1000).toFixed(1)}s`}
        </span>
        <span style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: color,
          minWidth: '180px',
        }}>
          {event.name.replace('htmx:', '')}
        </span>
        <ElementTag el={event.element} />
        {event.requestId && (
          <span class="time" style={{ marginLeft: 'auto' }}>
            req:{event.requestId.slice(-6)}
          </span>
        )}
      </div>
      {expanded.value && Object.keys(event.detail).length > 0 && (
        <div style={{ padding: '4px 8px 8px 80px' }}>
          <pre style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '200px',
            overflow: 'auto',
          }}>
            {JSON.stringify(event.detail, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
