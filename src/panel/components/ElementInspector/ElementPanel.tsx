import { useSignal } from '@preact/signals'
import { inspectedElement, htmxElements, pickedSelector, events } from '../../store'
import { sendCommand } from '../../connection'
import { api } from '../../../shared/browser-api'
import { AttributeList } from './AttributeList'
import { ElementHistory } from './ElementHistory'
import type { ElementDescriptor } from '../../../shared/types'
import { useEffect } from 'preact/hooks'

// ---- Types for DOM tree ----

interface DomTreeNode {
  tagName: string
  id: string
  classList: string[]
  selector: string
  htmxAttributes: Record<string, string>
  outerHtmlPreview: string
  children: DomTreeNode[]
  depth: number
  isHtmx: boolean
  devtoolsId: number
}

// ---- Scan: builds a tree of htmx elements with their DOM hierarchy ----

function scanElements(callback: (tree: DomTreeNode[], flat: ElementDescriptor[]) => void): void {
  const code = `(function() {
    function uniqueSel(el) {
      if (el.id) return '#' + CSS.escape(el.id);
      var parts = [];
      var cur = el;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        if (cur.id) { parts.unshift('#' + CSS.escape(cur.id)); break; }
        var tag = cur.tagName.toLowerCase();
        if (cur.parentElement) {
          var sibs = Array.from(cur.parentElement.children).filter(function(s) { return s.tagName === cur.tagName; });
          if (sibs.length > 1) tag += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
        }
        parts.unshift(tag);
        cur = cur.parentElement;
      }
      return parts.length ? parts.join(' > ') : el.tagName.toLowerCase();
    }
    function walk(el, depth) {
      var hasHx = false;
      for (var i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i].name.indexOf('hx-') === 0 || el.attributes[i].name.indexOf('data-hx-') === 0) { hasHx = true; break; }
      }
      var childNodes = [];
      for (var c = 0; c < el.children.length; c++) {
        var r = walk(el.children[c], depth + 1);
        if (r) childNodes.push(r);
      }
      if (!hasHx && childNodes.length === 0) return null;
      var attrs = {};
      for (var j = 0; j < el.attributes.length; j++) {
        var a = el.attributes[j];
        if (a.name.indexOf('hx-') === 0 || a.name.indexOf('data-hx-') === 0) attrs[a.name] = a.value;
      }
      var tag = el.tagName.toLowerCase();
      var oh = el.outerHTML || '';
      var closingIdx = oh.indexOf('>');
      var openTag = closingIdx > 0 ? oh.slice(0, closingIdx + 1) : oh.slice(0, 120);
      return {
        tagName: tag, id: el.id || '',
        classList: el.className ? el.className.split(' ').filter(Boolean) : [],
        selector: uniqueSel(el), htmxAttributes: attrs,
        outerHtmlPreview: openTag.length > 200 ? openTag.slice(0,200) + '...' : openTag,
        children: childNodes, depth: depth, isHtmx: hasHx, devtoolsId: 0
      };
    }
    var tree = [];
    var body = document.body;
    for (var i = 0; i < body.children.length; i++) {
      var n = walk(body.children[i], 0);
      if (n) tree.push(n);
    }
    return JSON.stringify(tree);
  })()`

  api.devtools.inspectedWindow['eval'](code, (result: string, err: any) => {
    if (err || !result) return
    try {
      const tree = JSON.parse(result) as DomTreeNode[]
      // Flatten for store compatibility
      const flat: ElementDescriptor[] = []
      function flatten(nodes: DomTreeNode[]) {
        for (const n of nodes) {
          if (n.isHtmx) {
            flat.push({
              devtoolsId: flat.length,
              tagName: n.tagName, id: n.id, classList: n.classList,
              selector: n.selector, htmxAttributes: n.htmxAttributes,
              outerHtmlPreview: n.outerHtmlPreview,
            })
          }
          flatten(n.children)
        }
      }
      flatten(tree)
      callback(tree, flat)
    } catch { /* parse error */ }
  })
}

