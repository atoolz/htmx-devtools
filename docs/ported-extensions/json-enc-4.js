/**
 * json-enc extension for htmx 4.0
 *
 * Encodes request parameters as JSON instead of form-encoded.
 * Sets Content-Type to application/json.
 *
 * Ported from htmx 2.x: https://github.com/bigskysoftware/htmx-extensions/tree/main/src/json-enc
 *
 * Changes from 2.x version:
 * - defineExtension -> registerExtension
 * - encodeParameters callback -> htmx_config_request hook
 * - onEvent catch-all -> htmx_config_request hook
 * - xhr.overrideMimeType removed (fetch doesn't need it)
 * - Uses detail.ctx.request.body (FormData) instead of parameters argument
 */
(function() {
  let api

  htmx.registerExtension('json-enc', {
    init: (apiRef) => {
      api = apiRef
    },

    htmx_config_request: (elt, detail) => {
      // Set JSON content type
      detail.ctx.request.headers['Content-Type'] = 'application/json'

      // Convert FormData to JSON object
      const body = detail.ctx.request.body
      if (!(body instanceof FormData)) return

      const object = {}
      body.forEach((value, key) => {
        if (Object.hasOwn(object, key)) {
          if (!Array.isArray(object[key])) {
            object[key] = [object[key]]
          }
          object[key].push(value)
        } else {
          object[key] = value
        }
      })

      // Restore hx-vals types (FormData stringifies everything)
      const vals = api.getExpressionVars ? api.getExpressionVars(elt) : {}
      Object.keys(object).forEach((key) => {
        if (Object.hasOwn(vals, key)) {
          object[key] = vals[key]
        }
      })

      // Replace FormData body with JSON string
      detail.ctx.request.body = JSON.stringify(object)
    }
  })
})()
