// ============================================================
// Element Serialization
// ============================================================

export interface ElementDescriptor {
  devtoolsId: number
  tagName: string
  id: string
  classList: string[]
  htmxAttributes: Record<string, string>
  selector: string
  outerHtmlPreview: string
}

// ============================================================
// Request Lifecycle
// ============================================================

export type RequestPhase =
  | 'trigger'
  | 'configuring'
  | 'sending'
  | 'loading'
  | 'swapping'
  | 'settling'
  | 'complete'
  | 'error'

export type RequestStatus = 'pending' | 'success' | 'error' | 'aborted' | 'timeout'

export interface RequestTiming {
  triggerAt: number
  configuredAt: number | null
  sentAt: number | null
  responseAt: number | null
  swapStartAt: number | null
  swapEndAt: number | null
  settledAt: number | null
  completedAt: number | null
}

export interface OobSwapInfo {
  targetElement: ElementDescriptor
  swapStrategy: string
  content: string
}

export interface RequestLifecycle {
  id: string
  seq: number
  verb: string
  url: string
  finalUrl: string
  triggerElement: ElementDescriptor
  targetElement: ElementDescriptor | null
  phase: RequestPhase
  status: RequestStatus
  httpStatus: number | null
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBody: Record<string, string> | null
  responseBody: string | null
  swapStrategy: string
  domBefore: string | null
  domAfter: string | null
  oobSwaps: OobSwapInfo[]
  timing: RequestTiming
  events: CapturedEvent[]
  errors: ErrorInfo[]
}

// ============================================================
// Events
// ============================================================

export interface CapturedEvent {
  id: number
  name: string
  timestamp: number
  element: ElementDescriptor
  detail: Record<string, unknown>
  requestId: string | null
}

// ============================================================
// Errors
// ============================================================

export type ErrorSeverity = 'error' | 'warning'

export interface ErrorInfo {
  id: number
  severity: ErrorSeverity
  type: string
  message: string
  element: ElementDescriptor | null
  requestId: string | null
  timestamp: number
  eventName: string
}

// ============================================================
// Element Inspector
// ============================================================

export interface InspectedElement {
  descriptor: ElementDescriptor
  resolvedTargets: Record<string, ElementDescriptor | null>
  internalData: Record<string, unknown>
  requestHistory: string[]
}

// ============================================================
// Page Info
// ============================================================

export interface HtmxPageInfo {
  detected: boolean
  version: string | null
  config: Record<string, unknown>
  extensionCount: number
}

// ============================================================
// Message Protocol
// ============================================================

export const MESSAGE_SOURCE = '__htmx_devtools__' as const

// Page Script -> Content Script (via window.postMessage)
export type PageMessage =
  | { source: typeof MESSAGE_SOURCE; type: 'htmx:event'; payload: CapturedEvent }
  | { source: typeof MESSAGE_SOURCE; type: 'htmx:request-update'; payload: Partial<RequestLifecycle> & { id: string } }
  | { source: typeof MESSAGE_SOURCE; type: 'htmx:error'; payload: ErrorInfo }
  | { source: typeof MESSAGE_SOURCE; type: 'htmx:page-info'; payload: HtmxPageInfo }
  | { source: typeof MESSAGE_SOURCE; type: 'htmx:dom-snapshot'; payload: { requestId: string; phase: 'before' | 'after'; html: string } }
  | { source: typeof MESSAGE_SOURCE; type: 'htmx:element-inspected'; payload: InspectedElement }
  | { source: typeof MESSAGE_SOURCE; type: 'htmx:element-list'; payload: ElementDescriptor[] }
  | { source: typeof MESSAGE_SOURCE; type: 'htmx:element-picked'; payload: { selector: string } }

// Background -> Panel (via Port)
export type PanelMessage =
  | { type: 'state:init'; payload: { requests: RequestLifecycle[]; events: CapturedEvent[]; errors: ErrorInfo[]; pageInfo: HtmxPageInfo | null } }
  | { type: 'state:event'; payload: CapturedEvent }
  | { type: 'state:request'; payload: RequestLifecycle }
  | { type: 'state:error'; payload: ErrorInfo }
  | { type: 'state:page-info'; payload: HtmxPageInfo }
  | { type: 'state:element-inspected'; payload: InspectedElement }
  | { type: 'state:element-list'; payload: ElementDescriptor[] }
  | { type: 'state:context-action'; payload: { action: string } }
  | { type: 'state:element-picked'; payload: { selector: string } }
  | { type: 'state:clear'; payload: null }

// Panel -> Background -> Content -> Page (commands)
export type CommandMessage =
  | { type: 'cmd:inspect-element'; payload: { selector: string } }
  | { type: 'cmd:highlight-element'; payload: { selector: string; action: 'show' | 'hide' } }
  | { type: 'cmd:clear'; payload: null }
  | { type: 'cmd:get-page-info'; payload: null }
  | { type: 'cmd:enable-snapshots'; payload: boolean }
  | { type: 'cmd:scan-elements'; payload: null }

// Content -> Background (wraps PageMessage with tab context)
export interface ContentToBackgroundMessage {
  source: typeof MESSAGE_SOURCE
  type: string
  payload: unknown
  tabId?: number
}

// Background -> Content (wraps CommandMessage)
export interface BackgroundToContentMessage {
  source: typeof MESSAGE_SOURCE
  type: string
  payload: unknown
}
