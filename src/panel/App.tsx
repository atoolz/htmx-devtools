import { activeTab, errorCount, pageInfo, searchQuery } from './store'
import { useEffect } from 'preact/hooks'
import { RequestInspector } from './components/RequestInspector/RequestList'
import { ElementInspector } from './components/ElementInspector/ElementPanel'
import { Timeline } from './components/EventTimeline/Timeline'
import { SwapPanel } from './components/SwapVisualizer/SwapPanel'
import { ErrorList } from './components/ErrorPanel/ErrorList'
import { sendCommand } from './connection'

const TABS = [
  { id: 'requests' as const, label: 'Requests' },
  { id: 'elements' as const, label: 'Elements' },
  { id: 'timeline' as const, label: 'Timeline' },
  { id: 'swaps' as const, label: 'Swaps' },
  { id: 'errors' as const, label: 'Errors' },
]

export function App() {
  const tab = activeTab.value
  const info = pageInfo.value
  const errCount = errorCount.value

  // Clear search filter when switching tabs
  useEffect(() => { searchQuery.value = '' }, [tab])

  return (
    <div class="app">
      <div class="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            class={`tab-bar__tab ${tab === t.id ? 'tab-bar__tab--active' : ''}`}
            onClick={() => { activeTab.value = t.id }}
          >
            {t.label}
            {t.id === 'errors' && errCount > 0 && (
              <span class="badge badge--error">{errCount}</span>
            )}
          </button>
        ))}
        <div class="tab-bar__spacer" />
        {info?.detected && info.version && (
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            background: parseInt(info.version.split('.')[0], 10) >= 4 ? '#7c3aed' : '#3b82f6',
            color: '#fff',
          }}>
            htmx {info.version}
          </span>
        )}
        <button
          class="toolbar__btn"
          title="Clear"
          onClick={() => sendCommand('cmd:clear', null)}
        >
          &#x1D5EB;
        </button>
      </div>
      <div class="app__content">
        {tab === 'requests' && <RequestInspector />}
        {tab === 'elements' && <ElementInspector />}
        {tab === 'timeline' && <Timeline />}
        {tab === 'swaps' && <SwapPanel />}
        {tab === 'errors' && <ErrorList />}
      </div>
    </div>
  )
}
