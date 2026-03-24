import { requests } from '../../store'
import type { InspectedElement } from '../../../shared/types'
import { StatusDot } from '../shared/StatusDot'

export function ElementHistory({ element }: { element: InspectedElement }) {
  const reqIds = new Set(element.requestHistory)
  const relatedRequests = requests.value.filter(r => reqIds.has(r.id))

  if (relatedRequests.length === 0) {
    return (
      <div class="detail-section">
        <div class="detail-section__title">Request History</div>
        <div style={{ color: 'var(--text-muted)', padding: '4px 0' }}>
          No requests recorded for this element
        </div>
      </div>
    )
  }

  return (
    <div class="detail-section">
      <div class="detail-section__title">Request History ({relatedRequests.length})</div>
      {relatedRequests.map(req => (
        <div key={req.id} class="kv-table__row">
          <StatusDot status={req.status} />
          <span style={{ marginLeft: '4px' }} class="kv-table__key">{req.verb.toUpperCase()} {req.url}</span>
          <span class="kv-table__value">{req.httpStatus ?? req.status}</span>
        </div>
      ))}
    </div>
  )
}
