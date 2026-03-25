import { requests } from '../../store'
import type { InspectedElement } from '../../../shared/types'
import { StatusDot } from '../shared/StatusDot'
import { selectedRequestId, activeTab } from '../../store'

export function ElementHistory({ element }: { element: InspectedElement }) {
  const reqIds = new Set(element.requestHistory)

  // Also find requests by matching trigger element selector
  const selector = element.descriptor.selector
  const allRelated = requests.value.filter(r =>
    reqIds.has(r.id) || r.triggerElement.selector === selector
  )

  // Deduplicate by id and reverse (newest first)
  const seen = new Set<string>()
  const unique = allRelated.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  }).reverse()

  if (unique.length === 0) {
    return (
      <div class="detail-section">
        <div class="detail-section__title">Request History</div>
        <div style={{ color: 'var(--text-muted)', padding: '4px 0', fontSize: '12px' }}>
          No requests recorded for this element
        </div>
      </div>
    )
  }

  return (
    <div class="detail-section">
      <div class="detail-section__title">Request History ({unique.length})</div>
      {unique.map(req => (
        <div
          key={req.id}
          class="list-item"
          style={{ padding: '3px 0', cursor: 'pointer' }}
          onClick={() => {
            selectedRequestId.value = req.id
            activeTab.value = 'requests'
          }}
        >
          <StatusDot status={req.status} />
          <span class={`verb-badge verb-badge--${req.verb.toLowerCase()}`} style={{ marginLeft: '4px' }}>
            {req.verb.toUpperCase()}
          </span>
          <span class="url" style={{ flex: 1 }}>{req.url}</span>
          <span class="time">{req.httpStatus ?? req.status}</span>
        </div>
      ))}
    </div>
  )
}
