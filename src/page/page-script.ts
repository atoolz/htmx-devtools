import { HTMX_EVENTS, ERROR_EVENTS, LIMITS, REQUEST_START_EVENTS } from '../shared/constants'
import { serializeElement, serializeDetail, getElementId } from '../shared/serializer'
import type { CapturedEvent, ElementDescriptor, ErrorInfo, HtmxPageInfo, PageMessage } from '../shared/types'
import { MESSAGE_SOURCE } from '../shared/types'

let eventIdCounter = 0
let snapshotsEnabled = true

const xhrToRequestId = new WeakMap<XMLHttpRequest, string>()
const ctxToRequestId = new WeakMap<object, string>() // htmx 4: track by ctx object
const elementToRequestId = new WeakMap<Element, string>()

// ---- Batching ----

let pendingMessages: PageMessage[] = []
let batchTimer: ReturnType<typeof setTimeout> | null = null

function postMessage(msg: PageMessage): void {
  pendingMessages.push(msg)
  if (!batchTimer) {
    batchTimer = setTimeout(flushMessages, LIMITS.EVENT_BATCH_MS)
  }
}

function safeClone(obj: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return null
  }
}

function flushMessages(): void {
  batchTimer = null
  const batch = pendingMessages
  pendingMessages = []
  for (const msg of batch) {
    try {
      // Deep clone via JSON to strip non-cloneable objects (FormData, proxies, etc.)
      const safe = safeClone(msg)
      if (safe) window.postMessage(safe, '*')
    } catch {
      // Skip uncloneable messages
    }
  }
}

// ---- Request ID management ----

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function getRequestIdForEvent(detail: Record<string, unknown>): string | null {
  // htmx 4: try ctx object first (shared across all events in a request)
  const ctx = detail.ctx as object | undefined
  if (ctx) {
    const id = ctxToRequestId.get(ctx)
    if (id) return id
  }
  // htmx 2: try xhr
  const xhr = detail.xhr as XMLHttpRequest | undefined
  if (xhr) {
    const id = xhrToRequestId.get(xhr)
    if (id) return id
  }
  // Try element (both v2 and v4)
  const elt = (detail.elt ?? (detail.ctx as any)?.sourceElement) as Element | undefined
  if (elt) {
    const id = elementToRequestId.get(elt)
    if (id) return id
    // Fallback: internal data
    try {
      const internalReqId = ((elt as any)['htmx-internal-data'] ?? (elt as any)._htmx)?.__devtools_req_id
      if (internalReqId) return internalReqId
    } catch { /* noop */ }
  }
  return null
}

// ---- DOM Snapshots ----

function captureSnapshot(requestId: string, phase: 'before' | 'after', target: Element): void {
  if (!snapshotsEnabled) return
  let html = target.outerHTML
  if (html.length > LIMITS.MAX_DOM_SNAPSHOT) {
    html = html.slice(0, LIMITS.MAX_DOM_SNAPSHOT) + '\n<!-- truncated -->'
  }
  postMessage({
    source: MESSAGE_SOURCE,
    type: 'htmx:dom-snapshot',
    payload: { requestId, phase, html },
  })
}

// ---- Event Handler ----

