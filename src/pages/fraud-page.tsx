import type { FormEvent } from 'react'
import { useState } from 'react'
import { api, shortDate, titleCase } from '../api'
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  StatusPill,
  useAsyncAction,
  useRemote,
} from '../components'
import type { FraudFlag } from '../types'

export function FraudPage() {
  const [status, setStatus] = useState('open')
  const [selected, setSelected] = useState<FraudFlag | null>(null)
  const mutation = useAsyncAction()
  const { data, setData, loading, error, reload } = useRemote(
    () => api<FraudFlag[]>(`/admin/fraud-flags?limit=100${status ? `&status=${status}` : ''}`),
    status,
  )
  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    const next = String(form.get('status'))
    const result = await mutation.run(() =>
      api<{ id: string; status: string }>(`/admin/fraud-flags/${selected.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: next, note: form.get('note') }),
      }),
    )
    if (!result) return
    setData(
      (data || [])
        .filter((flag) => (!status || next === status ? true : flag.id !== selected.id))
        .map((flag) => (flag.id === selected.id ? { ...flag, status: next } : flag)),
    )
    setSelected(null)
  }
  return (
    <>
      <PageHeader
        eyebrow="Risk operations"
        title="Fraud & risk"
        description="Prioritise suspicious activity by risk score and document every outcome."
        action={
          <div className="risk-legend">
            <span className="high" /> High risk <span className="medium" /> Medium
          </div>
        }
      />
      <div className="toolbar compact">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All flags</option>
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : !data?.length ? (
        <EmptyState
          title="No risk flags found"
          message="The selected investigation queue is clear."
        />
      ) : (
        <div className="risk-grid">
          {data.map((flag) => (
            <article className="risk-card" key={flag.id}>
              <div className="risk-card-top">
                <span className={`risk-score ${flag.riskScore >= 70 ? 'high' : 'medium'}`}>
                  <b>{flag.riskScore}</b>
                  <small>risk score</small>
                </span>
                <StatusPill value={flag.status} />
              </div>
              <p className="eyebrow">Triggered rule</p>
              <h3>{titleCase(flag.ruleTriggered)}</h3>
              <div className="risk-meta">
                <span>
                  User <code>{flag.userId.slice(0, 8)}...</code>
                </span>
                <span>Raised {shortDate(flag.createdAt)}</span>
              </div>
              <button className="button secondary full" onClick={() => setSelected(flag)}>
                Review case
              </button>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <Modal
          title="Update risk investigation"
          description={titleCase(selected.ruleTriggered)}
          onClose={() => setSelected(null)}
        >
          <div className="selected-risk">
            <span className={`risk-score ${selected.riskScore >= 70 ? 'high' : 'medium'}`}>
              <b>{selected.riskScore}</b>
              <small>risk</small>
            </span>
            <div>
              <span>User ID</span>
              <code>{selected.userId}</code>
              {selected.transactionId && (
                <>
                  <span>Transaction ID</span>
                  <code>{selected.transactionId}</code>
                </>
              )}
            </div>
          </div>
          <form className="modal-form" onSubmit={update}>
            <label>
              Investigation status
              <select name="status" defaultValue={selected.status}>
                <option value="open">Open</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </label>
            <ActionError message={mutation.error} />
            <label>
              Case note
              <textarea
                name="note"
                required
                minLength={3}
                maxLength={500}
                placeholder="Record the evidence and reason for this decision"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button className="button primary" disabled={mutation.busy}>
                {mutation.busy ? 'Saving...' : 'Save outcome'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
