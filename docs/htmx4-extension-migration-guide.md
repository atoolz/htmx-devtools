# Migrating htmx Extensions from 2.x to 4.0

A practical guide for extension authors migrating to htmx 4.0. Covers every breaking change with before/after examples.

## Quick Summary

htmx 4.0 is a ground-up rewrite. The three biggest changes for extension authors:

1. **`defineExtension` is now `registerExtension`** with a completely different hook model
2. **XHR is gone**, replaced by `fetch()`. Any code touching `xhr` breaks.
3. **Event names changed** from camelCase to colon-namespaced format

## 1. Extension Registration

### Before (htmx 2.x)

```javascript
htmx.defineExtension('my-ext', {
    init: function(api) { },
    onEvent: function(name, evt) {
        if (name === 'htmx:configRequest') {
            evt.detail.headers['X-Custom'] = 'value';
        }
        if (name === 'htmx:beforeSwap') {
            evt.detail.shouldSwap = true;
        }
    },
    transformResponse: function(text, xhr, elt) {
        return text.toUpperCase();
    },
    encodeParameters: function(xhr, parameters, elt) {
        return JSON.stringify(Object.fromEntries(parameters));
    },
    isInlineSwap: function(swapStyle) {
        return swapStyle === 'custom';
    },
    handleSwap: function(swapStyle, target, fragment, settleInfo) {
        target.replaceWith(fragment);
        return [target];
    },
    getSelectors: function() {
        return ['[my-attr]'];
    }
});
```

### After (htmx 4.0)

```javascript
htmx.registerExtension('my-ext', {
    init: (api) => { },

    // Each event gets its own hook (replaces onEvent catch-all)
    htmx_config_request: (elt, detail) => {
        detail.ctx.request.headers['X-Custom'] = 'value';
    },

    htmx_before_swap: (elt, detail) => {
        // No more shouldSwap, just don't return false
    },

    // Replaces transformResponse
    htmx_after_request: (elt, detail) => {
        detail.ctx.text = detail.ctx.text.toUpperCase();
    },

    // Replaces encodeParameters (modify body in config phase)
    htmx_config_request: (elt, detail) => {
        detail.ctx.request.headers['Content-Type'] = 'application/json';
        detail.ctx.request.body = JSON.stringify(
            Object.fromEntries(detail.ctx.request.body)
        );
    },

    // Replaces both isInlineSwap and handleSwap
    handle_swap: (swapStyle, target, fragment, swapSpec) => {
        if (swapStyle === 'custom') {
            target.replaceWith(fragment);
            return true;
        }
        return false;
    },

    // Replaces getSelectors
    htmx_after_init: (elt) => {
        // Process elements with your custom attribute
    }
});
```

### Key differences

| htmx 2.x | htmx 4.0 | Notes |
|-----------|----------|-------|
| `defineExtension` | `registerExtension` | Different function name |
| `onEvent(name, evt)` | Individual `htmx_*` hooks | No more catch-all |
| `transformResponse(text, xhr, elt)` | Modify `detail.ctx.text` in `htmx_after_request` | |
| `encodeParameters(xhr, params, elt)` | Modify `detail.ctx.request.body` in `htmx_config_request` | |
| `isInlineSwap(style)` + `handleSwap(...)` | `handle_swap(style, target, frag, spec)` | Merged into one |
| `getSelectors()` | Use `htmx_after_init` hook | |

## 2. Extension Activation

### Before (htmx 2.x)

Extensions required `hx-ext` attribute in HTML:

```html
<body hx-ext="my-ext, another-ext">
    <div hx-get="/api">...</div>
</body>
```

### After (htmx 4.0)

Extensions auto-activate when their script loads. The `hx-ext` attribute is removed.

```html
<head>
    <script src="htmx.js"></script>
    <script src="my-ext.js"></script>  <!-- auto-activates -->
</head>
```

To restrict which extensions load:

```html
<meta name="htmx-config" content='{"extensions": "my-ext, another-ext"}'>
```

## 3. Event Name Mapping

All events changed from camelCase to colon-namespaced format. Some events were consolidated.

### Request Lifecycle

| htmx 2.x | htmx 4.0 | Hook Name |
|-----------|----------|-----------|
| `htmx:configRequest` | `htmx:config:request` | `htmx_config_request` |
| `htmx:beforeRequest` | `htmx:before:request` | `htmx_before_request` |
| `htmx:beforeSend` | `htmx:before:request` | `htmx_before_request` |
| `htmx:afterRequest` | `htmx:after:request` | `htmx_after_request` |
| `htmx:afterOnLoad` | `htmx:after:request` | `htmx_after_request` |

### Swap Lifecycle

| htmx 2.x | htmx 4.0 | Hook Name |
|-----------|----------|-----------|
| `htmx:beforeSwap` | `htmx:before:swap` | `htmx_before_swap` |
| `htmx:afterSwap` | `htmx:after:swap` | `htmx_after_swap` |
| `htmx:afterSettle` | `htmx:after:settle` | `htmx_after_settle` |

