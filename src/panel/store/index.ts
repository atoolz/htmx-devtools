import { signal, computed } from '@preact/signals'
import type { RequestLifecycle, CapturedEvent, ErrorInfo, HtmxPageInfo, InspectedElement, ElementDescriptor } from '../../shared/types'

// ---- Raw state signals ----

export const requests = signal<RequestLifecycle[]>([])
export const events = signal<CapturedEvent[]>([])
export const errors = signal<ErrorInfo[]>([])
export const pageInfo = signal<HtmxPageInfo | null>(null)
export const inspectedElement = signal<InspectedElement | null>(null)
export const htmxElements = signal<ElementDescriptor[]>([])

// ---- UI state ----

export const activeTab = signal<'requests' | 'elements' | 'timeline' | 'swaps' | 'errors'>('requests')
export const selectedRequestId = signal<string | null>(null)
export const searchQuery = signal('')
export const pickedSelector = signal<string>('')

// ---- Derived state ----

export const selectedRequest = computed(() => {
  const id = selectedRequestId.value
  if (!id) return null
  return requests.value.find(r => r.id === id) ?? null
})

export const filteredRequests = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return requests.value
  return requests.value.filter(r =>
    r.url.toLowerCase().includes(q) ||
    r.verb.toLowerCase().includes(q) ||
    r.triggerElement.selector.toLowerCase().includes(q)
  )
})

export const filteredEvents = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return events.value
  return events.value.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.element.selector.toLowerCase().includes(q)
  )
})

export const errorCount = computed(() => errors.value.length)

// ---- Actions ----

export function upsertRequest(request: RequestLifecycle): void {
  const current = requests.value
  const idx = current.findIndex(r => r.id === request.id)
  if (idx >= 0) {
    const updated = [...current]
    updated[idx] = request
    requests.value = updated
  } else {
    requests.value = [...current, request]
  }
}

export function addEvent(event: CapturedEvent): void {
  events.value = [...events.value, event]
}

export function addError(error: ErrorInfo): void {
  errors.value = [...errors.value, error]
}

export function clearAll(): void {
  requests.value = []
  events.value = []
  errors.value = []
  inspectedElement.value = null
  selectedRequestId.value = null
  htmxElements.value = []
  // Swap records are cleared via onClear callbacks
  for (const cb of onClearCallbacks) cb()
}

const onClearCallbacks: Array<() => void> = []
export function onClear(cb: () => void): void {
  onClearCallbacks.push(cb)
}

export function initState(data: {
  requests: RequestLifecycle[]
  events: CapturedEvent[]
  errors: ErrorInfo[]
  pageInfo: HtmxPageInfo | null
}): void {
  requests.value = data.requests
  events.value = data.events
  errors.value = data.errors
  pageInfo.value = data.pageInfo
}
