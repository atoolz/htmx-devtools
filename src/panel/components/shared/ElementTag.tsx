import type { ElementDescriptor } from '../../../shared/types'

export function ElementTag({ el }: { el: ElementDescriptor }) {
  const id = el.id ? `#${el.id}` : ''
  const classes = el.classList.slice(0, 2).map(c => `.${c}`).join('')
  return (
    <span class="element-tag">
      &lt;{el.tagName}{id && <span class="element-tag__attr">{id}</span>}{classes && <span class="element-tag__attr">{classes}</span>}&gt;
    </span>
  )
}