### Init/Process

| htmx 2.x | htmx 4.0 | Hook Name |
|-----------|----------|-----------|
| `htmx:beforeProcessNode` | `htmx:before:process` | `htmx_before_process` |
| `htmx:afterProcessNode` | `htmx:after:init` | `htmx_after_init` |
| `htmx:load` | `htmx:after:init` | `htmx_after_init` |

### History

| htmx 2.x | htmx 4.0 | Hook Name |
|-----------|----------|-----------|
| `htmx:beforeHistorySave` | `htmx:before:history:update` | `htmx_before_history_update` |
| `htmx:pushedIntoHistory` | `htmx:after:history:push` | `htmx_after_history_push` |
| `htmx:replacedInHistory` | `htmx:after:history:replace` | `htmx_after_history_replace` |
| `htmx:historyCacheMiss` | `htmx:before:history:restore` | `htmx_before_history_restore` |
| `htmx:historyRestore` | `htmx:before:history:restore` | `htmx_before_history_restore` |

### Errors (consolidated into one event)

| htmx 2.x | htmx 4.0 | Hook Name |
|-----------|----------|-----------|
| `htmx:responseError` | `htmx:error` | `htmx_error` |
| `htmx:sendError` | `htmx:error` | `htmx_error` |
| `htmx:swapError` | `htmx:error` | `htmx_error` |
| `htmx:targetError` | `htmx:error` | `htmx_error` |
| `htmx:timeout` | `htmx:error` | `htmx_error` |

### Removed (no equivalent)

| htmx 2.x | Reason |
|-----------|--------|
| `htmx:xhr:loadstart` | XHR removed, use `htmx:before:request` |
| `htmx:xhr:progress` | XHR removed, no fetch equivalent |
| `htmx:xhr:loadend` | Use `htmx:finally:request` |
| `htmx:xhr:abort` | Use `htmx:error` |
| `htmx:validation:validate` | Use native form validation |
| `htmx:validation:failed` | Use native form validation |
| `htmx:validation:halted` | Use native form validation |
| `htmx:prompt` | `hx-prompt` removed |
| `htmx:confirm` | Use `hx-confirm` with `js:` prefix |

### New in htmx 4.0

| Event | Hook Name | Description |
|-------|-----------|-------------|
| `htmx:before:response` | `htmx_before_response` | After fetch completes, before body is consumed |
| `htmx:before:settle` | `htmx_before_settle` | Before settle phase |
| `htmx:after:settle` | `htmx_after_settle` | After settle phase |
| `htmx:before:cleanup` | `htmx_before_cleanup` | Before element cleanup |
| `htmx:after:cleanup` | `htmx_after_cleanup` | After element cleanup |
| `htmx:finally:request` | `htmx_finally_request` | Always fires after request (try/finally) |
| `htmx:before:morph:node` | `htmx_before_morph_node` | Before morphing a DOM node |

## 4. XHR to fetch() Migration

The single biggest impact for extensions. `XMLHttpRequest` is completely gone.

### Before (htmx 2.x)

```javascript
onEvent: function(name, evt) {
    if (name === 'htmx:afterRequest') {
        var status = evt.detail.xhr.status;
        var body = evt.detail.xhr.responseText;
        var header = evt.detail.xhr.getResponseHeader('X-Custom');
        var allHeaders = evt.detail.xhr.getAllResponseHeaders();
    }
    if (name === 'htmx:configRequest') {
        // Modify before sending
        evt.detail.headers['Authorization'] = 'Bearer token';
        evt.detail.parameters.extra = 'value';
    }
    if (name === 'htmx:beforeSwap') {
        evt.detail.shouldSwap = true;
        evt.detail.target = document.getElementById('other');
    }
}
```

### After (htmx 4.0)

```javascript
htmx_after_request: (elt, detail) => {
    var status = detail.ctx.response.status;
    var body = detail.ctx.text;
    var header = detail.ctx.response.headers.get('X-Custom');
    // getAllResponseHeaders equivalent:
    detail.ctx.response.headers.forEach((value, key) => { });
},

htmx_config_request: (elt, detail) => {
    detail.ctx.request.headers['Authorization'] = 'Bearer token';
    detail.ctx.request.body.set('extra', 'value'); // FormData
},

htmx_before_swap: (elt, detail) => {
    // No shouldSwap. Return false to cancel, or just proceed.
    detail.ctx.target = document.getElementById('other');
}
```

### Context object reference (`detail.ctx`)

```javascript
{
    sourceElement,          // Element that triggered the request
    sourceEvent,            // The triggering DOM event
    status,                 // Request status
    target,                 // Swap target (modifiable)
    swap,                   // Swap strategy (modifiable)
    request: {
        action,             // URL
        method,             // HTTP method
        headers,            // Object (modifiable)
        body,               // FormData (modifiable)
        validate,           // Boolean
        abort,              // Function to abort
        signal              // AbortSignal
    },
    response: {
        raw,                // Raw Response object
        status,             // HTTP status code
        headers             // Headers object
    },
    text,                   // Response text (modifiable)
    hx                      // Parsed HX-* response headers
}
```

