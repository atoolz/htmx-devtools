import type { RequestTiming } from '../../../shared/types'

interface Phase {
  name: string
  className: string
  start: number | null
  end: number | null
}

function getPhases(timing: RequestTiming): Phase[] {
  return [
    { name: 'Config', className: 'timeline-bar__phase--config', start: timing.triggerAt, end: timing.configuredAt },
    { name: 'Send', className: 'timeline-bar__phase--send', start: timing.configuredAt, end: timing.sentAt },
    { name: 'Wait', className: 'timeline-bar__phase--wait', start: timing.sentAt, end: timing.responseAt },
    { name: 'Swap', className: 'timeline-bar__phase--swap', start: timing.swapStartAt, end: timing.swapEndAt },
    { name: 'Settle', className: 'timeline-bar__phase--settle', start: timing.swapEndAt, end: timing.settledAt },
  ]
}

function formatMs(ms: number): string {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function RequestTimeline({ timing }: { timing: RequestTiming }) {
  const phases = getPhases(timing)
  const validPhases = phases.filter(p => p.start != null && p.end != null)

  if (validPhases.length === 0) return null

  const totalStart = timing.triggerAt
  const totalEnd = timing.completedAt ?? timing.settledAt ?? timing.swapEndAt ?? timing.responseAt ?? timing.sentAt ?? totalStart
  const totalDuration = totalEnd - totalStart

  if (totalDuration <= 0) return null

  return (
    <div class="detail-section">
      <div class="detail-section__title">
        Timeline ({formatMs(totalDuration)} total)
      </div>
      <div class="timeline-bar">
        {validPhases.map(phase => {
          const duration = phase.end! - phase.start!
          const width = Math.max((duration / totalDuration) * 100, 2)
          return (
            <div
              key={phase.name}
              class={`timeline-bar__phase ${phase.className}`}
              style={{ width: `${width}%` }}
              title={`${phase.name}: ${formatMs(duration)}`}
            >
              {width > 10 ? `${phase.name} ${formatMs(duration)}` : ''}
            </div>
          )
        })}
      </div>
      <div class="kv-table" style={{ marginTop: '4px' }}>
        {validPhases.map(phase => (
          <div class="kv-table__row" key={phase.name}>
            <span class="kv-table__key">{phase.name}</span>
            <span class="kv-table__value">{formatMs(phase.end! - phase.start!)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
