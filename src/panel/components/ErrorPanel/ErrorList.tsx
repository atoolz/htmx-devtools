import { errors, selectedRequestId, activeTab } from '../../store'
import { ElementTag } from '../shared/ElementTag'
import { SearchBar } from '../shared/SearchBar'
import { searchQuery } from '../../store'

const ERROR_TYPE_LABELS: Record<string, string> = {
  sendError: 'Network Error',
  sendAbort: 'Aborted',
  timeout: 'Timeout',
  responseError: 'Response Error',
  targetError: 'Target Not Found',
  swapError: 'Swap Error',
  onLoadError: 'Load Error',
  invalidPath: 'Invalid Path',
  'eventFilter:error': 'Event Filter Error',
}

export function ErrorList() {
  const allErrors = errors.value
  const q = searchQuery.value.toLowerCase()
  const filtered = q
    ? allErrors.filter(e =>
        e.type.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        e.element?.selector.toLowerCase().includes(q)
      )
    : allErrors

  if (allErrors.length === 0) {
    return (
      <div class="empty-state">
        <div class="empty-state__title">No errors detected</div>
        <div>HTMX errors and silent failures will appear here</div>
      </div>
    )
  }

  // Group by type
  const groups = new Map<string, typeof filtered>()
  for (const err of filtered) {
    const existing = groups.get(err.type) ?? []
    existing.push(err)
    groups.set(err.type, existing)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SearchBar placeholder="Filter errors..." />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{
          padding: '4px 8px',
          color: 'var(--text-muted)',
          fontSize: '10px',
          borderBottom: '1px solid var(--border)',
        }}>
          {filtered.length} error{filtered.length !== 1 ? 's' : ''}
        </div>
        {[...groups.entries()].map(([type, errs]) => (
          <div key={type}>
            <div style={{
              padding: '6px 8px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                color: 'var(--error)',
                fontWeight: 600,
                fontSize: '11px',
              }}>
                {ERROR_TYPE_LABELS[type] ?? type}
              </span>
              <span class="badge badge--error">{errs.length}</span>
            </div>
            {errs.map(err => (
              <div
                key={err.id}
                class="list-item"
                onClick={() => {
                  if (err.requestId) {
                    selectedRequestId.value = err.requestId
                    activeTab.value = 'requests'
                  }
                }}
                style={{ cursor: err.requestId ? 'pointer' : 'default' }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  flex: 1,
                }}>
                  {err.message}
                </span>
                {err.element && <ElementTag el={err.element} />}
                {err.requestId && (
                  <span class="time">req:{err.requestId.slice(-6)}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
