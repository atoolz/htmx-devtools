import type { ElementDescriptor, InspectedElement } from '../../../shared/types'
import { ElementTag } from '../shared/ElementTag'

export function AttributeList({ element }: { element: InspectedElement }) {
  const attrs = element.descriptor.htmxAttributes
  const entries = Object.entries(attrs)

  return (
    <div>
      {/* Element info */}
      <div class="detail-section">
        <div class="detail-section__title">Element</div>
        <pre style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {element.descriptor.outerHtmlPreview}
        </pre>
      </div>

      {/* HTMX Attributes */}
      {entries.length > 0 && (
        <div class="detail-section">
          <div class="detail-section__title">HTMX Attributes</div>
          <div class="kv-table">
            {entries.map(([key, value]) => (
              <div class="kv-table__row" key={key}>
                <span class="kv-table__key">{key}</span>
                <span class="kv-table__value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Targets */}
      {Object.keys(element.resolvedTargets).length > 0 && (
        <div class="detail-section">
          <div class="detail-section__title">Resolved Targets</div>
          <div class="kv-table">
            {Object.entries(element.resolvedTargets).map(([attr, target]) => (
              <div class="kv-table__row" key={attr}>
                <span class="kv-table__key">{attr}</span>
                <span class="kv-table__value">
                  {target ? <ElementTag el={target} /> : <span style={{ color: 'var(--error)' }}>not found</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internal Data */}
      {Object.keys(element.internalData).length > 0 && (
        <div class="detail-section">
          <div class="detail-section__title">Internal Data</div>
          <div class="kv-table">
            {Object.entries(element.internalData).map(([key, value]) => (
              <div class="kv-table__row" key={key}>
                <span class="kv-table__key">{key}</span>
                <span class="kv-table__value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
