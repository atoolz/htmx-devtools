// htmx 2.x events
export const HTMX2_EVENTS = [
  'htmx:beforeProcessNode', 'htmx:afterProcessNode', 'htmx:load',
  'htmx:confirm', 'htmx:prompt',
  'htmx:configRequest', 'htmx:beforeRequest', 'htmx:beforeSend',
  'htmx:afterRequest', 'htmx:afterOnLoad',
  'htmx:xhr:loadstart', 'htmx:xhr:loadend', 'htmx:xhr:progress', 'htmx:xhr:abort',
  'htmx:beforeOnLoad', 'htmx:beforeSwap', 'htmx:afterSwap', 'htmx:afterSettle',
  'htmx:oobBeforeSwap', 'htmx:oobAfterSwap',
  'htmx:beforeHistoryUpdate', 'htmx:pushedIntoHistory', 'htmx:replacedInHistory',
  'htmx:beforeTransition',
  'htmx:sendError', 'htmx:sendAbort', 'htmx:timeout',
  'htmx:responseError', 'htmx:targetError', 'htmx:swapError',
  'htmx:onLoadError', 'htmx:invalidPath', 'htmx:eventFilter:error',
  'htmx:validation:halted',
] as const

// htmx 4.0 events (colon-namespaced)
export const HTMX4_EVENTS = [
  'htmx:abort',
  'htmx:after:cleanup', 'htmx:after:history:push', 'htmx:after:history:replace',
  'htmx:after:history:update', 'htmx:after:implicitInheritance',
  'htmx:after:init', 'htmx:after:process', 'htmx:after:request',
  'htmx:after:settle', 'htmx:after:swap', 'htmx:after:viewTransition',
  'htmx:before:cleanup', 'htmx:before:history:restore', 'htmx:before:history:update',
  'htmx:before:init', 'htmx:before:morph:node', 'htmx:before:process',
  'htmx:before:request', 'htmx:before:response', 'htmx:before:settle',
  'htmx:before:swap', 'htmx:before:viewTransition',
  'htmx:config:request', 'htmx:confirm', 'htmx:error', 'htmx:finally:request',
] as const

// Combined: listen to both for dual-version support
export const HTMX_EVENTS = [...new Set([...HTMX2_EVENTS, ...HTMX4_EVENTS])] as const

export const ERROR_EVENTS = new Set([
  // htmx 2.x errors
  'htmx:sendError', 'htmx:sendAbort', 'htmx:timeout',
  'htmx:responseError', 'htmx:targetError', 'htmx:swapError',
  'htmx:onLoadError', 'htmx:invalidPath', 'htmx:eventFilter:error',
  'htmx:validation:halted',
  // htmx 4.0 error (all consolidated into one)
  'htmx:error',
])

// htmx 2.x uses htmx:configRequest, htmx 4.0 uses htmx:config:request
export const REQUEST_START_EVENTS = new Set([
  'htmx:configRequest',
  'htmx:config:request',
])

// Keep for backward compat
export const REQUEST_START_EVENT = 'htmx:configRequest'

export const EVENT_CATEGORIES: Record<string, string> = {
  // htmx 2.x events
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
  // htmx 4.0 events
  'htmx:abort': 'request',
  'htmx:before:init': 'init',
  'htmx:after:init': 'init',
  'htmx:before:process': 'init',
  'htmx:after:process': 'init',
  'htmx:config:request': 'request',
  'htmx:before:request': 'request',
  'htmx:before:response': 'response',
  'htmx:after:request': 'request',
  'htmx:finally:request': 'request',
  'htmx:before:swap': 'swap',
  'htmx:after:swap': 'swap',
  'htmx:before:settle': 'swap',
  'htmx:after:settle': 'swap',
  'htmx:before:cleanup': 'init',
  'htmx:after:cleanup': 'init',
  'htmx:before:history:update': 'history',
  'htmx:after:history:update': 'history',
  'htmx:before:history:restore': 'history',
  'htmx:after:history:push': 'history',
  'htmx:after:history:replace': 'history',
  'htmx:before:viewTransition': 'transition',
  'htmx:after:viewTransition': 'transition',
  'htmx:before:morph:node': 'swap',
  'htmx:after:implicitInheritance': 'init',
  'htmx:error': 'error',
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
