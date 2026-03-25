/**
 * loading-states extension for htmx 4.0
 *
 * Show/hide elements, add/remove classes, disable elements, and set aria-busy
 * during htmx requests based on data-loading-* attributes.
 *
 * Ported from htmx 2.x: https://github.com/bigskysoftware/htmx-extensions/tree/main/src/loading-states
 *
 * Changes from 2.x version:
 * - defineExtension -> registerExtension
 * - onEvent catch-all -> htmx_before_request / htmx_after_request hooks
 * - htmx:beforeRequest -> htmx_before_request
 * - htmx:beforeOnLoad -> htmx_after_request (fires when response arrives)
 * - htmx.closest() removed, use native Element.closest()
 * - htmx.findAll() removed, use document.querySelectorAll()
 * - evt.detail.pathInfo.requestPath -> detail.ctx.request.action
 * - Undo queue now per-request (stored on detail.ctx) to fix concurrent request bug
 */
(function() {

  function loadingStateContainer(target) {
    return target.closest('[data-loading-states]') || document.body
  }

  function mayProcessUndoCallback(target, callback) {
    if (document.body.contains(target)) {
      callback()
    }
  }

  function mayProcessLoadingStateByPath(elt, requestPath) {
    const pathElt = elt.closest('[data-loading-path]')
    if (!pathElt) return true
    return pathElt.getAttribute('data-loading-path') === requestPath
  }

  function queueLoadingState(undoQueue, sourceElt, targetElt, doCallback, undoCallback) {
    const delayElt = sourceElt.closest('[data-loading-delay]')
    if (delayElt) {
      const delayMs = delayElt.getAttribute('data-loading-delay') || 200
      const timeout = setTimeout(() => {
        doCallback()
        undoQueue.push(() => {
          mayProcessUndoCallback(targetElt, undoCallback)
        })
      }, delayMs)
      undoQueue.push(() => {
        mayProcessUndoCallback(targetElt, () => clearTimeout(timeout))
      })
    } else {
      doCallback()
      undoQueue.push(() => {
        mayProcessUndoCallback(targetElt, undoCallback)
      })
    }
  }

  function getLoadingStateElts(container, type, path) {
    return Array.from(container.querySelectorAll('[' + type + ']'))
      .filter((elt) => mayProcessLoadingStateByPath(elt, path))
  }

  function getLoadingTarget(elt) {
    const selector = elt.getAttribute('data-loading-target')
    if (selector) return Array.from(document.querySelectorAll(selector))
    return [elt]
  }

  htmx.registerExtension('loading-states', {
    htmx_before_request: (elt, detail) => {
      // Per-request undo queue (fixes concurrent request bug from 2.x)
      const undoQueue = []
      detail.ctx._loadingUndoQueue = undoQueue
      const container = loadingStateContainer(elt)
      const requestPath = detail.ctx.request.action

      const types = [
        'data-loading',
        'data-loading-class',
        'data-loading-class-remove',
        'data-loading-disable',
        'data-loading-aria-busy'
      ]

      const eltsByType = {}
      types.forEach((type) => {
        eltsByType[type] = getLoadingStateElts(container, type, requestPath)
      })

      // data-loading: show/hide
      eltsByType['data-loading'].forEach((sourceElt) => {
        getLoadingTarget(sourceElt).forEach((targetElt) => {
          queueLoadingState(undoQueue, sourceElt, targetElt,
            () => { targetElt.style.display = sourceElt.getAttribute('data-loading') || 'inline-block' },
            () => { targetElt.style.display = 'none' }
          )
        })
      })

      // data-loading-class: add classes
      eltsByType['data-loading-class'].forEach((sourceElt) => {
        const classNames = sourceElt.getAttribute('data-loading-class').split(' ')
        getLoadingTarget(sourceElt).forEach((targetElt) => {
          queueLoadingState(undoQueue, sourceElt, targetElt,
            () => classNames.forEach((c) => targetElt.classList.add(c)),
            () => classNames.forEach((c) => targetElt.classList.remove(c))
          )
        })
      })

      // data-loading-class-remove: remove classes
      eltsByType['data-loading-class-remove'].forEach((sourceElt) => {
        const classNames = sourceElt.getAttribute('data-loading-class-remove').split(' ')
        getLoadingTarget(sourceElt).forEach((targetElt) => {
          queueLoadingState(undoQueue, sourceElt, targetElt,
            () => classNames.forEach((c) => targetElt.classList.remove(c)),
            () => classNames.forEach((c) => targetElt.classList.add(c))
          )
        })
      })

      // data-loading-disable: disable elements
      eltsByType['data-loading-disable'].forEach((sourceElt) => {
        getLoadingTarget(sourceElt).forEach((targetElt) => {
          queueLoadingState(undoQueue, sourceElt, targetElt,
            () => { targetElt.disabled = true },
            () => { targetElt.disabled = false }
          )
        })
      })

      // data-loading-aria-busy: set aria-busy
      eltsByType['data-loading-aria-busy'].forEach((sourceElt) => {
        getLoadingTarget(sourceElt).forEach((targetElt) => {
          queueLoadingState(undoQueue, sourceElt, targetElt,
            () => targetElt.setAttribute('aria-busy', 'true'),
            () => targetElt.removeAttribute('aria-busy')
          )
        })
      })
    },

    // Undo loading states for this specific request
    htmx_after_request: (elt, detail) => {
      const undoQueue = detail.ctx._loadingUndoQueue || []
      while (undoQueue.length > 0) {
        undoQueue.shift()()
      }
    }
  })
})()