function handleHtmxEvent(event: Event): void {
  const ce = event as CustomEvent
  const eventName = ce.type
  const detail = ce.detail ?? {}
  const target = (ce.target ?? ce.detail?.elt ?? document.body) as Element

  const serializedElement = serializeElement(target)
  const serializedDetail = serializeDetail(detail)

  let requestId: string | null = null

  // At configRequest (2.x) or config:request (4.0), assign a new request ID
  if (REQUEST_START_EVENTS.has(eventName)) {
    requestId = generateRequestId()
    // htmx 4.0 uses detail.ctx.sourceElement, htmx 2.x uses detail.elt
    const elt = (detail.elt ?? detail.ctx?.sourceElement) as Element | undefined
    const xhr = detail.xhr as XMLHttpRequest | undefined
    if (elt) {
      elementToRequestId.set(elt, requestId)
      // Stash on internal data for cross-reference (htmx 2.x: htmx-internal-data, 4.0: _htmx)
      try {
        const internalData = (elt as any)['htmx-internal-data'] ?? (elt as any)._htmx
        if (internalData) {
          internalData.__devtools_req_id = requestId
          if (!internalData.__devtools_req_history) internalData.__devtools_req_history = []
          internalData.__devtools_req_history.push(requestId)
          // Keep last 20 to avoid unbounded growth
          if (internalData.__devtools_req_history.length > 20) {
            internalData.__devtools_req_history = internalData.__devtools_req_history.slice(-20)
          }
        }
      } catch { /* noop */ }
    }
    if (xhr) xhrToRequestId.set(xhr, requestId)
    // htmx 4: track by ctx object (shared across all events in a request lifecycle)
    if (detail.ctx && typeof detail.ctx === 'object') {
      ctxToRequestId.set(detail.ctx as object, requestId)
    }

    // Build request-update with config details
    const triggerEl = (elt ?? target) as Element
    const targetEl = detail.target as Element | undefined

    // Safely extract headers (htmx 2.x: detail.headers, 4.0: detail.ctx.request.headers)
    let safeHeaders: Record<string, string> = {}
    try {
      const h = detail.headers ?? detail.ctx?.request?.headers
      if (h && typeof h === 'object') safeHeaders = JSON.parse(JSON.stringify(h))
    } catch { /* noop */ }

    // Safely extract parameters (htmx 2.x: detail.parameters, 4.0: detail.ctx.request.body)
    let safeParams: Record<string, string> | null = null
    try {
      const p = detail.parameters ?? detail.ctx?.request?.body
      if (p instanceof FormData) {
        safeParams = {}
        p.forEach((v, k) => { safeParams![k] = String(v) })
      } else if (p && typeof p === 'object') {
        safeParams = JSON.parse(JSON.stringify(p))
      }
    } catch { /* noop */ }

    // htmx 2.x: detail.verb/path, 4.0: detail.ctx.request.method/action
    const verb = (detail.verb ?? detail.ctx?.request?.method) as string || ''
    const url = (detail.path ?? detail.ctx?.request?.action) as string || ''

    postMessage({
      source: MESSAGE_SOURCE,
      type: 'htmx:request-update',
      payload: {
        id: requestId,
        verb,
        url,
        triggerElement: serializeElement(triggerEl),
        targetElement: targetEl ? serializeElement(targetEl) : null,
        requestHeaders: safeHeaders,
        requestBody: safeParams,
        timing: { triggerAt: Date.now(), configuredAt: null, sentAt: null, responseAt: null, swapStartAt: null, swapEndAt: null, settledAt: null, completedAt: null },
      },
    })
  } else {
    requestId = getRequestIdForEvent(detail)

    // Fallback: try element's internal data
    if (!requestId) {
      const elt = (detail.elt ?? target) as Element | undefined
      if (elt) {
        try {
          const internalReqId = ((elt as any)['htmx-internal-data'] ?? (elt as any)._htmx)?.__devtools_req_id
          if (internalReqId) requestId = internalReqId
        } catch { /* noop */ }
      }
    }

    // Link XHR/ctx to request ID if we haven't yet
    if (requestId) {
      if (detail.xhr instanceof XMLHttpRequest && !xhrToRequestId.has(detail.xhr)) {
        xhrToRequestId.set(detail.xhr, requestId)
      }
      if (detail.ctx && typeof detail.ctx === 'object' && !ctxToRequestId.has(detail.ctx as object)) {
        ctxToRequestId.set(detail.ctx as object, requestId)
      }
    }
  }

  // DOM snapshots for swap visualizer (htmx 2.x and 4.0 event names)
  if ((eventName === 'htmx:beforeSwap' || eventName === 'htmx:before:swap') && requestId) {
    const swapTarget = (detail.target ?? detail.ctx?.target) as Element | undefined
    if (swapTarget) captureSnapshot(requestId, 'before', swapTarget)
  }
  if ((eventName === 'htmx:afterSwap' || eventName === 'htmx:after:swap') && requestId) {
    const swapTarget = (detail.target ?? detail.ctx?.target) as Element | undefined
    if (swapTarget) captureSnapshot(requestId, 'after', swapTarget)
  }

  // Capture response info
  // htmx 2.x: htmx:beforeOnLoad/afterRequest with detail.xhr
  // htmx 4.0: htmx:after:request with detail.ctx.response
  const isResponseEvent = eventName === 'htmx:beforeOnLoad' || eventName === 'htmx:afterRequest'
    || eventName === 'htmx:after:request'

  if (isResponseEvent && requestId) {
    // htmx 4.0: use detail.ctx
    const ctx = detail.ctx as Record<string, any> | undefined
    if (ctx?.response) {
      let responseBody = ctx.text || ''
      if (responseBody.length > LIMITS.MAX_RESPONSE_BODY) {
        responseBody = responseBody.slice(0, LIMITS.MAX_RESPONSE_BODY) + '\n<!-- truncated -->'
      }
      const responseHeaders: Record<string, string> = {}
      try {
        const headers = ctx.response.headers
        if (headers?.forEach) {
          headers.forEach((val: string, key: string) => {
            if (key.toLowerCase().startsWith('hx-') || key.toLowerCase() === 'content-type') {
              responseHeaders[key] = val
            }
          })
        }
      } catch { /* noop */ }
      postMessage({
        source: MESSAGE_SOURCE,
        type: 'htmx:request-update',
        payload: {
          id: requestId,
          httpStatus: ctx.response.status,
          responseBody,
          responseHeaders,
        },
      })
    }

    // htmx 2.x: use detail.xhr
    const xhr = detail.xhr as XMLHttpRequest | undefined
    if (xhr) {
      let responseBody = ''
      try { responseBody = xhr.responseText } catch { /* noop */ }
      if (responseBody.length > LIMITS.MAX_RESPONSE_BODY) {
        responseBody = responseBody.slice(0, LIMITS.MAX_RESPONSE_BODY) + '\n<!-- truncated -->'
      }

      const responseHeaders: Record<string, string> = {}
      try {
        const headerStr = xhr.getAllResponseHeaders()
        for (const line of headerStr.split('\r\n')) {
          const idx = line.indexOf(':')
          if (idx > 0) {
            const key = line.slice(0, idx).trim()
            const val = line.slice(idx + 1).trim()
            if (key.toLowerCase().startsWith('hx-') || key.toLowerCase() === 'content-type') {
              responseHeaders[key] = val
            }
          }
        }
      } catch { /* noop */ }

      postMessage({
        source: MESSAGE_SOURCE,
        type: 'htmx:request-update',
        payload: {
          id: requestId,
          httpStatus: xhr.status,
          responseBody,
          responseHeaders,
        },
      })
    }
  }

  // Build captured event
  const captured: CapturedEvent = {
    id: eventIdCounter++,
    name: eventName,
    timestamp: Date.now(),
    element: serializedElement,
    detail: serializedDetail,
    requestId,
  }

  postMessage({
    source: MESSAGE_SOURCE,
    type: 'htmx:event',
    payload: captured,
  })

  // Error events
  if (ERROR_EVENTS.has(eventName)) {
    const error: ErrorInfo = {
      id: captured.id,
      severity: 'error',
      type: eventName.replace('htmx:', ''),
      message: (detail.error as string) || (detail.message as string) || eventName,
      element: serializedElement,
      requestId,
      timestamp: captured.timestamp,
      eventName,
    }
    postMessage({
      source: MESSAGE_SOURCE,
      type: 'htmx:error',
      payload: error,
    })
  }
}

