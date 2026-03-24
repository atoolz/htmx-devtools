import { signal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import { requests } from '../../store'
import { api } from '../../../shared/browser-api'
import { DomDiff } from './DomDiff'
import type { RequestLifecycle } from '../../../shared/types'

interface SwapRecord {
  requestId: string
  verb: string
  url: string
  swapStrategy: string
  targetSelector: string
  responseHtml: string
  targetBefore: string | null
  targetAfter: string | null
  timestamp: number
}

const recording = signal(true)
const swapRecords = signal<SwapRecord[]>([])
const selectedId = signal<string | null>(null)
const viewMode = signal<'diff' | 'response' | 'before' | 'after'>('response')

// Track which requests we already recorded
const recordedIds = new Set<string>()

function captureTargetHtml(selector: string, callback: (html: string | null) => void): void {
  if (!selector) { callback(null); return }
  const escaped = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const code = `(function(){
    var el = document.querySelector('${escaped}');
    return el ? el.outerHTML : null;
  })()`
  api.devtools.inspectedWindow['eval'](code, (result: string | null, err: any) => {
    callback(err ? null : result)
  })
}

function processNewSwaps(): void {
  if (!recording.value) return
  const completedSwaps = requests.value.filter(r =>
    r.responseBody &&
    r.phase !== 'trigger' &&
    r.phase !== 'configuring' &&
    !recordedIds.has(r.id)
  )

  for (const req of completedSwaps) {
    recordedIds.add(req.id)
    const targetSel = req.targetElement?.selector || (req.targetElement?.id ? '#' + req.targetElement.id : '')

    const record: SwapRecord = {
      requestId: req.id,
      verb: req.verb,
      url: req.url,
      swapStrategy: req.swapStrategy || 'innerHTML',
      targetSelector: targetSel,
      responseHtml: req.responseBody || '',
      targetBefore: req.domBefore,
      targetAfter: req.domAfter,
      timestamp: req.timing.swapStartAt || req.timing.completedAt || Date.now(),
    }

    // Try to capture current target state
    if (targetSel) {
      captureTargetHtml(targetSel, (html) => {
        record.targetAfter = html
        swapRecords.value = [...swapRecords.value]
      })
    }

    swapRecords.value = [...swapRecords.value, record]
  }
}

function clearRecords(): void {
  swapRecords.value = []
  recordedIds.clear()
  selectedId.value = null
}

export function SwapPanel() {
  const reqs = requests.value
  useEffect(() => { processNewSwaps() }, [reqs])

  const records = swapRecords.value
  const selected = records.find(r => r.requestId === selectedId.value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div class="toolbar">
        <button
          class="toolbar__btn"
          title={recording.value ? 'Pause recording' : 'Resume recording'}
          onClick={() => { recording.value = !recording.value }}
          style={{ color: recording.value ? 'var(--error)' : 'var(--text-muted)', fontSize: '16px' }}
        >
          {recording.value ? '\u25CF' : '\u25B6'}
        </button>
        <button class="toolbar__btn" title="Clear" onClick={clearRecords}>
          &#x1D5EB;
        </button>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {records.length} swap{records.length !== 1 ? 's' : ''}
          {!recording.value && ' (paused)'}
        </span>
      </div>
      <div class="split-panel" style={{ flex: 1 }}>
        <div class="split-panel__list">
          {records.length === 0 ? (
            <div class="empty-state" style={{ padding: '16px' }}>
              <div class="empty-state__title" style={{ fontSize: '12px' }}>
                {recording.value ? 'Waiting for swaps...' : 'Recording paused'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {recording.value ? 'Interact with the page to capture swaps' : 'Click the red dot to resume'}
              </div>
            </div>
          ) : (
            records.map(rec => (
              <div
                key={rec.requestId}
                class={`list-item ${selectedId.value === rec.requestId ? 'list-item--selected' : ''}`}
                onClick={() => { selectedId.value = rec.requestId }}
              >
                <span class="verb-badge" style={{
                  fontSize: '9px', padding: '1px 4px',
                  background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                  borderRadius: '2px', fontFamily: 'var(--font-mono)',
                }}>
                  {rec.swapStrategy}
                </span>
                <span class="url">{rec.url || '/'}</span>
                <span class="verb-badge" style={{
                  fontSize: '9px', padding: '1px 3px',
                  background: rec.verb === 'GET' ? 'var(--verb-get)' : rec.verb === 'POST' ? 'var(--verb-post)' : rec.verb === 'PUT' ? 'var(--verb-put)' : rec.verb === 'DELETE' ? 'var(--verb-delete)' : 'var(--bg-tertiary)',
                  color: '#fff', borderRadius: '2px',
                }}>
                  {rec.verb}
                </span>
              </div>
            ))
          )}
        </div>
        <div class="split-panel__detail">
          {selected ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div class="toolbar" style={{ gap: '2px' }}>
                {(['response', 'diff', 'before', 'after'] as const).map(mode => (
                  <button
                    key={mode}
                    class="toolbar__btn"
                    style={{
                      width: 'auto', padding: '0 8px',
                      color: viewMode.value === mode ? 'var(--accent)' : undefined,
                      fontWeight: viewMode.value === mode ? 700 : 400,
                      fontSize: '11px',
                    }}
                    onClick={() => { viewMode.value = mode }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {selected.swapStrategy} &rarr; {selected.targetSelector || '?'}
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '4px' }}>
                {viewMode.value === 'response' && (
                  <pre style={{
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    color: 'var(--text-primary)',
                  }}>
                    {selected.responseHtml || '(empty response)'}
                  </pre>
                )}
                {viewMode.value === 'diff' && selected.targetBefore && selected.targetAfter && (
                  <DomDiff before={selected.targetBefore} after={selected.targetAfter} />
                )}
                {viewMode.value === 'diff' && (!selected.targetBefore || !selected.targetAfter) && (
                  <div class="empty-state">
                    <div style={{ fontSize: '11px' }}>Diff unavailable</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Use Response tab to see the swapped HTML</div>
                  </div>
                )}
                {viewMode.value === 'before' && (
                  <pre style={{
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    color: 'var(--text-primary)',
                  }}>
                    {selected.targetBefore || '(not captured)'}
                  </pre>
                )}
                {viewMode.value === 'after' && (
                  <pre style={{
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    color: 'var(--text-primary)',
                  }}>
                    {selected.targetAfter || '(not captured)'}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div class="empty-state">
              <div>Select a swap to inspect</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
