import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CircleDollarSign,
  FileCheck2,
  RefreshCw,
  ShieldAlert,
  Users,
  WalletCards,
} from 'lucide-react'
import { api, money, shortDate, subscribeToAdminEvents, titleCase } from '../api'
import { EmptyState, LoadingState, PageHeader, StatusPill } from '../components'
import { useAuth } from '../auth-context'
import type { FraudFlag, KycSubmission, User } from '../types'
import { MetricCard, NetworkStat, PlatformOverview, roleCan } from './shared'

const networkLabels: Record<string, string> = {
  mtn: 'MTN Money',
  airtel: 'Airtel Money',
  zamtel: 'Zamtel Kwacha',
}

export function DashboardPage() {
  const { admin } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<PlatformOverview | null>(null)
  const [networks, setNetworks] = useState<NetworkStat[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [kyc, setKyc] = useState<KycSubmission[]>([])
  const [fraud, setFraud] = useState<FraudFlag[]>([])
  const [counts, setCounts] = useState<{
    totalUsers: number | null
    pendingKyc: number | null
    openFraudFlags: number | null
  } | null>(null)
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const requests: Promise<unknown>[] = [
      api<{
        totalUsers: number | null
        pendingKyc: number | null
        openFraudFlags: number | null
      }>('/admin/dashboard/counts').then(setCounts),
    ]
    if (roleCan(admin.role, ['finance', 'operations'])) {
      requests.push(api<PlatformOverview>('/analytics/platform/overview').then(setOverview))
      requests.push(
        api<{ networks: NetworkStat[] }>('/analytics/platform/networks').then((data) =>
          setNetworks(data.networks),
        ),
      )
    }
    if (roleCan(admin.role, ['support', 'compliance', 'operations']))
      requests.push(api<User[]>('/admin/users?limit=6').then(setUsers))
    if (roleCan(admin.role, ['compliance']))
      requests.push(api<KycSubmission[]>('/kyc/pending').then(setKyc))
    if (roleCan(admin.role, ['compliance', 'operations']))
      requests.push(api<FraudFlag[]>('/admin/fraud-flags?status=open&limit=6').then(setFraud))
    await Promise.allSettled(requests)
  }, [admin.role])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  useEffect(() => subscribeToAdminEvents(() => void load(), setLive), [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) return <LoadingState />
  const totalNetworkTx = networks.reduce((sum, n) => sum + n.transaction_count, 0)
  const totalNetworkCompleted = networks.reduce((sum, n) => sum + n.completed_count, 0)
  const overallSuccessRate = totalNetworkTx
    ? Math.round((totalNetworkCompleted / totalNetworkTx) * 100)
    : null
  const completedRate = overview?.total_transactions
    ? Math.round((overview.completed_count / overview.total_transactions) * 100)
    : 0
  return (
    <>
      <PageHeader
        eyebrow="Platform command centre"
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${(admin.fullName || 'admin').split(' ')[0]}.`}
        description="Here's what needs attention across BrinkPay right now."
        action={
          <button className="button secondary" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? 'spin' : ''} /> Refresh data
          </button>
        }
      />
      <section className="metrics-grid">
        {overview && (
          <>
            <MetricCard
              label="Payment volume"
              value={money(overview.total_volume_zmw)}
              detail="Lifetime completed volume"
              icon={CircleDollarSign}
            />
            <MetricCard
              label="Platform revenue"
              value={money(overview.total_revenue_zmw)}
              detail="Fees from completed payments"
              icon={WalletCards}
              tone="teal"
            />
            <MetricCard
              label="Success rate"
              value={`${completedRate}%`}
              detail={`${overview.completed_count} completed payments`}
              icon={BadgeCheck}
              tone="green"
            />
            <MetricCard
              label="Last 24 hours"
              value={overview.last_24h_count}
              detail={`${overview.failed_count} failures overall`}
              icon={Activity}
              tone="orange"
            />
          </>
        )}
        {!overview && (
          <>
            <MetricCard
              label="Pending KYC"
              value={counts?.pendingKyc ?? 0}
              detail="Identity reviews waiting"
              icon={FileCheck2}
            />
            <MetricCard
              label="Open risk flags"
              value={counts?.openFraudFlags ?? 0}
              detail="Cases needing attention"
              icon={ShieldAlert}
              tone="orange"
            />
            <MetricCard
              label="Platform accounts"
              value={counts?.totalUsers ?? 0}
              detail="Exact registered account count"
              icon={Users}
              tone="teal"
            />
          </>
        )}
      </section>
      <section className="dashboard-grid">
        <article className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Priority queue</p>
              <h2>Requires attention</h2>
            </div>
            <span className="live-indicator">
              <i /> {live ? 'Live' : 'Connecting'}
            </span>
          </div>
          <div className="attention-list">
            {roleCan(admin.role, ['compliance']) && (
              <button
                type="button"
                className="attention-row"
                onClick={() => navigate('/kyc')}
                disabled={!counts?.pendingKyc}
              >
                <span className="attention-icon blue">
                  <FileCheck2 />
                </span>
                <div>
                  <strong>KYC submissions</strong>
                  <p>
                    {counts?.pendingKyc
                      ? `${counts.pendingKyc} customers are waiting for a decision.`
                      : 'The identity review queue is clear.'}
                  </p>
                </div>
                <b>{counts?.pendingKyc ?? 0}</b>
              </button>
            )}
            {roleCan(admin.role, ['compliance', 'operations']) && (
              <button
                type="button"
                className="attention-row"
                onClick={() => navigate('/fraud')}
                disabled={!counts?.openFraudFlags}
              >
                <span className="attention-icon orange">
                  <ShieldAlert />
                </span>
                <div>
                  <strong>Risk investigations</strong>
                  <p>
                    {counts?.openFraudFlags
                      ? 'Open flags require evidence review.'
                      : 'No open risk flags in the current queue.'}
                  </p>
                </div>
                <b>{counts?.openFraudFlags ?? 0}</b>
              </button>
            )}
            {overview && (
              <button
                type="button"
                className="attention-row"
                onClick={() => navigate('/transactions?status=failed')}
                disabled={!overview.failed_count}
              >
                <span className="attention-icon red">
                  <AlertTriangle />
                </span>
                <div>
                  <strong>Failed payments</strong>
                  <p>Monitor provider failures and customer impact.</p>
                </div>
                <b>{overview.failed_count}</b>
              </button>
            )}
            {!kyc.length && !fraud.length && !overview && <EmptyState />}
          </div>
        </article>
        <article className="panel health-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Provider performance</p>
              <h2>Network breakdown</h2>
            </div>
          </div>
          {networks.length > 0 ? (
            <>
              <div className="health-score">
                <div
                  className="score-ring"
                  style={{ '--fill': `${overallSuccessRate ?? 0}%` } as CSSProperties}
                >
                  <strong>{overallSuccessRate !== null ? `${overallSuccessRate}%` : '—'}</strong>
                  <span>success rate</span>
                </div>
              </div>
              <div className="provider-list">
                {networks.map((net) => (
                  <div key={net.network}>
                    <span className={`provider-dot ${net.network}`} />
                    <b>{networkLabels[net.network] || titleCase(net.network)}</b>
                    {net.transaction_count ? (
                      <span className="provider-rate">{net.success_rate}% success</span>
                    ) : (
                      <StatusPill value="no activity" />
                    )}
                  </div>
                ))}
              </div>
              <p className="data-note">
                Based on {totalNetworkTx} recorded transaction{totalNetworkTx === 1 ? '' : 's'}{' '}
                across all providers.
              </p>
            </>
          ) : (
            <EmptyState
              title="No transactions yet"
              message="Provider performance will appear once payments start flowing."
            />
          )}
        </article>
      </section>
      {users.length > 0 && (
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Latest registrations</p>
              <h2>New platform accounts</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Account</th>
                  <th>KYC</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="person-cell">
                        <span>{user.fullName.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <strong>{user.fullName}</strong>
                          <small>@{user.username}</small>
                        </div>
                      </div>
                    </td>
                    <td>{titleCase(user.accountType)}</td>
                    <td>
                      <StatusPill value={user.kycStatus} />
                    </td>
                    <td>
                      <StatusPill value={user.status} />
                    </td>
                    <td>{shortDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
