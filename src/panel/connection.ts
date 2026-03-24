import { PORT_NAME } from '../shared/constants'
import { api } from '../shared/browser-api'
import type { PanelMessage } from '../shared/types'
import * as store from './store'

let port: chrome.runtime.Port | null = null

export function connect(): void {
  port = api.runtime.connect({ name: PORT_NAME })

  port.postMessage({
    type: 'panel:init',
    tabId: api.devtools.inspectedWindow.tabId,
  })

  port.onMessage.addListener((message: PanelMessage) => {
    switch (message.type) {
      case 'state:init':
        store.initState(message.payload)
        break
      case 'state:event':
        store.addEvent(message.payload)
        break
      case 'state:request':
        store.upsertRequest(message.payload)
        break
      case 'state:error':
        store.addError(message.payload)
        break
      case 'state:page-info':
        store.pageInfo.value = message.payload
        break
      case 'state:element-inspected':
        store.inspectedElement.value = message.payload
        break
      case 'state:element-list':
        store.htmxElements.value = message.payload
        break
      case 'state:clear':
        store.clearAll()
        break
      case 'state:element-picked':
        store.pickedSelector.value = message.payload?.selector || ''
        break
      case 'state:context-action':
        if (message.payload?.action === 'inspect-element') {
          store.activeTab.value = 'elements'
          store.pendingAction.value = 'start-picker'
        } else if (message.payload?.action === 'view-errors') {
          store.activeTab.value = 'errors'
        }
        break
    }
  })

  port.onDisconnect.addListener(() => {
    port = null
    setTimeout(connect, 1000)
  })
}

export function sendCommand(type: string, payload: unknown): void {
  if (!port) return
  port.postMessage({
    type,
    tabId: api.devtools.inspectedWindow.tabId,
    payload,
  })
}
