import { filteredEvents } from '../../store'
import { EVENT_CATEGORIES } from '../../../shared/constants'
import { SearchBar } from '../shared/SearchBar'
import { Filters, activeCategories } from './Filters'
import { EventRow } from './EventRow'
import { computed } from '@preact/signals'

export function Timeline() {
  const allEvents = filteredEvents.value
  const cats = activeCategories.value

  const visibleEvents = allEvents.filter(e => {
    const cat = EVENT_CATEGORIES[e.name] ?? 'unknown'
    return cats.has(cat)
  })

  const baseTime = visibleEvents.length > 0 ? visibleEvents[0].timestamp : 0

  if (allEvents.length === 0) {
    return (
      <div class="empty-state">
        <div class="empty-state__title">No events captured</div>
        <div>Interact with the page to see HTMX events here</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SearchBar placeholder="Filter events..." />
      <div style={{ padding: '4px 8px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <Filters />
      </div>
      <div style={{
        flex: 1,
        overflow: 'auto',
        fontSize: '11px',
        padding: '0 0 8px 0',
      }}>
        <div style={{
          padding: '4px 8px',
          color: 'var(--text-muted)',
          fontSize: '10px',
          borderBottom: '1px solid var(--border)',
        }}>
          {visibleEvents.length} events ({allEvents.length} total)
        </div>
        {visibleEvents.map(event => (
          <EventRow key={event.id} event={event} baseTime={baseTime} />
        ))}
      </div>
    </div>
  )
}
