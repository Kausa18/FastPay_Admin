import { Avatar } from '../ui/avatar'
import { AccountDrawer } from './account-drawer'
import { useTableState } from '../hooks/use-table-state'
import { Pagination, SortHeader, type PageResult } from '../ui/table'
import { roleCan } from './shared'
import { useAuth } from '../auth-context'
import { PageStats } from './page-stats'
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
  const { admin } = useAuth()
  const table = useTableState({ sort: 'created', direction: 'desc', status: '', type: '', q: '' })
  const query = table.get('q'),
    status = table.get('status')
  const setQuery = (q: string) => table.set({ q })
  const [detailId, setDetailId] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [selected, setSelected] = useState<User | null>(null)
  const [notice, setNotice] = useState('')
  const mutation = useAsyncAction()
  const path = `/admin/users?${table.paging}${table.get('type') ? `&account_type=${table.get('type')}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}${status ? `&status=${status}` : ''}`
  const { data, loading, error, reload } = useRemote(() => api<PageResult<User>>(path), path)

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
    setVersion((value) => value + 1)
    void reload()
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
      {!loading && !error && data && (
        <PageStats
          scope="All accounts matching the current filters"
          items={[
            {
              label: 'Accounts',
              value: data.total,
              hint: 'Matching your search and status',
            },
            {
              label: 'Merchants',
              value: data.stats.merchants,
              hint: 'Matching business accounts',
              tone: 'teal',
            },
            {
              label: 'Active',
              value: data.stats.active,
              hint: 'Accounts with active access',
              tone: 'green',
            },
            {
              label: 'Restricted',
              value: data.stats.restricted,
              hint: 'Suspended or banned accounts',
              tone: 'orange',
            },
          ]}
        />
      )}

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
        <select
          value={status}
          aria-label="Account status"
          onChange={(e) => table.set({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
          <option value="pending_kyc">Pending KYC</option>
        </select>
        <select
          aria-label="Account type"
          value={table.get('type')}
          onChange={(e) => table.set({ type: e.target.value })}
        >
          <option value="">All account types</option>
          <option value="personal">Personal</option>
          <option value="merchant">Merchant</option>
        </select>
        <button className="button secondary" onClick={table.reset}>
          Reset filters
        </button>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : !data?.items.length ? (
        <EmptyState title="No users found" message="Try a different search or status filter." />
      ) : (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortHeader label="User" column="name" state={table} />
                  <th>Contact</th>
                  <SortHeader label="Account" column="type" state={table} />
                  <SortHeader label="KYC" column="kyc" state={table} />
                  <SortHeader label="Status" column="status" state={table} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="person-cell">
                        <Avatar name={user.fullName} photo={user.profilePhoto} />
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
                      <button className="row-action" onClick={() => setDetailId(user.id)}>
                        View account <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {data && !error && <Pagination state={table} total={data.total} loading={loading} />}
      {detailId && (
        <AccountDrawer
          id={detailId}
          version={version}
          onClose={() => setDetailId(null)}
          onChangeStatus={
            roleCan(admin.role, ['support', 'compliance'])
              ? (user) => {
                  mutation.clearError()
                  setSelected(user)
                }
              : undefined
          }
        />
      )}
      {selected && (
        <Modal
          busy={mutation.busy}
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
              <span>Suspended and banned users will immediately lose access to BrinkPay.</span>
            </div>
            <ActionError message={mutation.error} />
            <div className="modal-actions">
              <button type="button" disabled={mutation.busy} className="button secondary" onClick={() => setSelected(null)}>
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


