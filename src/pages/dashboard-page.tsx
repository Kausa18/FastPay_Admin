import { useEffect, useState } from 'react'
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
import { api, money, shortDate, titleCase } from '../api'
import { EmptyState, LoadingState, PageHeader, StatusPill } from '../components'
import { useAuth } from '../auth-context'
import type { FraudFlag, KycSubmission, User } from '../types'
import { MetricCard, PlatformOverview, roleCan } from './shared'

export function DashboardPage() {
  const { admin } = useAuth()
  const [overview, setOverview] = useState<PlatformOverview | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [kyc, setKyc] = useState<KycSubmission[]>([])
  const [fraud, setFraud] = useState<FraudFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const requests: Promise<void>[] = []
    if (roleCan(admin.role, ['finance', 'operations']))
      requests.push(api<PlatformOverview>('/analytics/platform/overview').then(setOverview))
    if (roleCan(admin.role, ['support', 'compliance', 'operations']))
      requests.push(api<User[]>('/admin/users?limit=6').then(setUsers))
    if (roleCan(admin.role, ['compliance']))
      requests.push(api<KycSubmission[]>('/kyc/pending').then(setKyc))
    if (roleCan(admin.role, ['compliance', 'operations']))
      requests.push(api<FraudFlag[]>('/admin/fraud-flags?status=open&limit=6').then(setFraud))
    Promise.allSettled(requests).finally(() => setLoading(false))
  }, [admin.role])

  if (loading) return <LoadingState />
  const completedRate = overview?.total_transactions
    ? Math.round((overview.completed_count / overview.total_transactions) * 100)
    : 0
  return (
    <>
      <PageHeader
        eyebrow="Platform command centre"
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${(admin.fullName || 'admin').split(' ')[0]}.`}
        description="Here's what needs attention across FastPay right now."
        action={
          <button className="button secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={17} /> Refresh data
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
              value={kyc.length}
              detail="Identity reviews waiting"
              icon={FileCheck2}
            />
            <MetricCard
              label="Open risk flags"
              value={fraud.length}
              detail="Cases needing attention"
              icon={ShieldAlert}
              tone="orange"
            />
            <MetricCard
              label="Recent accounts"
              value={users.length}
              detail="Latest visible registrations"
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
              <i /> Live
            </span>
          </div>
          <div className="attention-list">
            {roleCan(admin.role, ['compliance']) && (
              <div className="attention-row">
                <span className="attention-icon blue">
                  <FileCheck2 />
                </span>
                <div>
                  <strong>KYC submissions</strong>
                  <p>
                    {kyc.length
                      ? `${kyc.length} customers are waiting for a decision.`
                      : 'The identity review queue is clear.'}
                  </p>
                </div>
                <b>{kyc.length}</b>
              </div>
            )}
            {roleCan(admin.role, ['compliance', 'operations']) && (
              <div className="attention-row">
                <span className="attention-icon orange">
                  <ShieldAlert />
                </span>
                <div>
                  <strong>Risk investigations</strong>
                  <p>
                    {fraud.length
                      ? 'Open flags require evidence review.'
                      : 'No open risk flags in the current queue.'}
                  </p>
                </div>
                <b>{fraud.length}</b>
              </div>
            )}
            {overview && (
              <div className="attention-row">
                <span className="attention-icon red">
                  <AlertTriangle />
                </span>
                <div>
                  <strong>Failed payments</strong>
                  <p>Monitor provider failures and customer impact.</p>
                </div>
                <b>{overview.failed_count}</b>
              </div>
            )}
            {!kyc.length && !fraud.length && !overview && <EmptyState />}
          </div>
        </article>
        <article className="panel health-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Provider setup</p>
              <h2>Network adapters</h2>
            </div>
          </div>
          <div className="health-score">
            <div className="score-ring demo">
              <strong>Demo</strong>
              <span>adapter mode</span>
            </div>
          </div>
          <div className="provider-list">
            <div>
              <span className="provider-dot mtn" />
              <b>MTN Money</b>
              <StatusPill value="configured" />
            </div>
            <div>
              <span className="provider-dot airtel" />
              <b>Airtel Money</b>
              <StatusPill value="configured" />
            </div>
            <div>
              <span className="provider-dot zamtel" />
              <b>Zamtel Kwacha</b>
              <StatusPill value="configured" />
            </div>
          </div>
          <p className="data-note">
            Live availability will appear after provider health endpoints are connected.
          </p>
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
