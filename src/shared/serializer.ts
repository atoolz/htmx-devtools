import type { ElementDescriptor } from './types'
import { LIMITS } from './constants'

let nextId = 1
const elementIds = new WeakMap<Element, number>()

export function getElementId(el: Element): number {
  let id = elementIds.get(el)
  if (id == null) {
    id = nextId++
    elementIds.set(el, id)
  }
  return id
}

export function buildSelector(el: Element): string {
  if (el.id) {
    return `#${CSS.escape(el.id)}`
  }

  const tag = el.tagName.toLowerCase()
  const classes = Array.from(el.classList)
    .slice(0, 3)
    .map(c => `.${CSS.escape(c)}`)
    .join('')

  const base = `${tag}${classes}`

  if (!el.parentElement) return base

  const siblings = Array.from(el.parentElement.children).filter(
    s => s.tagName === el.tagName
  )
  if (siblings.length === 1) return base

  const index = siblings.indexOf(el) + 1
  return `${base}:nth-of-type(${index})`
}

export function getHtmxAttributes(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const attr of el.attributes) {
    if (attr.name.startsWith('hx-') || attr.name.startsWith('data-hx-')) {
      attrs[attr.name] = attr.value
    }
  }
  return attrs
}

export function serializeElement(el: Element): ElementDescriptor {
  // Guard: if not a real Element, return a safe fallback
  if (!el || typeof el.tagName !== 'string') {
    return {
      devtoolsId: 0,
      tagName: 'unknown',
      id: '',
      classList: [],
      htmxAttributes: {},
      selector: '',
      outerHtmlPreview: '',
    }
  }
  const outerHtml = el.outerHTML || ''
  return {
    devtoolsId: getElementId(el),
    tagName: el.tagName.toLowerCase(),
    id: el.id || '',
    classList: el.classList ? Array.from(el.classList) : [],
    htmxAttributes: getHtmxAttributes(el),
    selector: buildSelector(el),
    outerHtmlPreview: outerHtml.length > LIMITS.MAX_OUTER_HTML_PREVIEW
      ? outerHtml.slice(0, LIMITS.MAX_OUTER_HTML_PREVIEW) + '...'
      : outerHtml,
  }
}

export function serializeDetail(detail: unknown): Record<string, unknown> {
  if (detail == null || typeof detail !== 'object') return {}

  const result: Record<string, unknown> = {}
  const obj = detail as Record<string, unknown>

  for (const key of Object.keys(obj)) {
    try {
      const val = obj[key]
      if (val == null) {
        result[key] = null
      } else if (val instanceof Element) {
        result[key] = serializeElement(val)
      } else if (typeof XMLHttpRequest !== 'undefined' && val instanceof XMLHttpRequest) {
        result[key] = '[XMLHttpRequest]'
      } else if (val instanceof Response) {
        result[key] = `[Response ${(val as Response).status}]`
      } else if (val instanceof Headers) {
        const h: Record<string, string> = {}
        val.forEach((v, k) => { h[k] = v })
        result[key] = h
      } else if (val instanceof Event) {
        result[key] = `[${val.type} Event]`
      } else if (typeof val === 'function') {
        result[key] = '[Function]'
      } else if (val instanceof FormData) {
        const entries: Record<string, string> = {}
        val.forEach((v, k) => { entries[k] = String(v) })
        result[key] = entries
      } else if (typeof val === 'object') {
        try {
          JSON.stringify(val)
          result[key] = val
        } catch {
          result[key] = String(val)
        }
      } else {
        result[key] = val
      }
    } catch {
      result[key] = '[unserializable]'
    }
  }

  return result
}
