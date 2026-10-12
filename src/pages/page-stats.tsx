import { StatCard } from '../ui/stat-card'
import type { StatCardProps } from '../ui/stat-card'

export function PageStats({ scope, items }: { scope: string; items: StatCardProps[] }) {
  return (
    <section className="page-stats mb-6" aria-label="Page statistics">
      <p className="stats-scope mb-3 text-xs leading-5 text-brinkpay-muted">{scope}</p>
      <div className="page-stats-grid grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] max-sm:[&>:last-child:nth-child(odd)]:col-span-full">
        {items.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
    </section>
  )
}
