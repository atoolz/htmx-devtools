/**
 * remove-me extension for htmx 4.0
 *
 * Removes elements from the DOM after a specified delay.
 * Useful for flash messages, notifications, and temporary content.
 *
 * Usage:
 *   <div remove-me="2s">This disappears after 2 seconds</div>
 *   <div data-remove-me="500ms">Gone in 500ms</div>
 *
 * Ported from htmx 2.x: https://github.com/bigskysoftware/htmx-extensions/tree/main/src/remove-me
 *
 * Changes from 2.x version:
 * - defineExtension -> registerExtension
 * - onEvent catch-all -> htmx_after_init hook
 * - htmx:afterProcessNode -> htmx:after:init (htmx_after_init)
 * - htmx.parseInterval() may not exist in 4.0, added inline fallback
 */
(function() {
  function parseInterval(str) {
    if (typeof htmx.parseInterval === 'function') {
      return htmx.parseInterval(str)
    }
    // Fallback parser
    if (!str) return 0
    if (str.endsWith('ms')) return parseFloat(str)
    if (str.endsWith('s')) return parseFloat(str) * 1000
    return parseFloat(str)
  }

  function maybeRemoveMe(elt) {
    const timing = elt.getAttribute('remove-me') || elt.getAttribute('data-remove-me')
    if (timing) {
      setTimeout(() => {
        elt.parentElement?.removeChild(elt)
      }, parseInterval(timing))
    }
  }

  htmx.registerExtension('remove-me', {
    // htmx:after:init fires after an element is processed (replaces htmx:afterProcessNode)
    htmx_after_init: (elt) => {
      if (elt.getAttribute) {
        maybeRemoveMe(elt)
        if (elt.querySelectorAll) {
          const children = elt.querySelectorAll('[remove-me], [data-remove-me]')
          for (let i = 0; i < children.length; i++) {
            maybeRemoveMe(children[i])
          }
        }
      }
    }
  })
})()
