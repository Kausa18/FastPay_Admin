import { useTableState } from '../hooks/use-table-state'
import { Pagination } from '../ui/table'
import { PageStats } from './page-stats'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import { api, shortDate, titleCase } from '../api'
import {
  EmptyState,
  ActionError,
  ErrorState,
  LoadingState,
  Notice,
  Modal,
  PageHeader,
  StatusPill,
  useAsyncAction,
  useRemote,
} from '../components'
import type { KycSubmission } from '../types'
import { DocumentImage } from './shared'

export function KycPage() {
  const table = useTableState({ sort: 'date', direction: 'asc', age: 'all', size: '10' })
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<KycSubmission | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const mutation = useAsyncAction()
  const { data, setData, loading, error, reload } = useRemote(() =>
    api<KycSubmission[]>('/kyc/pending'),
  )
  const queue = (data || [])
    .filter(
      (item) =>
        table.get('age') !== 'overdue' ||
        Date.now() - new Date(item.submittedAt).getTime() > 86400000,
    )
    .sort(
      (a, b) =>
        (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()) *
        (table.direction === 'asc' ? 1 : -1),
    )
  const visible = queue.slice((table.page - 1) * table.size, table.page * table.size)
  const selectedIndex = visible.findIndex((item) => item.id === selected?.id)
  useEffect(() => {
    if (!visible.some((item) => item.id === selected?.id)) setSelected(visible[0] || null)
  }, [visible.map((item) => item.id).join(','), selected?.id])
  useEffect(() => {
    mutation.clearError()
  }, [selected?.id, action])

  const decide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !action) return
    const note = String(new FormData(event.currentTarget).get('note') || '')
    const result = await mutation.run(() =>
      api<{ kycStatus: string }>(`/kyc/${selected.id}/decision`, {
        method: 'PUT',
        body: JSON.stringify({ approved: action === 'approve', note: note || undefined }),
      }),
    )
    if (!result) return
    const remaining = (data || []).filter((item) => item.id !== selected.id)
    setData(remaining)
    setNotice(
      `${selected.fullLegalName}: identity ${action === 'approve' ? 'approved' : 'rejected'}.`,
    )
    setSelected(
      visible[selectedIndex + 1] || visible.find((item) => item.id !== selected.id) || null,
    )
    setAction(null)
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} retry={reload} />
  return (
    <>
      <PageHeader
        eyebrow="Compliance review"
        title="KYC verification"
        description="Review identity evidence carefully and record a clear decision."
        action={
          <button className="button secondary" disabled={mutation.busy} onClick={reload}>
            Refresh queue
          </button>
        }
      />
      <Notice message={notice} onDismiss={() => setNotice('')} />
      {data && (
        <PageStats
          scope="Current identity review queue"
          items={[
            {
              label: 'Awaiting review',
              value: data.length,
              hint: 'Identity submissions to process',
            },
            {
              label: 'Waiting over 24h',
              value: data.filter((k) => Date.now() - new Date(k.submittedAt).getTime() > 86400000)
                .length,
              hint: 'Prioritise the oldest submissions',
              tone: 'orange',
            },
            {
              label: 'Submitted today',
              value: data.filter(
                (k) => new Date(k.submittedAt).toDateString() === new Date().toDateString(),
              ).length,
              hint: 'Pending submissions received today',
              tone: 'teal',
            },
          ]}
        />
      )}

      <div className="toolbar">
        <select
          aria-label="Submission order"
          value={table.direction}
          disabled={mutation.busy}
          onChange={(e) => table.set({ direction: e.target.value })}
        >
          <option value="asc">Oldest first</option>
          <option value="desc">Newest first</option>
        </select>
        <select
          aria-label="Submission age"
          value={table.get('age')}
          disabled={mutation.busy}
          onChange={(e) => table.set({ age: e.target.value })}
        >
          <option value="all">All pending submissions</option>
          <option value="overdue">Waiting over 24 hours</option>
        </select>
        <button className="button secondary" onClick={table.reset}>
          Reset filters
        </button>
      </div>
      {!visible.length ? (
        <EmptyState
          title={queue.length ? 'No submissions on this page' : 'No submissions in this queue'}
          message="Change the age filter or refresh to check for new submissions."
        />
      ) : (
        <section className="review-layout">
          <aside className="review-queue">
            <h3>Review queue</h3>
            {visible.map((item) => (
              <button
                key={item.id}
                disabled={mutation.busy}
                aria-pressed={selected?.id === item.id}
                className={selected?.id === item.id ? 'active' : ''}
                onClick={() => setSelected(item)}
              >
                <span>{item.fullLegalName.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{item.fullLegalName}</strong>
                  <small>
                    @{item.username || 'unknown'} - {shortDate(item.submittedAt)}
                  </small>
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
          </aside>
          {selected && (
            <article className="review-detail">
              <div className="review-step">
                <span>
                  Submission {selectedIndex + 1} of {visible.length} on this page
                </span>
                <button
                  className="button secondary"
                  disabled={mutation.busy || selectedIndex <= 0}
                  onClick={() => setSelected(visible[selectedIndex - 1])}
                >
                  Previous
                </button>
                <button
                  className="button secondary"
                  disabled={mutation.busy || selectedIndex >= visible.length - 1}
                  onClick={() => setSelected(visible[selectedIndex + 1])}
                >
                  Next
                </button>
              </div>
              <div className="review-title">
                <div>
                  <p className="eyebrow">Identity submission</p>
                  <h2>{selected.fullLegalName}</h2>
                  <span>@{selected.username || 'unknown'}</span>
                </div>
                <StatusPill value="pending" />
              </div>
              <div className="identity-grid">
                <div>
                  <span>Date of birth</span>
                  <strong>{selected.dateOfBirth}</strong>
                </div>
                <div>
                  <span>Document type</span>
                  <strong>{titleCase(selected.idType)}</strong>
                </div>
                <div>
                  <span>Document number</span>
                  <strong>{selected.idNumber}</strong>
                </div>
                <div>
                  <span>Submitted</span>
                  <strong>{shortDate(selected.submittedAt)}</strong>
                </div>
              </div>
              <div className="document-grid" key={selected.id}>
                <DocumentImage label="Identity document" value={selected.idDocumentPhoto} />
                <DocumentImage label="Live selfie" value={selected.selfiePhoto} />
              </div>
              <div className="review-actions">
                <button className="button danger-outline" onClick={() => setAction('reject')}>
                  <X size={18} /> Reject submission
                </button>
                <button className="button success" onClick={() => setAction('approve')}>
                  <Check size={18} /> Approve identity
                </button>
              </div>
            </article>
          )}
        </section>
      )}
      <Pagination state={table} total={queue.length} loading={mutation.busy} />
      {action && selected && (
        <Modal
          busy={mutation.busy}
          title={action === 'approve' ? 'Approve this identity?' : 'Reject this submission?'}
          description={
            action === 'approve'
              ? "The customer's account will receive verified KYC limits."
              : 'The customer will be asked to correct and resubmit their documents.'
          }
          onClose={() => setAction(null)}
        >
          <form className="modal-form" onSubmit={decide}>
            <label>
              {action === 'approve' ? 'Reviewer note (optional)' : 'Rejection reason'}
              <textarea
                name="note"
                required={action === 'reject'}
                minLength={action === 'reject' ? 3 : undefined}
                maxLength={500}
                placeholder={
                  action === 'approve'
                    ? 'Add any useful compliance note'
                    : 'Tell the customer exactly what must be corrected'
                }
              />
            </label>
            <ActionError message={mutation.error} />
            <div className="modal-actions">
              <button type="button" disabled={mutation.busy} className="button secondary" onClick={() => setAction(null)}>
                Cancel
              </button>
              <button
                disabled={mutation.busy}
                className={`button ${action === 'approve' ? 'success' : 'danger'}`}
              >
                {mutation.busy
                  ? 'Saving decision...'
                  : action === 'approve'
                    ? 'Approve KYC'
                    : 'Reject KYC'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

