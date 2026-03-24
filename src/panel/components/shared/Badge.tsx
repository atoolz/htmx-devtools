export function Badge({ count, variant = 'info' }: { count: number; variant?: 'error' | 'info' }) {
  if (count === 0) return null
  return <span class={`badge badge--${variant}`}>{count}</span>
}
