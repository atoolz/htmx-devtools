import type { RequestLifecycle, CapturedEvent, ErrorInfo, HtmxPageInfo } from '../shared/types'
import { LIMITS } from '../shared/constants'

export interface TabState {
  requests: Map<string, RequestLifecycle>
  requestOrder: string[]
  events: CapturedEvent[]
  errors: ErrorInfo[]
  pageInfo: HtmxPageInfo | null
}

function createTabState(): TabState {
  return {
    requests: new Map(),
    requestOrder: [],
    events: [],
    errors: [],
    pageInfo: null,
  }
}

const tabStates = new Map<number, TabState>()

export function getTabState(tabId: number): TabState {
  let state = tabStates.get(tabId)
  if (!state) {
    state = createTabState()
    tabStates.set(tabId, state)
  }
  return state
}

export function clearTabState(tabId: number): void {
  tabStates.set(tabId, createTabState())
}

export function removeTabState(tabId: number): void {
  tabStates.delete(tabId)
}

export function addEvent(tabId: number, event: CapturedEvent): void {
  const state = getTabState(tabId)
  state.events.push(event)
  if (state.events.length > LIMITS.MAX_EVENTS) {
    state.events = state.events.slice(-LIMITS.MAX_EVENTS)
  }
}

export function addError(tabId: number, error: ErrorInfo): void {
  const state = getTabState(tabId)
  state.errors.push(error)
  if (state.errors.length > LIMITS.MAX_ERRORS) {
    state.errors = state.errors.slice(-LIMITS.MAX_ERRORS)
  }
}

export function upsertRequest(tabId: number, request: RequestLifecycle): void {
  const state = getTabState(tabId)
  if (!state.requests.has(request.id)) {
    state.requestOrder.push(request.id)
    if (state.requestOrder.length > LIMITS.MAX_REQUESTS) {
      const removed = state.requestOrder.shift()!
      state.requests.delete(removed)
    }
  }
  state.requests.set(request.id, request)
}

export function getRequest(tabId: number, requestId: string): RequestLifecycle | undefined {
  return getTabState(tabId).requests.get(requestId)
}

export function setPageInfo(tabId: number, info: HtmxPageInfo): void {
  getTabState(tabId).pageInfo = info
}

export function getSnapshot(tabId: number): {
  requests: RequestLifecycle[]
  events: CapturedEvent[]
  errors: ErrorInfo[]
  pageInfo: HtmxPageInfo | null
} {
  const state = getTabState(tabId)
  return {
    requests: state.requestOrder.map(id => state.requests.get(id)!).filter(Boolean),
    events: state.events,
    errors: state.errors,
    pageInfo: state.pageInfo,
  }
}
