import { MESSAGE_SOURCE } from '../shared/types'
import { api } from '../shared/browser-api'

// Page script is injected via manifest "world": "MAIN", no manual injection needed.

// ---- Relay: Page -> Background ----

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (event.data?.source !== MESSAGE_SOURCE) return
  if (event.data?.type?.startsWith('cmd:')) return

  try {
    api.runtime.sendMessage(event.data)
  } catch {
    // Extension context invalidated (e.g., extension reloaded)
  }
})

// ---- Relay: Background -> Page ----

api.runtime.onMessage.addListener((message: any) => {
  if (message?.source !== MESSAGE_SOURCE) return
  if (!message?.type?.startsWith('cmd:')) return

  window.postMessage(message, '*')
})

// ---- HTMX Detection (badge) ----

function detectHtmx(): boolean {
  return !!(
    document.querySelector('[hx-get],[hx-post],[hx-put],[hx-delete],[hx-patch],[data-hx-get],[data-hx-post],[hx-boost]')
  )
}

function notifyDetection(): void {
  try {
    api.runtime.sendMessage({
      source: MESSAGE_SOURCE,
      type: 'htmx:detected',
      payload: { detected: detectHtmx() },
    })
  } catch { /* noop */ }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', notifyDetection)
} else {
  notifyDetection()
}

setTimeout(notifyDetection, 2000)
