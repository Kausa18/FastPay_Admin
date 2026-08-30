import type { FormEvent } from 'react'
import { useState } from 'react'
import { AlertTriangle, Check, ChevronRight, X } from 'lucide-react'
import { api, titleCase } from '../api'
import {
  EmptyState,
  ActionError,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  SearchField,
  StatusPill,
  useAsyncAction,
  useRemote,
} from '../components'
import type { User } from '../types'

export function UsersPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [notice, setNotice] = useState('')
  const mutation = useAsyncAction()
  const path = `/admin/users?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}${status ? `&status=${status}` : ''}`
  const { data, setData, loading, error, reload } = useRemote(() => api<User[]>(path), path)

  const updateStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    const nextStatus = String(form.get('status'))
    const updated = await mutation.run(() =>
      api<User>(`/admin/users/${selected.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus, reason: form.get('reason') }),
      }),
    )
    if (!updated) return
    setData(
      (data || []).map((user) =>
        user.id === selected.id ? { ...user, status: nextStatus } : user,
      ),
    )
    setNotice(`${selected.fullName}'s account is now ${nextStatus}.`)
    setSelected(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Customer operations"
        title="Users & merchants"
        description="Find accounts, verify their standing and apply controlled access changes."
      />
      {notice && (
        <div className="success-banner">
          <Check size={18} />
          {notice}
          <button onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search username, email or phone"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
          <option value="pending_kyc">Pending KYC</option>
        </select>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : !data?.length ? (
        <EmptyState title="No users found" message="Try a different search or status filter." />
      ) : (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Account</th>
                  <th>KYC</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((user) => (
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
                    <td>
                      <div className="stack-cell">
                        <span>{user.phoneNumber}</span>
                        <small>{user.email}</small>
                      </div>
                    </td>
                    <td>{titleCase(user.accountType)}</td>
                    <td>
                      <StatusPill value={user.kycStatus} />
                    </td>
                    <td>
                      <StatusPill value={user.status} />
                    </td>
                    <td>
                      <button className="row-action" onClick={() => setSelected(user)}>
                        Manage <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {selected && (
        <Modal
          title="Change account status"
          description={`This action affects ${selected.fullName} (@${selected.username}) immediately.`}
          onClose={() => setSelected(null)}
        >
          <form className="modal-form" onSubmit={updateStatus}>
            <label>
              New status
              <select name="status" defaultValue={selected.status}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </label>
            <label>
              Reason
              <textarea
                name="reason"
                minLength={3}
                maxLength={500}
                placeholder="Explain why this status is appropriate"
                required
              />
            </label>
            <div className="modal-warning">
              <AlertTriangle size={18} />
              <span>Suspended and banned users will immediately lose access to FastPay.</span>
            </div>
            <ActionError message={mutation.error} />
            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button className="button primary" disabled={mutation.busy}>
                {mutation.busy ? 'Saving...' : 'Confirm change'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
