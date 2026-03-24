import { signal, computed } from '@preact/signals'
import { filteredRequests, selectedRequestId, selectedRequest, requests } from '../../store'
import { sendCommand } from '../../connection'
import { StatusDot } from '../shared/StatusDot'
import { ElementTag } from '../shared/ElementTag'
import { SearchBar } from '../shared/SearchBar'
import { RequestDetail } from './RequestDetail'
import type { RequestLifecycle } from '../../../shared/types'

const recording = signal(true)
const snapshot = signal<RequestLifecycle[]>([])

// When recording, always show live data. When paused, show the frozen snapshot.
const displayedRequests = computed(() => {
  if (recording.value) return filteredRequests.value
  return snapshot.value
})

function VerbBadge({ verb }: { verb: string }) {
  const v = verb.toLowerCase()
  return <span class={`verb-badge verb-badge--${v}`}>{verb.toUpperCase()}</span>
}

function formatDuration(timing: { triggerAt: number; completedAt: number | null }): string {
  if (!timing.completedAt || timing.triggerAt <= 0) return '...'
  const ms = timing.completedAt - timing.triggerAt
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function toggleRecording(): void {
  if (recording.value) {
    // Pausing: freeze current data
    snapshot.value = filteredRequests.value
  }
  recording.value = !recording.value
}

function clearRequests(): void {
  sendCommand('cmd:clear', null)
  snapshot.value = []
}

export function RequestInspector() {
  const reqs = displayedRequests.value
  const selected = selectedRequest.value

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div class="toolbar">
        <button
          class="toolbar__btn"
          title={recording.value ? 'Pause recording' : 'Resume recording'}
          onClick={toggleRecording}
          style={{ color: recording.value ? 'var(--error)' : 'var(--text-muted)', fontSize: '16px' }}
        >
          {recording.value ? '\u25CF' : '\u25B6'}
        </button>
        <button class="toolbar__btn" title="Clear" onClick={clearRequests}>
          &#x1D5EB;
        </button>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {reqs.length} request{reqs.length !== 1 ? 's' : ''}
          {!recording.value && ' (paused)'}
        </span>
        <span style={{ flex: 1 }} />
        <SearchBar placeholder="Filter by URL, verb, or element..." />
      </div>
      {reqs.length === 0 ? (
        <div class="empty-state">
          <div class="empty-state__title">
            {recording.value ? 'No HTMX requests captured' : 'Recording paused'}
          </div>
          <div>{recording.value ? 'Interact with the page to see requests here' : 'Click the red dot to resume'}</div>
        </div>
      ) : (
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
      )}
    </div>
  )
}
