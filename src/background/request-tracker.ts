import type { RequestLifecycle, CapturedEvent, ElementDescriptor, ErrorInfo } from '../shared/types'
import { createRequestLifecycle, applyEventToRequest, getPhaseForEvent } from '../shared/request-grouper'
import * as store from './state-store'

let syntheticErrorId = 100000

export function handleRequestUpdate(
  tabId: number,
  update: Partial<RequestLifecycle> & { id: string },
): RequestLifecycle {
  let request = store.getRequest(tabId, update.id)

  if (!request) {
    request = createRequestLifecycle(
      update.id,
      update.triggerElement ?? {
        devtoolsId: 0,
        tagName: 'unknown',
        id: '',
        classList: [],
        htmxAttributes: {},
        selector: '',
        outerHtmlPreview: '',
      },
      0,
    )
  }

  // Merge update fields
  if (update.verb != null) request.verb = update.verb
  if (update.url != null) request.url = update.url
  if (update.finalUrl != null) request.finalUrl = update.finalUrl
  if (update.triggerElement != null) request.triggerElement = update.triggerElement
  if (update.targetElement !== undefined) request.targetElement = update.targetElement
  if (update.httpStatus != null) {
    request.httpStatus = update.httpStatus
    // Synthesize error for HTTP 4xx/5xx (htmx 4 doesn't fire htmx:error for these)
    if (update.httpStatus >= 400 && request.status !== 'error') {
      request.status = 'error'
      const httpError: ErrorInfo = {
        id: syntheticErrorId++,
        severity: 'error',
        type: 'httpError',
        message: `HTTP ${update.httpStatus} from ${request.url}`,
        element: request.triggerElement,
        requestId: request.id,
        timestamp: Date.now(),
        eventName: 'htmx:httpError',
      }
      request.errors.push(httpError)
      store.addError(tabId, httpError)
    }
  }
  if (update.requestHeaders != null) request.requestHeaders = update.requestHeaders
  if (update.responseHeaders != null) {
    request.responseHeaders = { ...request.responseHeaders, ...update.responseHeaders }
  }
  if (update.requestBody !== undefined) request.requestBody = update.requestBody
  if (update.responseBody != null) request.responseBody = update.responseBody
  if (update.swapStrategy != null) request.swapStrategy = update.swapStrategy
  if (update.timing) {
    const merged = { ...request.timing, ...update.timing }
    // Keep earliest triggerAt (0 means unset)
    if (request.timing.triggerAt > 0 && merged.triggerAt > request.timing.triggerAt) {
      merged.triggerAt = request.timing.triggerAt
    }
    request.timing = merged
  }

  store.upsertRequest(tabId, request)
  return request
}

export function handleDomSnapshot(
  tabId: number,
  data: { requestId: string; phase: 'before' | 'after'; html: string },
): void {
  const request = store.getRequest(tabId, data.requestId)
  if (!request) return

  if (data.phase === 'before') {
    request.domBefore = data.html
  } else {
    request.domAfter = data.html
  }

  store.upsertRequest(tabId, request)
}

export function handleEventForRequest(
  tabId: number,
  event: CapturedEvent,
): RequestLifecycle | null {
  if (!event.requestId) return null

  let request = store.getRequest(tabId, event.requestId)
  if (!request) {
    // Create a minimal request so events aren't lost
    request = createRequestLifecycle(event.requestId, event.element, event.timestamp)
    store.upsertRequest(tabId, request)
  }

  applyEventToRequest(request, event, event.detail as Record<string, unknown>)
  store.upsertRequest(tabId, request)
  return request
}
