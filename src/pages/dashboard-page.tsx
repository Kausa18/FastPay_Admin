import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { api, money, shortDate, subscribeToAdminEvents, titleCase } from '../api'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
  useRemote,
} from '../components'
import { useAuth } from '../auth-context'
import type { User } from '../types'
import { NetworkStat, roleCan } from './shared'
import { PageStats } from './page-stats'
import { useTableState } from '../hooks/use-table-state'

type Totals = { count: number; volume: number; completed: number; failed: number }
type Day = Totals & { date: string }
type Trends = { days: number; daily: Day[]; current: Totals; previous: Totals; updatedAt: string }
type Counts = {
  totalUsers: number | null
  pendingKyc: number | null
  openFraudFlags: number | null
}
const compare = (current: number, previous: number) =>
  previous > 0
    ? `${current >= previous ? '+' : ''}${(((current - previous) / previous) * 100).toFixed(1)}% vs previous period`
    : current > 0
      ? 'No activity in the previous period'
      : 'No activity in either period'

function PaymentChart({ data }: { data: Trends }) {
  const [metric, setMetric] = useState<'volume' | 'count'>('volume')
  const [selected, setSelected] = useState<string | null>(null)
  const max = Math.max(1, ...data.daily.map((day) => day[metric]))
  const current =
    data.daily.find((day) => day.date === selected) || data.daily[data.daily.length - 1]
  return (
    <article className="panel trend-panel">
      <div className="section-heading">
        <div>
          <h2>Payment activity</h2>
          <p className="data-note">Daily totals in UTC. Today is still in progress.</p>
        </div>
        <div className="segmented-tabs" role="group" aria-label="Chart metric">
          <button
            aria-pressed={metric === 'volume'}
            className={metric === 'volume' ? 'active' : ''}
            onClick={() => setMetric('volume')}
          >
            Completed value
          </button>
          <button
            aria-pressed={metric === 'count'}
            className={metric === 'count' ? 'active' : ''}
            onClick={() => setMetric('count')}
          >
            Payments
          </button>
        </div>
      </div>
      {data.current.count === 0 ? (
        <EmptyState
          title="No payments in this period"
          message="Choose a longer period or check back when payments have been recorded."
        />
      ) : (
        <>
          <div className="chart-scale">
            <span>{metric === 'volume' ? money(max) : max.toLocaleString()}</span>
            <span>{metric === 'volume' ? 'Completed payment value' : 'Payments initiated'}</span>
          </div>
          <div className="payment-chart" role="group" aria-label="Daily payment totals">
            {data.daily.map((day) => (
              <button
                key={day.date}
                className={current?.date === day.date ? 'selected' : ''}
                onMouseEnter={() => setSelected(day.date)}
                onFocus={() => setSelected(day.date)}
                onClick={() => setSelected(day.date)}
                aria-label={`${day.date}: ${day.count} payments, ${money(day.volume)} completed`}
                title={`${day.date}: ${metric === 'volume' ? money(day.volume) : day.count}`}
              >
                <span style={{ height: `${(day[metric] / max) * 100}%` }} />
              </button>
            ))}
          </div>
          <div className="chart-dates">
            <span>{data.daily[0]?.date}</span>
            <span>{data.daily[data.daily.length - 1]?.date}</span>
          </div>
          {current && (
            <p className="chart-detail" aria-live="polite">
              <strong>{current.date}</strong>
              <span>{current.count} payments</span>
              <span>{money(current.volume)} completed</span>
              <span>{current.failed} failed</span>
            </p>
          )}
        </>
      )}
      <details className="daily-breakdown">
        <summary>View daily figures</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date (UTC)</th>
                <th className="numeric">Payments</th>
                <th className="numeric">Completed value</th>
                <th className="numeric">Failed</th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((day) => (
                <tr key={day.date}>
                  <td>{day.date}</td>
                  <td className="numeric">{day.count}</td>
                  <td className="numeric">{money(day.volume)}</td>
                  <td className="numeric">{day.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  )
}

export function DashboardPage() {
  const { admin } = useAuth()
  const filters = useTableState({ days: '7' })
  const days = filters.get('days') === '30' ? 30 : 7
  const canFinance = roleCan(admin.role, ['finance', 'operations'])
  const canUsers = roleCan(admin.role, ['support', 'compliance', 'operations'])
  const canKyc = roleCan(admin.role, ['compliance'])
  const canRisk = roleCan(admin.role, ['compliance', 'operations'])
  const counts = useRemote(() => api<Counts>('/admin/dashboard/counts'))
  const trends = useRemote(
    () =>
      canFinance ? api<Trends>(`/analytics/platform/trends?days=${days}`) : Promise.resolve(null),
    String(days),
  )
  const networks = useRemote(
    () =>
      canFinance
        ? api<{ networks: NetworkStat[] }>(`/analytics/platform/networks?days=${days}`)
        : Promise.resolve(null),
    String(days),
  )
  const users = useRemote(() =>
    canUsers ? api<User[]>('/admin/users?limit=6') : Promise.resolve([]),
  )
  const [live, setLive] = useState(false),
    [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([counts.refresh(), trends.refresh(), networks.refresh(), users.refresh()])
    setRefreshing(false)
  }, [counts.refresh, trends.refresh, networks.refresh, users.refresh])
  useEffect(
    () =>
      subscribeToAdminEvents(() => {
        if (!document.hidden) void refresh()
      }, setLive),
    [refresh],
  )
  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Payment performance and the work that needs attention."
        action={
          <div className="header-controls">
            {canFinance && (
              <select
                aria-label="Dashboard period"
                value={days}
                onChange={(e) => filters.set({ days: e.target.value })}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            )}
            <button
              className="button secondary"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      />
      <div className="dashboard-context">
        <span className={`connection-status ${live ? 'connected' : ''}`}>
          {live ? 'Automatic updates connected' : 'Automatic updates reconnecting'}
        </span>
        {trends.data && <span>Updated {shortDate(trends.data.updatedAt)}</span>}
      </div>
      <section className="priority-strip" aria-label="Work requiring attention">
        {counts.loading ? (
          <LoadingState />
        ) : counts.error ? (
          <ErrorState message={counts.error} retry={counts.reload} />
        ) : (
          <>
            {canKyc && (
              <Link className="priority-item" to="/kyc">
                <span>Identity reviews</span>
                <strong>{counts.data?.pendingKyc ?? 'Unavailable'}</strong>
                <small>Awaiting a decision</small>
                <ArrowUpRight size={18} />
              </Link>
            )}
            {canRisk && (
              <Link className="priority-item" to="/fraud?status=open&sort=risk&direction=desc">
                <span>Open risk cases</span>
                <strong>{counts.data?.openFraudFlags ?? 'Unavailable'}</strong>
                <small>Review highest risk first</small>
                <ArrowUpRight size={18} />
              </Link>
            )}
            {canUsers && (
              <Link className="priority-item" to="/users">
                <span>Platform accounts</span>
                <strong>{counts.data?.totalUsers ?? 'Unavailable'}</strong>
                <small>All registered accounts</small>
                <ArrowUpRight size={18} />
              </Link>
            )}
          </>
        )}
        {canFinance && !trends.loading && !trends.error && trends.data && (
          <Link className="priority-item warning" to={`/transactions?status=failed&days=${days}`}>
            <span>Failed payments</span>
            <strong>{trends.data.current.failed}</strong>
            <small>In the selected {days}-day period</small>
            <ArrowUpRight size={18} />
          </Link>
        )}
      </section>
      {canFinance && (
        <>
          {trends.loading ? (
            <LoadingState />
          ) : trends.error ? (
            <ErrorState
              message={`Payment performance is unavailable. ${trends.error}`}
              retry={trends.reload}
            />
          ) : (
            trends.data && (
              <>
                <PageStats
                  scope={`Last ${days} UTC calendar days, including today. Comparison is against the preceding ${days} days.`}
                  items={[
                    {
                      label: 'Completed value',
                      value: money(trends.data.current.volume),
                      hint: compare(trends.data.current.volume, trends.data.previous.volume),
                    },
                    {
                      label: 'Payments initiated',
                      value: trends.data.current.count,
                      hint: compare(trends.data.current.count, trends.data.previous.count),
                    },
                    {
                      label: 'Completion rate',
                      value: trends.data.current.count
                        ? `${((trends.data.current.completed / trends.data.current.count) * 100).toFixed(1)}%`
                        : 'No activity',
                      hint: `${trends.data.current.completed} completed of ${trends.data.current.count} initiated`,
                      tone: 'teal',
                    },
                  ]}
                />
                <PaymentChart data={trends.data} />
              </>
            )
          )}
          <section className="panel provider-panel">
            <div className="section-heading">
              <h2>Provider performance</h2>
              <span className="data-note">Last {days} UTC calendar days</span>
            </div>
            {networks.loading ? (
              <LoadingState />
            ) : networks.error ? (
              <ErrorState message={networks.error} retry={networks.reload} />
            ) : (
              <div className="provider-cards">
                {networks.data?.networks.map((network) => (
                  <article key={network.network}>
                    <div className="section-heading">
                      <strong>{titleCase(network.network)}</strong>
                      <span>
                        {network.success_rate === null
                          ? 'No activity'
                          : `${network.success_rate}% completed`}
                      </span>
                    </div>
                    <div className="provider-meter">
                      <span style={{ width: `${network.success_rate || 0}%` }} />
                    </div>
                    <p>
                      {network.transaction_count} payments · {network.failed_count} failed
                    </p>
                    <Link to={`/transactions?network=${network.network}&days=${days}`}>
                      View payments
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {canUsers && (
        <section className="panel table-panel">
          <div className="panel-heading">
            <h2>Latest registrations</h2>
            <Link to="/users">View accounts</Link>
          </div>
          {users.loading ? (
            <LoadingState />
          ) : users.error ? (
            <ErrorState message={users.error} retry={users.reload} />
          ) : !users.data?.length ? (
            <EmptyState title="No accounts registered yet" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Identity</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.fullName}</strong>
                        <small className="fee-label">@{user.username}</small>
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
          )}
        </section>
      )}
    </>
  )
}
