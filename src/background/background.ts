import { MESSAGE_SOURCE } from '../shared/types'
import type { PanelMessage } from '../shared/types'
import { PORT_NAME } from '../shared/constants'
import { api } from '../shared/browser-api'
import * as store from './state-store'
import * as tracker from './request-tracker'

// ---- Port Management ----

const panelPorts = new Map<number, chrome.runtime.Port>()

function sendToPanel(tabId: number, message: PanelMessage): void {
  const port = panelPorts.get(tabId)
  if (!port) return
  try {
    port.postMessage(message)
  } catch {
    panelPorts.delete(tabId)
  }
}

function sendToContent(tabId: number, message: { source: string; type: string; payload: unknown }): void {
  try {
    const result = api.tabs.sendMessage(tabId, message)
    if (result && typeof result === 'object' && 'catch' in result) {
      (result as Promise<unknown>).catch(() => {})
    }
  } catch { /* tab may not exist */ }
}

// ---- Panel Connection ----

api.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) return

  // The panel sends its tabId as the first message
  port.onMessage.addListener((msg: any) => {
    if (msg.type === 'panel:init') {
      const tabId = msg.tabId as number
      panelPorts.set(tabId, port)

      // Send current state snapshot
      const snapshot = store.getSnapshot(tabId)
      sendToPanel(tabId, { type: 'state:init', payload: snapshot })

      // Request fresh page info
      sendToContent(tabId, {
        source: MESSAGE_SOURCE,
        type: 'cmd:get-page-info',
        payload: null,
      })

      return
    }

    // Forward commands to content script
    if (msg.type?.startsWith('cmd:') && msg.tabId) {
      // Intercept clear to also reset background state
      if (msg.type === 'cmd:clear') {
        store.clearTabState(msg.tabId)
        sendToPanel(msg.tabId, { type: 'state:clear', payload: null })
      }
      sendToContent(msg.tabId, {
        source: MESSAGE_SOURCE,
        type: msg.type,
        payload: msg.payload,
      })
      return
    }
  })

  port.onDisconnect.addListener(() => {
    for (const [tabId, p] of panelPorts) {
      if (p === port) {
        panelPorts.delete(tabId)
        break
      }
    }
  })
})

// ---- Messages from Content Script ----

api.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender) => {
  if (message?.source !== MESSAGE_SOURCE) return
  const tabId = sender.tab?.id
  if (!tabId) return

  const { type, payload } = message

  switch (type) {
    case 'htmx:detected': {
      if (payload.detected) {
        api.action.setBadgeText({ text: 'ON', tabId })
        api.action.setBadgeBackgroundColor({ color: '#22c55e', tabId })
      }
      break
    }

    case 'htmx:page-info': {
      store.setPageInfo(tabId, payload)
      sendToPanel(tabId, { type: 'state:page-info', payload })

      if (payload.detected) {
        api.action.setBadgeText({ text: payload.version || 'ON', tabId })
        api.action.setBadgeBackgroundColor({ color: '#22c55e', tabId })
      }
      break
    }

    case 'htmx:event': {
      store.addEvent(tabId, payload)
      sendToPanel(tabId, { type: 'state:event', payload })

      // Also update request if linked
      const updatedRequest = tracker.handleEventForRequest(tabId, payload)
      if (updatedRequest) {
        sendToPanel(tabId, { type: 'state:request', payload: updatedRequest })
      }
      break
    }

    case 'htmx:request-update': {
      const request = tracker.handleRequestUpdate(tabId, payload)
      sendToPanel(tabId, { type: 'state:request', payload: request })
      break
    }

    case 'htmx:error': {
      store.addError(tabId, payload)
      sendToPanel(tabId, { type: 'state:error', payload })

      // Update badge with error count
      const state = store.getTabState(tabId)
      const errorCount = state.errors.length
      if (errorCount > 0) {
        api.action.setBadgeText({ text: String(errorCount), tabId })
        api.action.setBadgeBackgroundColor({ color: '#ef4444', tabId })
      }
      break
    }

    case 'htmx:dom-snapshot': {
      tracker.handleDomSnapshot(tabId, payload)
      // Notify panel that the request was updated with snapshot data
      const snapReq = store.getRequest(tabId, payload.requestId)
      if (snapReq) {
        sendToPanel(tabId, { type: 'state:request', payload: snapReq })
      }
      break
    }

    case 'htmx:element-inspected': {
      sendToPanel(tabId, { type: 'state:element-inspected', payload })
      break
    }

    case 'htmx:element-list': {
      sendToPanel(tabId, { type: 'state:element-list', payload })
      break
    }

    case 'htmx:element-picked': {
      sendToPanel(tabId, { type: 'state:element-picked', payload })
      break
    }
  }
})

// ---- Tab lifecycle ----

api.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    store.clearTabState(tabId)
    sendToPanel(tabId, { type: 'state:clear', payload: null })
    api.action.setBadgeText({ text: '', tabId })
  }
})

api.tabs.onRemoved.addListener((tabId) => {
  store.removeTabState(tabId)
  panelPorts.delete(tabId)
})

