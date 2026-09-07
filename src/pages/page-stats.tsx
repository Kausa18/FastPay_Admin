export function PageStats({
  scope,
  items,
}: {
  scope: string
  items: { label: string; value: string | number; hint: string; tone?: string }[]
}) {
  return (
    <section className="page-stats" aria-label="Page statistics">
      <p className="stats-scope">{scope}</p>
      <div className="page-stats-grid">
        {items.map((item) => (
          <article key={item.label} className={`page-stat ${item.tone || ''}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
          </article>
        ))}
      </div>
    </section>
  )
}
