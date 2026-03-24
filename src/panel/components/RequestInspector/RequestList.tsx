import { filteredRequests, selectedRequestId, selectedRequest } from '../../store'
import { StatusDot } from '../shared/StatusDot'
import { ElementTag } from '../shared/ElementTag'
import { SearchBar } from '../shared/SearchBar'
import { RequestDetail } from './RequestDetail'

function VerbBadge({ verb }: { verb: string }) {
  const v = verb.toLowerCase()
  return <span class={`verb-badge verb-badge--${v}`}>{verb.toUpperCase()}</span>
}

function formatDuration(timing: { triggerAt: number; completedAt: number | null }): string {
  if (!timing.completedAt) return '...'
  const ms = timing.completedAt - timing.triggerAt
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function RequestInspector() {
  const reqs = filteredRequests.value
  const selected = selectedRequest.value

  if (reqs.length === 0) {
    return (
      <div class="empty-state">
        <div class="empty-state__title">No HTMX requests captured</div>
        <div>Interact with the page to see requests here</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SearchBar placeholder="Filter by URL, verb, or element..." />
      <div class="split-panel" style={{ flex: 1 }}>
        <div class="split-panel__list">
          {reqs.map(req => (
            <div
              key={req.id}
              class={`list-item ${selectedRequestId.value === req.id ? 'list-item--selected' : ''}`}
              onClick={() => { selectedRequestId.value = req.id }}
            >
              <StatusDot status={req.status} />
              <VerbBadge verb={req.verb || 'GET'} />
              <span class="url">{req.url || '/'}</span>
              <ElementTag el={req.triggerElement} />
              <span class="time">{formatDuration(req.timing)}</span>
            </div>
          ))}
        </div>
        <div class="split-panel__detail">
          {selected ? (
            <RequestDetail request={selected} />
          ) : (
            <div class="empty-state">
              <div>Select a request to see details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
