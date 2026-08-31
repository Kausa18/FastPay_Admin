import { FileCheck2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AdminRole } from '../types'

export type PlatformOverview = {
  total_transactions: number
  total_volume_zmw: number
  total_revenue_zmw: number
  completed_count: number
  failed_count: number
  last_24h_count: number
}

export type NetworkStat = {
  network: string
  transaction_count: number
  completed_count: number
  failed_count: number
  total_volume_zmw: number
  success_rate: number | null
}

export const roleCan = (role: AdminRole, roles: AdminRole[]) =>
  role === 'super_admin' || roles.includes(role)

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
}: {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone?: string
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <div className="metric-main">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

export function DocumentImage({ label, value }: { label: string; value: string }) {
  const source = value.startsWith('data:') ? value : `data:image/jpeg;base64,${value}`
  return (
    <figure>
      <figcaption>{label}</figcaption>
      <div>
        <img
          src={source}
          alt={label}
          onError={(event) => {
            event.currentTarget.style.display = 'none'
            event.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
        />
        <span className="document-placeholder hidden">
          <FileCheck2 size={30} /> Preview unavailable
        </span>
      </div>
    </figure>
  )
}

export function RoleSelect({ value = 'support' }: { value?: AdminRole }) {
  return (
    <select name="role" defaultValue={value}>
      <option value="support">Support</option>
      <option value="compliance">Compliance</option>
      <option value="finance">Finance</option>
      <option value="operations">Operations</option>
      <option value="super_admin">Super admin</option>
    </select>
  )
}