function inspectElement(selector: string): void {
  const escaped = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const code = `(function() {
    var el = document.querySelector('${escaped}');
    if (!el) return JSON.stringify(null);
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name.indexOf('hx-') === 0 || a.name.indexOf('data-hx-') === 0) attrs[a.name] = a.value;
    }
    var tag = el.tagName.toLowerCase();
    var sel = tag;
    if (el.id) sel = '#' + el.id;
    var oh = el.outerHTML || '';
    var ci = oh.indexOf('>');
    var openTag = ci > 0 ? oh.slice(0, ci+1) : oh.slice(0,120);
    var desc = {
      devtoolsId: 0, tagName: tag, id: el.id || '',
      classList: el.className ? el.className.split(' ').filter(Boolean) : [],
      htmxAttributes: attrs, selector: sel,
      outerHtmlPreview: openTag.length > 200 ? openTag.slice(0,200) + '...' : openTag
    };
    var resolved = {};
    var hxTarget = el.getAttribute('hx-target') || el.getAttribute('data-hx-target');
    if (hxTarget) {
      var t = null;
      if (hxTarget === 'this') t = el;
      else if (hxTarget.indexOf('closest ') === 0) t = el.closest(hxTarget.slice(8));
      else if (hxTarget.indexOf('find ') === 0) t = el.querySelector(hxTarget.slice(5));
      else t = document.querySelector(hxTarget);
      if (t) {
        var tt = t.tagName.toLowerCase();
        resolved['hx-target'] = { devtoolsId:0, tagName:tt, id:t.id||'', classList:t.className?t.className.split(' ').filter(Boolean):[], htmxAttributes:{}, selector:t.id?'#'+t.id:tt, outerHtmlPreview:'' };
      } else resolved['hx-target'] = null;
    }
    var idata = {};
    try {
      var d = el['htmx-internal-data'];
      if (d) for (var k in d) {
        var v = d[k];
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') idata[k] = v;
        else if (v === null) idata[k] = null;
        else idata[k] = String(v).slice(0,100);
      }
    } catch(e) {}
    return JSON.stringify({ descriptor: desc, resolvedTargets: resolved, internalData: idata, requestHistory: [] });
  })()`

  api.devtools.inspectedWindow['eval'](code, (result: string, err: any) => {
    if (err || !result) return
    try {
      const el = JSON.parse(result)
      if (el) inspectedElement.value = el
    } catch {}
  })
}

function highlightElement(selector: string, show: boolean): void {
  const escaped = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  if (!show) {
    api.devtools.inspectedWindow['eval'](`(function(){ var o = document.getElementById('__htmx_dt_hl__'); if(o) o.style.display='none'; })()`)
    return
  }
  const code = `(function(){
    var el = document.querySelector('${escaped}');
    if (!el) return;
    var r = el.getBoundingClientRect();
    var o = document.getElementById('__htmx_dt_hl__');
    if (!o) {
      o = document.createElement('div');
      o.id = '__htmx_dt_hl__';
      o.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #3b82f6;background:rgba(59,130,246,0.08);transition:all 0.1s ease;';
      document.body.appendChild(o);
    }
    o.style.display = 'block';
    o.style.top = r.top+'px'; o.style.left = r.left+'px';
    o.style.width = r.width+'px'; o.style.height = r.height+'px';
  })()`
  api.devtools.inspectedWindow['eval'](code)
}

// ---- Tree Node Component ----

