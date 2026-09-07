import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, shortDate, titleCase } from '../api'
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  StatusPill,
  useAsyncAction,
  useRemote,
} from '../components'
import type { FraudFlag } from '../types'
import { PageStats } from './page-stats'
import { useTableState } from '../hooks/use-table-state'
import { Pagination, type PageResult } from '../ui/table'
import { ReadableDetails } from '../ui/readable-details'

export function FraudPage() {
  const table = useTableState({ status: 'open', sort: 'risk', direction: 'desc' })
  const status = table.get('status')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const mutation = useAsyncAction()
  const path = `/admin/fraud-flags?${table.paging}${status ? `&status=${status}` : ''}`
  const { data, loading, error, reload } = useRemote(() => api<PageResult<FraudFlag>>(path), path)
  const rows = data?.items || []
  const selected = rows.find((row) => row.id === selectedId) || rows[0]
  useEffect(() => {
    mutation.clearError()
  }, [selected?.id])
  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    const next = String(form.get('status'))
    const result = await mutation.run(() =>
      api(`/admin/fraud-flags/${selected.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: next, note: form.get('note') }),
      }),
    )
    if (result === undefined) return
    setNotice(`Case saved as ${titleCase(next)}. The queue has been refreshed.`)
    const index = rows.findIndex((row) => row.id === selected.id)
    setSelectedId(rows[index + 1]?.id || rows.find((row) => row.id !== selected.id)?.id || null)
    await reload()
  }
  return (
    <>
      <PageHeader
        title="Risk cases"
        description="Prioritise the highest risks, review the evidence and record a clear outcome."
        action={
          <button className="button secondary" disabled={loading || mutation.busy} onClick={reload}>
            Refresh queue
          </button>
        }
      />
      <Notice message={notice} onDismiss={() => setNotice('')} />
      {!loading && !error && data && (
        <PageStats
          scope="All risk cases matching the current status"
          items={[
            { label: 'Cases', value: data.total, hint: 'Matching the selected filters' },
            {
              label: 'High risk',
              value: data.stats.highRisk,
              hint: 'Score of 70 or higher',
              tone: 'red',
            },
            {
              label: 'Under review',
              value: data.stats.reviewing,
              hint: 'Investigations in progress',
              tone: 'orange',
            },
            {
              label: 'Accounts affected',
              value: data.stats.accounts,
              hint: 'Distinct accounts in these results',
            },
          ]}
        />
      )}
      <div className="toolbar">
        <select
          aria-label="Case status"
          disabled={mutation.busy}
          value={status}
          onChange={(e) => table.set({ status: e.target.value })}
        >
          <option value="">All cases</option>
          {['open', 'reviewing', 'resolved', 'dismissed'].map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        <select
          aria-label="Queue order"
          disabled={mutation.busy}
          value={`${table.sort}:${table.direction}`}
          onChange={(e) => {
            const [sort, direction] = e.target.value.split(':')
            table.set({ sort, direction })
          }}
        >
          <option value="risk:desc">Highest risk first</option>
          <option value="risk:asc">Lowest risk first</option>
          <option value="date:asc">Oldest first</option>
          <option value="date:desc">Newest first</option>
        </select>
        <button className="button secondary" disabled={mutation.busy} onClick={table.reset}>
          Reset filters
        </button>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : !rows.length ? (
        <EmptyState
          title="No cases in this queue"
          message="Choose another status or refresh to check for new cases."
        />
      ) : (
        <section className="review-layout">
          <aside className="review-queue">
            <h3>Case queue</h3>
            {rows.map((flag) => (
              <button
                key={flag.id}
                disabled={mutation.busy}
                aria-pressed={selected?.id === flag.id}
                className={selected?.id === flag.id ? 'active' : ''}
                onClick={() => setSelectedId(flag.id)}
              >
                <span className={flag.riskScore >= 70 ? 'risk-high' : ''}>{flag.riskScore}</span>
                <div>
                  <strong>{titleCase(flag.ruleTriggered)}</strong>
                  <small>{shortDate(flag.createdAt)}</small>
                  <StatusPill value={flag.status} />
                </div>
              </button>
            ))}
          </aside>
          {selected && (
            <article className="review-detail" key={selected.id}>
              <div className="review-title">
                <div>
                  <p className="eyebrow">Risk score {selected.riskScore} / 100</p>
                  <h2>{titleCase(selected.ruleTriggered)}</h2>
                </div>
                <StatusPill value={selected.status} />
              </div>
              <dl className="audit-facts">
                <div>
                  <dt>Account reference</dt>
                  <dd>{selected.userId}</dd>
                </div>
                <div>
                  <dt>Raised</dt>
                  <dd>{shortDate(selected.createdAt)}</dd>
                </div>
              </dl>
              <div className="related-links">
                <Link to={`/transactions?user_id=${selected.userId}`}>Account payments</Link>
                {selected.transactionId && <span>Payment reference: {selected.transactionId}</span>}
              </div>
              <h3>Recorded evidence</h3>
              {selected.details && Object.keys(selected.details).length ? (
                <ReadableDetails value={selected.details} />
              ) : (
                <p className="data-note">
                  No additional evidence was attached. Review the account’s payments before
                  recording an outcome.
                </p>
              )}
              <form className="modal-form review-outcome" onSubmit={update}>
                <h3>Record outcome</h3>
                <label>
                  Investigation status
                  <select name="status" defaultValue={selected.status} disabled={mutation.busy}>
                    {['open', 'reviewing', 'resolved', 'dismissed'].map((s) => (
                      <option key={s} value={s}>
                        {titleCase(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Case note
                  <textarea
                    name="note"
                    required
                    minLength={3}
                    maxLength={500}
                    disabled={mutation.busy}
                    placeholder="Describe the evidence and explain the outcome"
                  />
                </label>
                <ActionError message={mutation.error} />
                <button className="button primary" disabled={mutation.busy}>
                  {mutation.busy ? 'Saving outcome...' : 'Save and continue'}
                </button>
              </form>
            </article>
          )}
        </section>
      )}
      {data && !error && (
        <Pagination state={table} total={data.total} loading={loading || mutation.busy} />
      )}
    </>
  )
}