## 5. Config Changes

### Renamed

| htmx 2.x | htmx 4.0 |
|-----------|----------|
| `defaultSwapStyle` | `defaultSwap` |
| `globalViewTransitions` | `transitions` |
| `historyEnabled` | `history` |
| `includeIndicatorStyles` | `includeIndicatorCSS` |
| `timeout` | `defaultTimeout` |

### Changed defaults

| Config | htmx 2.x | htmx 4.0 |
|--------|----------|----------|
| `defaultTimeout` | `0` (none) | `60000` (60s) |
| `defaultSettleDelay` | `20` | `1` |

### Removed configs

`addedClass`, `allowEval`, `allowNestedOobSwaps`, `allowScriptTags`, `attributesToSettle`, `defaultSwapDelay`, `disableSelector`, `getCacheBusterParam`, `historyCacheSize`, `ignoreTitle`, `methodsThatUseUrlParams`, `refreshOnHistoryMiss`, `responseHandling`, `scrollBehavior`, `scrollIntoViewOnBoost`, `selfRequestsOnly`, `settlingClass`, `swappingClass`, `triggerSpecsCache`, `useTemplateFragments`, `withCredentials`, `wsBinaryType`, `wsReconnectDelay`

## 6. Request/Response Header Changes

### Request headers

| htmx 2.x | htmx 4.0 |
|-----------|----------|
| `HX-Trigger` (element ID) | `HX-Source` (format: `tagName#id`) |
| `HX-Trigger-Name` | Removed |
| `HX-Prompt` | Removed |
| (none) | `HX-Request-Type` (`"full"` or `"partial"`) |
| (none) | `Accept: text/html` (explicit) |

### Response headers

| htmx 2.x | htmx 4.0 |
|-----------|----------|
| `HX-Trigger-After-Swap` | Removed |
| `HX-Trigger-After-Settle` | Removed |

## 7. Attribute Changes

### Removed

| Attribute | Migration |
|-----------|-----------|
| `hx-ext` | Extensions auto-load, no attribute needed |
| `hx-vars` | Use `hx-vals` with `js:` prefix |
| `hx-params` | Use `htmx:config:request` event |
| `hx-prompt` | Use `hx-confirm` with `js:` prefix |
| `hx-disinherit` / `hx-inherit` | Inheritance is explicit by default |
| `hx-request` | Use `hx-config` |
| `hx-history` / `hx-history-elt` | No localStorage caching |

### Renamed

| htmx 2.x | htmx 4.0 |
|-----------|----------|
| `hx-disable` (skip processing) | `hx-ignore` |
| `hx-disabled-elt` | `hx-disable` |

## 8. JS API Changes

### Removed

`htmx.addClass()`, `htmx.removeClass()`, `htmx.toggleClass()`, `htmx.closest()`, `htmx.remove()`, `htmx.off()`, `htmx.location()`, `htmx.logAll()`, `htmx.logNone()`

Use standard DOM APIs instead.

### New

```javascript
htmx.forEvent(eventName, timeout)  // Returns Promise resolving on event
htmx.takeClass(element, className) // Removes from siblings, adds to element
htmx.timeout(time)                 // Returns Promise resolving after delay
```

## 9. The Compatibility Extension

htmx 4.0 ships with `htmx-2-compat.js` that re-emits old event names alongside new ones. Use it for gradual migration:

```html
<script src="htmx.js"></script>
<script src="ext/htmx-2-compat.js"></script>
<!-- Your htmx 2.x extensions still work -->
```

Configure via:

```javascript
htmx.config.compat = {
    doNotTriggerOldEvents: false,    // Set true when done migrating
    useExplicitInheritance: false,   // Match htmx 2 inheritance behavior
    swapErrorResponseCodes: true,    // Swap 4xx/5xx like htmx 2 did
    suppressInheritanceLogs: false   // Hide inheritance warnings
};
```

## 10. Migration Checklist

- [ ] Replace `htmx.defineExtension` with `htmx.registerExtension`
- [ ] Replace `onEvent` catch-all with individual `htmx_*` hook methods
- [ ] Replace all `evt.detail.xhr.*` access with `detail.ctx.*`
- [ ] Update event name references (camelCase to colon-namespaced)
- [ ] Replace `transformResponse` with `htmx_after_request` + `detail.ctx.text`
- [ ] Replace `encodeParameters` with `htmx_config_request` + `detail.ctx.request.body`
- [ ] Merge `isInlineSwap` + `handleSwap` into `handle_swap`
- [ ] Replace `getSelectors` with `htmx_after_init` hook
- [ ] Remove `hx-ext` attribute from HTML (extensions auto-load)
- [ ] Update config key names (`defaultSwapStyle` -> `defaultSwap`, etc.)
- [ ] Replace `HX-Trigger` header checks with `HX-Source`
- [ ] Remove `htmx.logAll()` / `htmx.logNone()` calls
- [ ] Test with `htmx-2-compat.js` first, then migrate fully