function TreeNode({ node, selectedSelector, onSelect }: {
  node: DomTreeNode
  selectedSelector: { value: string | null }
  onSelect: (sel: string) => void
}) {
  const collapsed = useSignal(false)
  const hasChildren = node.children.length > 0
  const isSelected = selectedSelector.value === node.selector
  const indent = node.depth * 16

  return (
    <div>
      <div
        class={`list-item ${isSelected ? 'list-item--selected' : ''}`}
        style={{ paddingLeft: `${indent + 4}px`, padding: '2px 6px 2px ' + (indent + 4) + 'px', gap: '4px', cursor: node.isHtmx ? 'pointer' : 'default', fontSize: '12px' }}
        onClick={() => {
          if (node.isHtmx) {
            onSelect(node.selector)
            inspectElement(node.selector)
          } else if (hasChildren) {
            collapsed.value = !collapsed.value
          }
        }}
        onMouseEnter={() => highlightElement(node.selector, true)}
        onMouseLeave={() => highlightElement(node.selector, false)}
      >
        {hasChildren ? (
          <span
            style={{ cursor: 'pointer', userSelect: 'none', width: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}
            onClick={(e) => { e.stopPropagation(); collapsed.value = !collapsed.value }}
          >
            {collapsed.value ? '\u25B6' : '\u25BC'}
          </span>
        ) : (
          <span style={{ width: '12px', flexShrink: 0 }} />
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: node.isHtmx ? 'var(--info)' : 'var(--text-muted)' }}>
          &lt;{node.tagName}
          {node.id && <span style={{ color: 'var(--warning)' }}>#{node.id}</span>}
          {node.classList.length > 0 && (
            <span style={{ color: 'var(--text-muted)' }}>
              .{node.classList.slice(0, 2).join('.')}
            </span>
          )}
          &gt;
        </span>
        {node.isHtmx && (
          <span style={{ fontSize: '10px', color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {Object.keys(node.htmxAttributes).map(k => k.replace('hx-', '')).join(' ')}
          </span>
        )}
      </div>
      {hasChildren && !collapsed.value && (
        node.children.map((child, i) => (
          <TreeNode key={`${child.selector}-${i}`} node={child} selectedSelector={selectedSelector} onSelect={onSelect} />
        ))
      )}
    </div>
  )
}

// ---- Main Component ----

export function ElementInspector() {
  const element = inspectedElement.value
  const treeData = useSignal<DomTreeNode[]>([])
  const elementCount = useSignal(0)
  const selectedSelector = useSignal<string | null>(null)
  const picking = useSignal(false)

  function doScan() {
    scanElements((tree, flat) => {
      treeData.value = tree
      elementCount.value = flat.length
      htmxElements.value = flat
    })
  }

  function doPick() {
    picking.value = true
    sendCommand('cmd:start-picker', null)
  }

  useEffect(() => {
    doScan()

    // Auto-refresh every 2s for real-time updates
    const interval = setInterval(doScan, 2000)

    // Debounced re-scan when new htmx events arrive (avoids excessive eval calls)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const unsubEvents = events.subscribe((evts) => {
      if (evts.length > 0) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(doScan, 500)
      }
    })

    // Subscribe to picker results from page-script
    const unsubPicked = pickedSelector.subscribe((sel) => {
      if (sel) {
        picking.value = false
        pickedSelector.value = ''
        selectedSelector.value = sel
        inspectElement(sel)
        doScan()
      }
    })

    return () => {
      clearInterval(interval)
      if (debounceTimer) clearTimeout(debounceTimer)
      unsubEvents()
      unsubPicked()
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div class="toolbar">
        <button
          class="toolbar__btn"
          title="Select an element in the page to inspect it"
          onClick={doPick}
          style={{ color: picking.value ? 'var(--accent)' : undefined, width: '28px', height: '28px', padding: '2px' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 3h5v2H5v4H3V4a1 1 0 0 1 1-1zm11 0h5a1 1 0 0 1 1 1v5h-2V5h-4V3zM3 15h2v4h4v2H4a1 1 0 0 1-1-1v-5zm18 0v5a1 1 0 0 1-1 1h-5v-2h4v-4h2z"/>
            <path d="M10 8l-6 6m0 0V9m0 5h5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {picking.value ? 'Click an element on the page...' : `${elementCount.value} htmx element${elementCount.value !== 1 ? 's' : ''}`}
        </span>
      </div>
      <div class="split-panel" style={{ flex: 1 }}>
        <div class="split-panel__list" style={{ minWidth: '280px' }}>
          {treeData.value.length === 0 ? (
            <div class="empty-state" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px' }}>No htmx elements found</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Waiting for htmx elements...</div>
            </div>
          ) : (
            treeData.value.map((node, i) => (
              <TreeNode
                key={`${node.selector}-${i}`}
                node={node}
                selectedSelector={selectedSelector}
                onSelect={(sel) => { selectedSelector.value = sel }}
              />
            ))
          )}
        </div>
        <div class="split-panel__detail">
          {element ? (
            <div style={{ overflow: 'auto', height: '100%' }}>
              <AttributeList element={element} />
              <ElementHistory element={element} />
            </div>
          ) : (
            <div class="empty-state">
              <div>Select an element to inspect</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Hover to highlight on page</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
