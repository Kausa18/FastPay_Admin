import { AlertTriangle, BadgeCheck, CircleDollarSign, Landmark, ShieldCheck } from 'lucide-react'
import { api, money, titleCase } from '../api'
import { EmptyState, ErrorState, LoadingState, PageHeader, useRemote } from '../components'
import { useAuth } from '../auth-context'
import { MetricCard, PlatformOverview, roleCan } from './shared'

export function FinancePage() {
  const { admin } = useAuth()
  const canLedger = roleCan(admin.role, ['finance'])
  const overview = useRemote(() => api<PlatformOverview>('/analytics/platform/overview'))
  const ledger = useRemote(
    () =>
      canLedger
        ? api<{
            accounts: Record<string, { debits: number; credits: number; balance: number }>
            totalDebits: number
            totalCredits: number
            balanced: boolean
          }>('/ledger/trial-balance')
        : Promise.resolve({ accounts: {}, totalDebits: 0, totalCredits: 0, balanced: true }),
    String(canLedger),
  )
  if (overview.loading || ledger.loading) return <LoadingState />
  if (canLedger && ledger.error) return <ErrorState message={ledger.error} retry={ledger.reload} />
  if (overview.error) return <ErrorState message={overview.error} retry={overview.reload} />
  const data = overview.data!
  const entries = Object.entries(ledger.data?.accounts || {}) as [
    string,
    { debits: number; credits: number; balance: number },
  ][]
  return (
    <>
      <PageHeader
        eyebrow="Financial control"
        title="Finance & ledger"
        description="Monitor platform earnings, completed volume and double-entry balances."
      />
      <section className="metrics-grid finance-metrics">
        <MetricCard
          label="Gross volume"
          value={money(data.total_volume_zmw)}
          detail="Completed transaction value"
          icon={Landmark}
        />
        <MetricCard
          label="Fee revenue"
          value={money(data.total_revenue_zmw)}
          detail="Platform earnings"
          icon={CircleDollarSign}
          tone="green"
        />
        <MetricCard
          label="Completed"
          value={data.completed_count}
          detail="Successful payments"
          icon={BadgeCheck}
          tone="teal"
        />
        <MetricCard
          label="Failed"
          value={data.failed_count}
          detail="Payments requiring monitoring"
          icon={AlertTriangle}
          tone="orange"
        />
      </section>
      <section className="panel ledger-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Double-entry control</p>
            <h2>Trial balance</h2>
          </div>
          <span className={`balance-badge ${ledger.data?.balanced ? 'balanced' : ''}`}>
            <ShieldCheck size={17} />{' '}
            {entries.length
              ? ledger.data?.balanced
                ? 'Ledger balanced'
                : 'Imbalance detected'
              : canLedger
                ? 'No ledger entries'
                : 'Finance role required'}
          </span>
        </div>
        {canLedger ? (
          entries.length ? (
            <>
              <div className="ledger-totals">
                <span>
                  Total debits <strong>{money(ledger.data?.totalDebits)}</strong>
                </span>
                <span>
                  Total credits <strong>{money(ledger.data?.totalCredits)}</strong>
                </span>
              </div>
              <div className="ledger-list">
                {entries.map(([account, value]) => (
                  <div key={account}>
                    <span>{titleCase(account)}</span>
                    <strong>{money(value.balance)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No ledger balances yet" />
          )
        ) : (
          <div className="restricted-panel">
            <ShieldCheck size={28} />
            <h3>Finance permission required</h3>
            <p>
              Your operations role can monitor performance but cannot inspect accounting balances.
            </p>
          </div>
        )}
      </section>
    </>
  )
}
