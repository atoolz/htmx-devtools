import { useSignal } from '@preact/signals'

export function JsonViewer({ data, label }: { data: unknown; label?: string }) {
  const expanded = useSignal(false)

  if (data == null) return null

  const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  const isLong = str.length > 100

  return (
    <div class="detail-section">
      {label && <div class="detail-section__title">{label}</div>}
      <pre style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        maxHeight: expanded.value ? 'none' : '150px',
        overflow: 'hidden',
      }}>
        {str}
      </pre>
      {isLong && (
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '2px 0',
          }}
          onClick={() => { expanded.value = !expanded.value }}
        >
          {expanded.value ? 'Collapse' : 'Expand'}
        </button>
      )}
    </div>
  )
}
