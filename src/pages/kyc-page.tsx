import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Check, ChevronRight, Clock3, X } from 'lucide-react'
import { api, shortDate, titleCase } from '../api'
import {
  EmptyState,
  ActionError,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  StatusPill,
  useAsyncAction,
  useRemote,
} from '../components'
import type { KycSubmission } from '../types'
import { DocumentImage } from './shared'

export function KycPage() {
  const [selected, setSelected] = useState<KycSubmission | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const mutation = useAsyncAction()
  const { data, setData, loading, error, reload } = useRemote(() =>
    api<KycSubmission[]>('/kyc/pending'),
  )
  useEffect(() => {
    if (!selected && data?.length) setSelected(data[0])
  }, [data, selected])

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
    setSelected(remaining[0] || null)
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
          <span className="queue-count">
            <Clock3 size={17} /> {data?.length || 0} awaiting review
          </span>
        }
      />
      {!data?.length ? (
        <EmptyState
          title="KYC queue is clear"
          message="New identity submissions will appear here for review."
        />
      ) : (
        <section className="review-layout">
          <aside className="review-queue">
            <h3>Review queue</h3>
            {data.map((item) => (
              <button
                key={item.id}
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
              <div className="document-grid">
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
      {action && selected && (
        <Modal
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
              <button type="button" className="button secondary" onClick={() => setAction(null)}>
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
