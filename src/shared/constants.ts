export const HTMX_EVENTS = [
  // Initialization
  'htmx:beforeProcessNode',
  'htmx:afterProcessNode',
  'htmx:load',

  // Request lifecycle
  'htmx:confirm',
  'htmx:prompt',
  'htmx:configRequest',
  'htmx:beforeRequest',
  'htmx:beforeSend',
  'htmx:afterRequest',
  'htmx:afterOnLoad',

  // XHR progress
  'htmx:xhr:loadstart',
  'htmx:xhr:loadend',
  'htmx:xhr:progress',
  'htmx:xhr:abort',

  // Response handling
  'htmx:beforeOnLoad',
  'htmx:beforeSwap',
  'htmx:afterSwap',
  'htmx:afterSettle',

  // Out-of-band swaps
  'htmx:oobBeforeSwap',
  'htmx:oobAfterSwap',

  // History
  'htmx:beforeHistoryUpdate',
  'htmx:pushedIntoHistory',
  'htmx:replacedInHistory',

  // View transitions
  'htmx:beforeTransition',

  // Errors
  'htmx:sendError',
  'htmx:sendAbort',
  'htmx:timeout',
  'htmx:responseError',
  'htmx:targetError',
  'htmx:swapError',
  'htmx:onLoadError',
  'htmx:invalidPath',
  'htmx:eventFilter:error',
  'htmx:validation:halted',
] as const

export const ERROR_EVENTS = new Set([
  'htmx:sendError',
  'htmx:sendAbort',
  'htmx:timeout',
  'htmx:responseError',
  'htmx:targetError',
  'htmx:swapError',
  'htmx:onLoadError',
  'htmx:invalidPath',
  'htmx:eventFilter:error',
])

export const REQUEST_START_EVENT = 'htmx:configRequest'

export const EVENT_CATEGORIES: Record<string, string> = {
  'htmx:beforeProcessNode': 'init',
  'htmx:afterProcessNode': 'init',
  'htmx:load': 'init',
  'htmx:confirm': 'request',
  'htmx:prompt': 'request',
  'htmx:configRequest': 'request',
  'htmx:beforeRequest': 'request',
  'htmx:beforeSend': 'request',
  'htmx:afterRequest': 'request',
  'htmx:afterOnLoad': 'request',
  'htmx:xhr:loadstart': 'xhr',
  'htmx:xhr:loadend': 'xhr',
  'htmx:xhr:progress': 'xhr',
  'htmx:xhr:abort': 'xhr',
  'htmx:beforeOnLoad': 'response',
  'htmx:beforeSwap': 'swap',
  'htmx:afterSwap': 'swap',
  'htmx:afterSettle': 'swap',
  'htmx:oobBeforeSwap': 'oob',
  'htmx:oobAfterSwap': 'oob',
  'htmx:beforeHistoryUpdate': 'history',
  'htmx:pushedIntoHistory': 'history',
  'htmx:replacedInHistory': 'history',
  'htmx:beforeTransition': 'transition',
  'htmx:sendError': 'error',
  'htmx:sendAbort': 'error',
  'htmx:timeout': 'error',
  'htmx:responseError': 'error',
  'htmx:targetError': 'error',
  'htmx:swapError': 'error',
  'htmx:onLoadError': 'error',
  'htmx:invalidPath': 'error',
  'htmx:eventFilter:error': 'error',
  'htmx:validation:halted': 'error',
}

export const LIMITS = {
  MAX_REQUESTS: 500,
  MAX_EVENTS: 5000,
  MAX_ERRORS: 500,
  MAX_RESPONSE_BODY: 100_000,
  MAX_DOM_SNAPSHOT: 50_000,
  MAX_OUTER_HTML_PREVIEW: 200,
  EVENT_BATCH_MS: 50,
} as const

export const PORT_NAME = 'htmx-devtools-panel'
