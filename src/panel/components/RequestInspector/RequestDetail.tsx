import type { RequestLifecycle } from '../../../shared/types'
import { ElementTag } from '../shared/ElementTag'
import { HeadersTable } from './HeadersTable'
import { RequestTimeline } from './RequestTimeline'
import { JsonViewer } from '../shared/JsonViewer'

export function RequestDetail({ request }: { request: RequestLifecycle }) {
  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      {/* Summary */}
      <div class="detail-section">
        <div class="detail-section__title">Summary</div>
        <div class="kv-table">
          <div class="kv-table__row">
            <span class="kv-table__key">Method</span>
            <span class="kv-table__value">{request.verb.toUpperCase()}</span>
          </div>
          <div class="kv-table__row">
            <span class="kv-table__key">URL</span>
            <span class="kv-table__value">{request.url}</span>
          </div>
          <div class="kv-table__row">
            <span class="kv-table__key">Status</span>
            <span class="kv-table__value">
              {request.httpStatus ?? request.status}
            </span>
          </div>
          <div class="kv-table__row">
            <span class="kv-table__key">Phase</span>
            <span class="kv-table__value">{request.phase}</span>
          </div>
          <div class="kv-table__row">
            <span class="kv-table__key">Swap</span>
            <span class="kv-table__value">{request.swapStrategy}</span>
          </div>
          <div class="kv-table__row">
            <span class="kv-table__key">Trigger</span>
            <span class="kv-table__value">
              <ElementTag el={request.triggerElement} />
            </span>
          </div>
          {request.targetElement && (
            <div class="kv-table__row">
              <span class="kv-table__key">Target</span>
              <span class="kv-table__value">
                <ElementTag el={request.targetElement} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <RequestTimeline timing={request.timing} />

      {/* Headers */}
      <HeadersTable headers={request.requestHeaders} title="Request Headers" />
      <HeadersTable headers={request.responseHeaders} title="Response Headers" />

      {/* Body */}
      {request.requestBody && Object.keys(request.requestBody).length > 0 && (
        <JsonViewer data={request.requestBody} label="Request Body" />
      )}
      {request.responseBody && (
        <JsonViewer data={request.responseBody} label="Response Body" />
      )}

      {/* Errors */}
      {request.errors.length > 0 && (
        <div class="detail-section">
          <div class="detail-section__title">Errors ({request.errors.length})</div>
          {request.errors.map(err => (
            <div key={err.id} style={{ padding: '4px 0', color: 'var(--error)' }}>
              {err.type}: {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Events */}
      <div class="detail-section">
        <div class="detail-section__title">Events ({request.events.length})</div>
        {request.events.map(evt => (
          <div key={evt.id} class="kv-table__row">
            <span class="kv-table__key" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
              {evt.name.replace('htmx:', '')}
            </span>
            <span class="kv-table__value time">
              {request.timing.triggerAt > 0
                ? `+${Math.round(evt.timestamp - request.timing.triggerAt)}ms`
                : new Date(evt.timestamp).toLocaleTimeString()
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