// ---- Commands from DevTools ----

window.addEventListener('message', (event) => {
  if (event.data?.source !== MESSAGE_SOURCE) return
  if (!event.data?.type?.startsWith('cmd:')) return

  const { type, payload } = event.data

  if (type === 'cmd:start-picker') {
    let overlay = document.getElementById('__htmx_dt_picker__')
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = '__htmx_dt_picker__'
      overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #3b82f6;background:rgba(59,130,246,0.1);transition:all 0.1s ease;display:none;'
      document.body.appendChild(overlay)
    }
    let label = document.getElementById('__htmx_dt_picker_label__')
    if (!label) {
      label = document.createElement('div')
      label.id = '__htmx_dt_picker_label__'
      label.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;background:#3b82f6;color:#fff;font-size:11px;font-family:monospace;padding:2px 6px;border-radius:2px;display:none;white-space:nowrap;'
      document.body.appendChild(label)
    }
    function getHxSummary(el: Element): string {
      const hx: string[] = []
      for (const attr of el.attributes) {
        if (attr.name.startsWith('hx-')) hx.push(attr.name)
      }
      return hx.length ? ' [' + hx.join(', ') + ']' : ''
    }
    function onMove(e: MouseEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el) return
      const rect = el.getBoundingClientRect()
      overlay!.style.display = 'block'
      overlay!.style.top = `${rect.top}px`
      overlay!.style.left = `${rect.left}px`
      overlay!.style.width = `${rect.width}px`
      overlay!.style.height = `${rect.height}px`
      const tag = el.tagName.toLowerCase()
      label!.textContent = `<${tag}${el.id ? '#' + el.id : ''}>${getHxSummary(el)}`
      label!.style.display = 'block'
      label!.style.top = `${Math.max(0, rect.top - 20)}px`
      label!.style.left = `${rect.left}px`
    }
    function cleanup() {
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey, true)
      overlay!.style.display = 'none'
      label!.style.display = 'none'
    }
    function uniqueSelector(el: Element): string {
      if (el.id) return '#' + CSS.escape(el.id)
      const parts: string[] = []
      let cur: Element | null = el
      while (cur && cur !== document.body && cur !== document.documentElement) {
        if (cur.id) {
          parts.unshift('#' + CSS.escape(cur.id))
          break
        }
        let tag = cur.tagName.toLowerCase()
        if (cur.parentElement) {
          const siblings = Array.from(cur.parentElement.children).filter(s => s.tagName === cur!.tagName)
          if (siblings.length > 1) {
            const idx = siblings.indexOf(cur) + 1
            tag += `:nth-of-type(${idx})`
          }
        }
        parts.unshift(tag)
        cur = cur.parentElement
      }
      if (parts.length === 0) return el.tagName.toLowerCase()
      return parts.join(' > ')
    }
    function onClick(e: MouseEvent) {
      e.preventDefault()
      e.stopPropagation()
      cleanup()
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el) return
      const sel = uniqueSelector(el)
      window.postMessage({ source: MESSAGE_SOURCE, type: 'htmx:element-picked', payload: { selector: sel } }, '*')
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup()
        window.postMessage({ source: MESSAGE_SOURCE, type: 'htmx:element-picked', payload: { selector: '' } }, '*')
      }
    }
    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey, true)
    return
  }

  if (type === 'cmd:scan-elements') {
    const selectors = '[hx-get],[hx-post],[hx-put],[hx-delete],[hx-patch],[hx-trigger],[hx-swap],[hx-target],[hx-boost],[hx-push-url],[hx-select],[hx-ext],[data-hx-get],[data-hx-post],[data-hx-put],[data-hx-delete]'
    const elements = document.querySelectorAll(selectors)
    const list = Array.from(elements).map(el => serializeElement(el))
    try {
      window.postMessage(safeClone({
        source: MESSAGE_SOURCE,
        type: 'htmx:element-list',
        payload: list,
      }), '*')
    } catch { /* skip */ }
    return
  }

  if (type === 'cmd:clear') {
    eventIdCounter = 0
    snapshotsEnabled = true
    pendingMessages = []
    if (batchTimer) {
      clearTimeout(batchTimer)
      batchTimer = null
    }
    return
  }

  if (type === 'cmd:enable-snapshots') {
    snapshotsEnabled = payload as boolean
    return
  }

  if (type === 'cmd:get-page-info') {
    const htmx = (window as any).htmx
    const info: HtmxPageInfo = {
      detected: !!htmx,
      version: htmx?.version ?? null,
      config: htmx?.config ? { ...htmx.config } : {},
      extensionCount: 0,
    }
    postMessage({
      source: MESSAGE_SOURCE,
      type: 'htmx:page-info',
      payload: info,
    })
    return
  }

  if (type === 'cmd:inspect-element') {
    const { selector } = payload as { selector: string }
    const el = document.querySelector(selector)
    if (!el) return

    const htmxAttrs = {} as Record<string, string>
    for (const attr of el.attributes) {
      if (attr.name.startsWith('hx-') || attr.name.startsWith('data-hx-')) {
        htmxAttrs[attr.name] = attr.value
      }
    }

    // Resolve hx-target
    const resolvedTargets: Record<string, ElementDescriptor | null> = {}
    const hxTarget = el.getAttribute('hx-target') || el.getAttribute('data-hx-target')
    if (hxTarget) {
      let targetEl: Element | null = null
      if (hxTarget === 'this') {
        targetEl = el
      } else if (hxTarget.startsWith('closest ')) {
        targetEl = el.closest(hxTarget.slice(8))
      } else if (hxTarget.startsWith('find ')) {
        targetEl = el.querySelector(hxTarget.slice(5))
      } else if (hxTarget.startsWith('next ')) {
        targetEl = el.nextElementSibling
      } else if (hxTarget.startsWith('previous ')) {
        targetEl = el.previousElementSibling
      } else {
        targetEl = document.querySelector(hxTarget)
      }
      resolvedTargets['hx-target'] = targetEl ? serializeElement(targetEl) : null
    }

    const internalData: Record<string, unknown> = {}
    try {
      const data = (el as any)['htmx-internal-data'] ?? (el as any)._htmx
      if (data) {
        for (const key of Object.keys(data)) {
          const val = data[key]
          if (val instanceof XMLHttpRequest) internalData[key] = '[XMLHttpRequest]'
          else if (typeof val === 'function') internalData[key] = '[Function]'
          else if (val instanceof WeakMap) internalData[key] = '[WeakMap]'
          else {
            try { JSON.stringify(val); internalData[key] = val }
            catch { internalData[key] = String(val) }
          }
        }
      }
    } catch { /* noop */ }

    const internalRef = (el as any)['htmx-internal-data'] ?? (el as any)._htmx
    const requestHistory: string[] = internalRef?.__devtools_req_history ?? (internalRef?.__devtools_req_id ? [internalRef.__devtools_req_id] : [])

    postMessage({
      source: MESSAGE_SOURCE,
      type: 'htmx:element-inspected',
      payload: {
        descriptor: serializeElement(el),
        resolvedTargets,
        internalData,
        requestHistory,
      },
    })
    return
  }

  if (type === 'cmd:highlight-element') {
    const { selector, action } = payload as { selector: string; action: 'show' | 'hide' }
    const overlayId = '__htmx_devtools_overlay__'
    let overlay = document.getElementById(overlayId)

    if (action === 'hide') {
      overlay?.remove()
      return
    }

    const el = document.querySelector(selector)
    if (!el) return

    const rect = el.getBoundingClientRect()

    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = overlayId
      overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #3b82f6;background:rgba(59,130,246,0.1);transition:all 0.15s ease;'
      document.body.appendChild(overlay)
    }

    overlay.style.top = `${rect.top}px`
    overlay.style.left = `${rect.left}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`
    return
  }
})

// ---- Initialize ----

function init(): void {
  // Listen to all htmx events
  for (const eventName of HTMX_EVENTS) {
    document.addEventListener(eventName, handleHtmxEvent, { capture: true })
  }

  // Detect htmx and send page info
  const checkHtmx = () => {
    const htmx = (window as any).htmx
    if (htmx) {
      postMessage({
        source: MESSAGE_SOURCE,
        type: 'htmx:page-info',
        payload: {
          detected: true,
          version: htmx.version ?? null,
          config: htmx.config ? { ...htmx.config } : {},
          extensionCount: 0,
        },
      })
    }
  }

  // Check immediately and after a short delay (htmx may load async)
  checkHtmx()
  setTimeout(checkHtmx, 1000)
  setTimeout(checkHtmx, 3000)
}

init()
