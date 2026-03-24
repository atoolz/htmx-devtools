import type { RequestLifecycle, RequestPhase, RequestStatus, RequestTiming, CapturedEvent, ErrorInfo, ElementDescriptor } from './types'
import { ERROR_EVENTS } from './constants'

export function createEmptyTiming(): RequestTiming {
  return {
    triggerAt: 0,
    configuredAt: null,
    sentAt: null,
    responseAt: null,
    swapStartAt: null,
    swapEndAt: null,
    settledAt: null,
    completedAt: null,
  }
}

let seqCounter = 0

export function createRequestLifecycle(
  id: string,
  triggerElement: ElementDescriptor,
  timestamp: number,
): RequestLifecycle {
  return {
    id,
    seq: seqCounter++,
    verb: '',
    url: '',
    finalUrl: '',
    triggerElement,
    targetElement: null,
    phase: 'trigger',
    status: 'pending',
    httpStatus: null,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: null,
    responseBody: null,
    swapStrategy: 'innerHTML',
    domBefore: null,
    domAfter: null,
    oobSwaps: [],
    timing: { ...createEmptyTiming(), triggerAt: timestamp },
    events: [],
    errors: [],
  }
}

export function getPhaseForEvent(eventName: string): RequestPhase | null {
  switch (eventName) {
    case 'htmx:configRequest': return 'configuring'
    case 'htmx:beforeSend':
    case 'htmx:beforeRequest': return 'sending'
    case 'htmx:beforeOnLoad': return 'loading'
    case 'htmx:beforeSwap': return 'swapping'
    case 'htmx:afterSwap': return 'settling'
    case 'htmx:afterSettle': return 'settling'
    case 'htmx:afterRequest': return 'complete'
    default:
      if (ERROR_EVENTS.has(eventName)) return 'error'
      return null
  }
}

export function getStatusForEvent(eventName: string): RequestStatus | null {
  switch (eventName) {
    case 'htmx:afterRequest': return 'success'
    case 'htmx:sendError': return 'error'
    case 'htmx:responseError': return 'error'
    case 'htmx:swapError': return 'error'
    case 'htmx:onLoadError': return 'error'
    case 'htmx:sendAbort': return 'aborted'
    case 'htmx:timeout': return 'timeout'
    default: return null
  }
}

export function updateTimingForEvent(timing: RequestTiming, eventName: string, timestamp: number): void {
  switch (eventName) {
    case 'htmx:configRequest': timing.configuredAt = timestamp; break
    case 'htmx:beforeSend': timing.sentAt = timestamp; break
    case 'htmx:beforeOnLoad': timing.responseAt = timestamp; break
    case 'htmx:beforeSwap': timing.swapStartAt = timestamp; break
    case 'htmx:afterSwap': timing.swapEndAt = timestamp; break
    case 'htmx:afterSettle': timing.settledAt = timestamp; break
    case 'htmx:afterRequest': timing.completedAt = timestamp; break
  }
}

export function applyEventToRequest(
  request: RequestLifecycle,
  event: CapturedEvent,
  detail: Record<string, unknown>,
): void {
  request.events.push(event)
  updateTimingForEvent(request.timing, event.name, event.timestamp)

  const newPhase = getPhaseForEvent(event.name)
  if (newPhase) request.phase = newPhase

  const newStatus = getStatusForEvent(event.name)
  if (newStatus) request.status = newStatus

  if (event.name === 'htmx:configRequest') {
    request.verb = (detail.verb as string) || ''
    request.url = (detail.path as string) || ''
    if (detail.headers && typeof detail.headers === 'object') {
      request.requestHeaders = detail.headers as Record<string, string>
    }
    if (detail.parameters && typeof detail.parameters === 'object') {
      request.requestBody = detail.parameters as Record<string, string>
    }
    if (detail.target && typeof detail.target === 'object' && 'tagName' in (detail.target as object)) {
      request.targetElement = detail.target as ElementDescriptor
    }
  }

  if (event.name === 'htmx:beforeSwap') {
    request.swapStrategy = (detail.swapOverride as string) || request.swapStrategy
  }

  if (event.name === 'htmx:afterRequest' || event.name === 'htmx:beforeOnLoad') {
    const xhr = detail.xhr as Record<string, unknown> | undefined
    if (xhr) {
      request.httpStatus = (xhr.status as number) ?? null
    }
  }

  if (ERROR_EVENTS.has(event.name)) {
    const error: ErrorInfo = {
      id: event.id,
      severity: 'error',
      type: event.name.replace('htmx:', ''),
      message: (detail.error as string) || event.name,
      element: event.element,
      requestId: request.id,
      timestamp: event.timestamp,
      eventName: event.name,
    }
    request.errors.push(error)
  }
}
