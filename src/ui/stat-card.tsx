import { ChartNoAxesCombined } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type StatCardProps = {
  label: string
  value: string | number
  hint: string
  tone?: string
  icon?: LucideIcon
}

const accents: Record<string, string> = {
  blue: 'bg-brinkpay-blue text-white',
  teal: 'bg-brinkpay-teal text-white',
  green: 'bg-emerald-600 text-white',
  orange: 'bg-amber-500 text-white',
  red: 'bg-red-600 text-white',
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'blue',
  icon: Icon = ChartNoAxesCombined,
}: StatCardProps) {
  return (
    <article
      className={`page-stat ${tone} flex min-w-0 flex-col rounded-xl border border-brinkpay-border bg-white p-4 shadow-sm sm:p-5`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-sm leading-5 font-medium text-brinkpay-muted">{label}</span>
        <span
          className={`hidden size-10 shrink-0 items-center justify-center rounded-lg sm:flex ${accents[tone] || accents.blue}`}
          aria-hidden="true"
        >
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>
      <strong className="block text-xl leading-tight font-bold tracking-tight break-words text-brinkpay-navy tabular-nums sm:text-3xl">
        {value}
      </strong>
      <small className="mt-2 block text-xs leading-5 text-brinkpay-muted">{hint}</small>
    </article>
  )
}
