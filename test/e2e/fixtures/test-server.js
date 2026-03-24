import http from 'node:http'

const PORT = 3456

const CONTACTS = {
  1: { firstName: 'Joe', lastName: 'Blow', email: 'joe@blow.com' },
  2: { firstName: 'Jane', lastName: 'Doe', email: 'jane@doe.com' },
}

let todoId = 3
const TODOS = [
  { id: 1, text: 'Learn HTMX', done: true },
  { id: 2, text: 'Build DevTools', done: false },
]

function html(body) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HTMX DevTools - Test Page</title>
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <style>
    :root {
      --bodyBackground: #1a1a2e;
      --textColor: #c7c4c1;
      --midBlue: #5b96d5;
      --lightBlue: #6eaaed;
      --anchorColor: #5b96d5;
      --topNavBackground: linear-gradient(#fff, #f4f5f5);
      --topNavBorder: #d0d0d0;
      --topNavShadow: #efefef;
      --alertBackground: #16213e;
      --alertBorder: #334155;
      --codeBg: #0f0f23;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      font-size: 14px; line-height: 1.5;
      color: var(--textColor); background: var(--bodyBackground);
      display: flex; flex-direction: column;
    }
    a { text-decoration: none; color: var(--anchorColor); }
    a:hover { opacity: 0.6; }

    /* ---- Nav (always light) ---- */
    .top-nav {
      line-height: 28px; padding: 6px 16px;
      border-bottom: 1px solid #d0d0d0;
      background: linear-gradient(#fff, #f4f5f5);
      box-shadow: 0px 4px 15px 0px #efefef;
      display: flex; align-items: center; gap: 16px;
      flex-shrink: 0;
    }
    .logo { font-size: 22px; font-weight: bold; color: #111; }
    .logo span { color: #3366cc; }
    .top-nav a { margin-left: 8px; font-size: 13px; color: #3366cc; }

    /* ---- Content (scrollable area fills remaining space) ---- */
    .page-content {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      padding: 12px 20px;
    }
    .c { max-width: 100%; margin: 0; }
    h2 { font-weight: 600; line-height: 1em; margin: 1em 0 0.4em; padding-bottom: 0.2em; border-bottom: 1px solid var(--alertBorder); font-size: 1.1em; color: #e2e8f0; }
    h3 { font-weight: 600; margin: 0.6em 0 0.3em; color: #94a3b8; font-size: 0.85em; }

    /* ---- Buttons (htmx.org style) ---- */
    .btn {
      padding: 0.4em 0.8em; letter-spacing: 0.05em; text-transform: uppercase;
      border: solid 2px; cursor: pointer; border-radius: 6px;
      font-size: 0.78em; font-weight: 600; font-family: inherit;
      display: inline-block; text-decoration: none; white-space: nowrap;
    }
    .btn:hover { opacity: 0.6; }
    .btn.primary { color: white; background: var(--midBlue); border-color: var(--midBlue); }
    .btn.danger { color: white; background: #d9534f; border-color: #d9534f; }
    .btn.success { color: white; background: #5cb85c; border-color: #5cb85c; }
    .btn.warning { color: white; background: #f0ad4e; border-color: #f0ad4e; }
    .btn.outline { background: transparent; color: #e2e8f0; border-color: #475569; }

    /* ---- Forms ---- */
    input[type="text"], input[type="email"] {
      padding: 0.35em 0.6em; border: 1px solid var(--alertBorder); border-radius: 4px;
      font-size: 0.85em; font-family: inherit; background: var(--bodyBackground); color: var(--textColor);
    }
    input:focus { outline: none; border-color: var(--midBlue); }
    label { font-size: 0.85em; display: block; margin-bottom: 0.1em; font-weight: 600; }

    /* ---- Layout helpers ---- */
    .flex { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    @media (max-width: 80rem) { .grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 45rem) { .grid { grid-template-columns: 1fr; } }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-row { margin-bottom: 0.4em; }

    /* ---- Demo result area ---- */
    .demo-result {
      margin-top: 0.4em; padding: 0.4em 0.6em;
      background: var(--codeBg); color: #abb2bf;
      border-radius: 4px; font-family: monospace; font-size: 0.8em;
      min-height: 1.6em;
    }

    /* ---- Alert / Card ---- */
    .alert {
      border: 1px solid var(--alertBorder); padding: 10px; margin: 0.6em 0;
      background-color: var(--alertBackground);
      border-radius: 4px;
    }
    .section { margin-bottom: 0; }

    /* ---- Badges ---- */
    .badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 0.8em; font-weight: 600; }
    .badge-success { background: #1a3a2a; color: #86efac; }
    .badge-error { background: #3a1a1a; color: #fca5a5; }

    /* ---- Todo ---- */
    .todo-item { display: flex; align-items: center; gap: 6px; padding: 0.3em 0; border-bottom: 1px solid var(--alertBorder); font-size: 0.9em; }
    .todo-item.done span { text-decoration: line-through; opacity: 0.5; }

    /* ---- Code inline ---- */
    code { background: #3465a41f; border-radius: 2px; padding: 2px 5px; font-size: 0.9em; }

    /* ---- Indicator ---- */
    .htmx-indicator { display: none; }
    .htmx-request .htmx-indicator { display: inline; }
    .htmx-request.htmx-indicator { display: inline; }

    /* ---- Table ---- */
    table { width: 100%; border-collapse: collapse; margin: 0.3em 0; }
    td, th { padding: 0.2em 0.4em; border-bottom: 1px solid var(--alertBorder); text-align: left; font-size: 0.85em; }
    th { border-bottom-width: 2px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="top-nav">
    <div class="logo">&lt;<span>/</span>&gt; htmx devtools</div>
    <span style="color:#999;font-size:12px;">test page</span>
    <span style="flex:1;"></span>
    <a href="https://htmx.org/docs/">docs</a>
    <a href="https://htmx.org/reference/">reference</a>
    <a href="https://htmx.org/examples/">examples</a>
  </div>

  <div class="page-content">
  <div class="c">

  <div class="grid">
    <!-- ===== BASIC REQUESTS ===== -->
    <div class="section">
      <h2>Basic Requests</h2>

      <h3>GET Request</h3>
      <div class="flex">
        <button class="btn primary" hx-get="/api/time" hx-target="#get-result" hx-swap="innerHTML">
          Get Server Time
        </button>
        <span class="htmx-indicator">Loading...</span>
      </div>
      <div id="get-result" class="demo-result">Click to load</div>

      <h3>POST Request</h3>
      <div class="flex">
        <input type="text" id="message-input" name="message" placeholder="Type a message..." />
        <button class="btn success" hx-post="/api/echo" hx-target="#post-result" hx-include="#message-input">
          Send POST
        </button>
      </div>
      <div id="post-result" class="demo-result">Waiting for POST...</div>

      <h3>PUT Request</h3>
      <button class="btn warning" hx-put="/api/update" hx-target="#put-result" hx-swap="innerHTML">
        Send PUT
      </button>
      <div id="put-result" class="demo-result">Waiting for PUT...</div>

      <h3>DELETE Request</h3>
      <button class="btn danger" hx-delete="/api/item/42" hx-target="#delete-result" hx-swap="innerHTML" hx-confirm="Delete item 42?">
        Delete Item
      </button>
      <div id="delete-result" class="demo-result">Waiting for DELETE...</div>
    </div>

    <!-- ===== ERROR SCENARIOS ===== -->
    <div class="section">
      <h2>Error Scenarios</h2>

      <h3>404 Not Found</h3>
      <button class="btn danger" hx-get="/api/does-not-exist" hx-target="#error-404">
        Trigger 404
      </button>
      <div id="error-404" class="demo-result">Waiting...</div>

      <h3>500 Server Error</h3>
      <button class="btn danger" hx-get="/api/error-500" hx-target="#error-500">
        Trigger 500
      </button>
      <div id="error-500" class="demo-result">Waiting...</div>

      <h3>Network Timeout (3s)</h3>
      <button class="btn danger" hx-get="/api/timeout" hx-target="#error-timeout" hx-request="timeout:3000">
        Trigger Timeout
      </button>
      <div id="error-timeout" class="demo-result">Waiting...</div>

      <h3>Invalid Target</h3>
      <button class="btn danger" hx-get="/api/time" hx-target="#nonexistent-element">
        Target Not Found
      </button>

      <h3>Validation Error</h3>
      <form hx-post="/api/validate" hx-target="#validation-result">
        <div class="flex">
          <input type="email" name="email" required placeholder="Enter email..." />
          <button type="submit" class="btn warning">Submit</button>
        </div>
      </form>
      <div id="validation-result" class="demo-result">Waiting...</div>
    </div>

    <!-- ===== SWAP STRATEGIES ===== -->
    <div class="section">
      <h2>Swap Strategies</h2>

      <h3><code>innerHTML</code> (default)</h3>
      <button class="btn outline" hx-get="/api/swap-content" hx-target="#swap-inner" hx-swap="innerHTML">
        Swap innerHTML
      </button>
      <div id="swap-inner" class="demo-result">Original content</div>

      <h3><code>outerHTML</code></h3>
      <div id="swap-outer-wrapper">
        <button class="btn outline" hx-get="/api/swap-outer" hx-target="#swap-outer" hx-swap="outerHTML">
          Swap outerHTML
        </button>
        <div id="swap-outer" class="demo-result">Will be replaced entirely</div>
      </div>

      <h3><code>beforeend</code> (append)</h3>
      <button class="btn outline" hx-get="/api/swap-append" hx-target="#swap-append" hx-swap="beforeend">
        Append Item
      </button>
      <div id="swap-append" class="demo-result">Items: </div>

      <h3><code>afterbegin</code> (prepend)</h3>
      <button class="btn outline" hx-get="/api/swap-prepend" hx-target="#swap-prepend" hx-swap="afterbegin">
        Prepend Item
      </button>
      <div id="swap-prepend" class="demo-result">Items: </div>

      <h3><code>delete</code></h3>
      <div id="delete-me" class="alert">
        <button class="btn danger" hx-delete="/api/remove" hx-target="#delete-me" hx-swap="delete">
          Delete This Section
        </button>
        This entire section will be removed from the DOM.
      </div>
    </div>

    <!-- ===== OOB SWAPS & ADVANCED ===== -->
    <div class="section">
      <h2>Out-of-Band Swaps</h2>

      <button class="btn primary" hx-get="/api/oob-swap" hx-target="#oob-main">
        Trigger OOB Swap
      </button>
      <div id="oob-main" class="demo-result">Main target</div>
      <div id="oob-sidebar" class="demo-result" style="margin-top:8px;">Sidebar (OOB target)</div>
      <div id="oob-counter" class="demo-result" style="margin-top:8px;">Counter: 0</div>

      <h2>Triggers & Events</h2>

      <h3>Delayed trigger (<code>delay:500ms</code>)</h3>
      <input type="text" name="search"
        hx-get="/api/search" hx-target="#search-result"
        hx-trigger="keyup changed delay:500ms" hx-swap="innerHTML"
        placeholder="Type to search..." style="width:100%;" />
      <div id="search-result" class="demo-result">Type to search...</div>

      <h3>Polling (<code>every 2s</code>)</h3>
      <div hx-get="/api/poll" hx-trigger="every 2s" hx-target="#poll-result" hx-swap="innerHTML" id="poll-container">
        <div id="poll-result" class="demo-result">Polling active...</div>
      </div>
      <button class="btn outline" onclick="document.getElementById('poll-container').removeAttribute('hx-trigger'); htmx.process(document.getElementById('poll-container'));">
        Stop Polling
      </button>

      <h3><code>hx-boost</code> (enhanced link)</h3>
      <div hx-boost="true">
        <a href="/api/boosted-page" class="btn outline">Boosted Link</a>
      </div>
    </div>

    <!-- ===== CONTACT FORM ===== -->
    <div class="section">
      <h2>Contact Editor</h2>
      <div class="alert">
        <div id="contact-1">${renderContact(1)}</div>
      </div>
    </div>

    <!-- ===== TODO LIST ===== -->
    <div class="section">
      <h2>Todo List</h2>
      <form hx-post="/api/todos" hx-target="#todo-list" hx-swap="beforeend" hx-on::after-request="this.reset()">
        <div class="flex">
          <input type="text" name="text" placeholder="New todo..." required style="flex:1;" />
          <button type="submit" class="btn success">Add</button>
        </div>
      </form>
      <div id="todo-list" style="margin-top:4px;">
        ${TODOS.map(renderTodo).join('')}
      </div>
    </div>

  </div>

  ${body}
  </div>
  </div>
</body>
</html>`
}

function renderContact(id) {
  const c = CONTACTS[id]
  return `<div hx-target="this" hx-swap="outerHTML">
  <table>
    <tr><th>First Name</th><td>${c.firstName}</td></tr>
    <tr><th>Last Name</th><td>${c.lastName}</td></tr>
    <tr><th>Email</th><td>${c.email}</td></tr>
  </table>
  <button hx-get="/api/contact/${id}/edit" class="btn primary" style="margin-top:8px;">Click To Edit</button>
</div>`
}

function renderContactForm(id) {
  const c = CONTACTS[id]
  return `<form hx-put="/api/contact/${id}" hx-target="this" hx-swap="outerHTML">
  <div class="form-row"><label>First Name</label><input type="text" name="firstName" value="${c.firstName}" /></div>
  <div class="form-row"><label>Last Name</label><input type="text" name="lastName" value="${c.lastName}" /></div>
  <div class="form-row"><label>Email</label><input type="email" name="email" value="${c.email}" /></div>
  <div class="flex" style="margin-top:8px;">
    <button type="submit" class="btn success">Save</button>
    <button class="btn outline" hx-get="/api/contact/${id}" hx-target="this" hx-swap="outerHTML">Cancel</button>
  </div>
</form>`
}

function renderTodo(todo) {
  return `<div class="todo-item ${todo.done ? 'done' : ''}" id="todo-${todo.id}">
  <input type="checkbox" ${todo.done ? 'checked' : ''}
    hx-patch="/api/todos/${todo.id}/toggle" hx-target="#todo-${todo.id}" hx-swap="outerHTML" />
  <span style="flex:1;">${todo.text}</span>
  <button class="btn danger" style="padding:4px 10px;font-size:0.75em;"
    hx-delete="/api/todos/${todo.id}" hx-target="#todo-${todo.id}" hx-swap="delete">x</button>
</div>`
}

let oobCounter = 0
let appendCounter = 0

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      const params = {}
      if (body) {
        for (const pair of body.split('&')) {
          const [k, v] = pair.split('=').map(decodeURIComponent)
          params[k] = v
        }
      }
      // Also parse query string
      const url = new URL(req.url, `http://localhost:${PORT}`)
      for (const [k, v] of url.searchParams) {
        params[k] = v
      }
      resolve(params)
    })
  })
}

function respond(res, status, body, contentType = 'text/html') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method

  // Home page
  if (path === '/' && method === 'GET') {
    return respond(res, 200, html(''))
  }

  // --- Basic requests ---
  if (path === '/api/time') {
    return respond(res, 200, `<span class="badge badge-success">Server time: ${new Date().toLocaleTimeString()}</span>`)
  }

  if (path === '/api/echo' && method === 'POST') {
    const params = await parseBody(req)
    return respond(res, 200, `<span>Echo: <strong>${params.message || '(empty)'}</strong> at ${new Date().toLocaleTimeString()}</span>`)
  }

  if (path === '/api/update' && method === 'PUT') {
    return respond(res, 200, `<span class="badge badge-success">Updated at ${new Date().toLocaleTimeString()}</span>`)
  }

  if (path.startsWith('/api/item/') && method === 'DELETE') {
    const id = path.split('/').pop()
    return respond(res, 200, `<span class="badge badge-error">Item ${id} deleted</span>`)
  }

  // --- Error scenarios ---
  if (path === '/api/error-500') {
    return respond(res, 500, `<span class="badge badge-error">500 Internal Server Error</span>`)
  }

  if (path === '/api/timeout') {
    // Never respond, let it timeout
    setTimeout(() => {
      respond(res, 200, 'Too late!')
    }, 10000)
    return
  }

  if (path === '/api/validate' && method === 'POST') {
    const params = await parseBody(req)
    if (!params.email || !params.email.includes('@')) {
      return respond(res, 422, `<span class="badge badge-error">Invalid email address</span>`)
    }
    return respond(res, 200, `<span class="badge badge-success">Valid: ${params.email}</span>`)
  }

  // --- Swap strategies ---
  if (path === '/api/swap-content') {
    return respond(res, 200, `<strong style="color:#22c55e;">New inner content at ${new Date().toLocaleTimeString()}</strong>`)
  }

  if (path === '/api/swap-outer') {
    return respond(res, 200, `<div id="swap-outer" class="demo-result" style="border:2px solid #22c55e;"><strong>Replaced element!</strong> ${new Date().toLocaleTimeString()}</div>`)
  }

  if (path === '/api/swap-append') {
    appendCounter++
    return respond(res, 200, `<span class="badge badge-success" style="margin:2px;">Item ${appendCounter}</span>`)
  }

  if (path === '/api/swap-prepend') {
    appendCounter++
    return respond(res, 200, `<span class="badge badge-success" style="margin:2px;">New ${appendCounter}</span>`)
  }

  if (path === '/api/remove' && method === 'DELETE') {
    return respond(res, 200, '')
  }

  // --- OOB Swaps ---
  if (path === '/api/oob-swap') {
    oobCounter++
    return respond(res, 200, `
      <div id="oob-main">Main updated at ${new Date().toLocaleTimeString()}</div>
      <div id="oob-sidebar" hx-swap-oob="true">Sidebar updated via OOB! (${oobCounter})</div>
      <div id="oob-counter" hx-swap-oob="true">Counter: ${oobCounter}</div>
    `)
  }

  // --- Search ---
  if (path === '/api/search') {
    const params = await parseBody(req)
    const q = params.search || ''
    if (!q) return respond(res, 200, '<span style="color:#64748b;">Type to search...</span>')
    const results = ['HTMX', 'Hyperscript', 'Alpine.js', 'Preact', 'Vite', 'TypeScript'].filter(s => s.toLowerCase().includes(q.toLowerCase()))
    if (results.length === 0) return respond(res, 200, `<span style="color:#f59e0b;">No results for "${q}"</span>`)
    return respond(res, 200, results.map(r => `<span class="badge badge-success" style="margin:2px;">${r}</span>`).join(' '))
  }

  // --- Polling ---
  if (path === '/api/poll') {
    return respond(res, 200, `<span style="color:#64748b;">Poll: ${new Date().toLocaleTimeString()}</span>`)
  }

  // --- Boosted page ---
  if (path === '/api/boosted-page') {
    return respond(res, 200, html(`<div class="section"><h2>Boosted Page</h2><p>This was loaded via hx-boost!</p><a href="/" hx-boost="true" class="btn-primary" style="text-decoration:none;display:inline-block;margin-top:8px;">Back Home</a></div>`))
  }

  // --- Contact CRUD ---
  const contactMatch = path.match(/^\/api\/contact\/(\d+)(\/edit)?$/)
  if (contactMatch) {
    const id = parseInt(contactMatch[1])
    if (!CONTACTS[id]) return respond(res, 404, 'Contact not found')

    if (contactMatch[2] === '/edit' && method === 'GET') {
      return respond(res, 200, renderContactForm(id))
    }
    if (method === 'GET') {
      return respond(res, 200, renderContact(id))
    }
    if (method === 'PUT') {
      const params = await parseBody(req)
      CONTACTS[id] = { firstName: params.firstName || '', lastName: params.lastName || '', email: params.email || '' }
      return respond(res, 200, renderContact(id))
    }
  }

  // --- Todos ---
  if (path === '/api/todos' && method === 'POST') {
    const params = await parseBody(req)
    const todo = { id: todoId++, text: params.text || 'Untitled', done: false }
    TODOS.push(todo)
    return respond(res, 200, renderTodo(todo))
  }

  const todoMatch = path.match(/^\/api\/todos\/(\d+)(\/toggle)?$/)
  if (todoMatch) {
    const id = parseInt(todoMatch[1])
    const todo = TODOS.find(t => t.id === id)
    if (!todo) return respond(res, 404, 'Todo not found')

    if (todoMatch[2] === '/toggle' && method === 'PATCH') {
      todo.done = !todo.done
      return respond(res, 200, renderTodo(todo))
    }
    if (method === 'DELETE') {
      const idx = TODOS.findIndex(t => t.id === id)
      if (idx >= 0) TODOS.splice(idx, 1)
      return respond(res, 200, '')
    }
  }

  // --- 404 fallback ---
  respond(res, 404, `<span class="badge badge-error">404: ${path} not found</span>`)
})

server.listen(PORT, () => {
  console.log(`HTMX DevTools test server running at http://localhost:${PORT}`)
})
