export function HeadersTable({ headers, title }: { headers: Record<string, string>; title: string }) {
  const entries = Object.entries(headers)
  if (entries.length === 0) return null

  return (
    <div class="detail-section">
      <div class="detail-section__title">{title}</div>
      <div class="kv-table">
        {entries.map(([key, value]) => (
          <div class="kv-table__row" key={key}>
            <span class="kv-table__key">{key}</span>
            <span class="kv-table__value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
