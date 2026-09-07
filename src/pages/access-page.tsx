import { useTableState } from '../hooks/use-table-state'
import { Pagination, SortHeader } from '../ui/table'
import { PageStats } from './page-stats'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { AlertTriangle, ChevronRight, ShieldCheck, UserCheck } from 'lucide-react'
import { api, shortDate, titleCase } from '../api'
import {
  ActionError,
  ErrorState,
  LoadingState,
  Notice,
  EmptyState,
  Modal,
  PageHeader,
  StatusPill,
  useAsyncAction,
  useRemote,
} from '../components'
import type { AdminUser } from '../types'
import { RoleSelect } from './shared'

export function AccessPage() {
  const table = useTableState({ sort: 'createdAt', direction: 'desc', role: '', status: '' })
  const [notice, setNotice] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const mutation = useAsyncAction()
  const { data, setData, loading, error, reload } = useRemote(() =>
    api<AdminUser[]>('/admin/admins'),
  )
  const filtered = (data || [])
    .filter(
      (admin) =>
        (!table.get('role') || admin.role === table.get('role')) &&
        (!table.get('status') || admin.status === table.get('status')),
    )
    .sort(
      (a, b) =>
        String(a[table.sort as keyof AdminUser] || '').localeCompare(
          String(b[table.sort as keyof AdminUser] || ''),
          undefined,
          { numeric: true },
        ) * (table.direction === 'asc' ? 1 : -1),
    )
  const visible = filtered.slice((table.page - 1) * table.size, table.page * table.size)
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const created = await mutation.run(() =>
      api<AdminUser>('/admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          fullName: form.get('fullName'),
          password: form.get('password'),
          role: form.get('role'),
        }),
      }),
    )
    if (!created) return
    setData([...(data || []), created])
    setNotice(`Administrator ${created.fullName || created.email} added.`)
    setCreateOpen(false)
  }
  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected?.id) return
    const form = new FormData(event.currentTarget)
    const updated = await mutation.run(() =>
      api<AdminUser>(`/admin/admins/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({ role: form.get('role'), status: form.get('status') }),
      }),
    )
    if (!updated) return
    setData((data || []).map((admin) => (admin.id === updated.id ? updated : admin)))
    setNotice(`Access updated for ${updated.fullName || updated.email}.`)
    setSelected(null)
  }
  return (
    <>
      <PageHeader
        eyebrow="Privileged access"
        title="Administrator access"
        description="Provision staff with the minimum permissions required for their work."
        action={
          <button
            className="button primary"
            onClick={() => {
              mutation.clearError()
              setCreateOpen(true)
            }}
          >
            <UserCheck size={18} /> Add administrator
          </button>
        }
      />
      {!loading && !error && data && (
        <PageStats
          scope="Administrator accounts"
          items={[
            { label: 'Team members', value: data.length, hint: 'All administrator accounts' },
            {
              label: 'Active',
              value: data.filter((a) => a.status === 'active').length,
              hint: 'Enabled team access',
              tone: 'green',
            },
            {
              label: 'Super admins',
              value: data.filter((a) => a.role === 'super_admin' && a.status === 'active').length,
              hint: 'Active full-access administrators',
            },
            {
              label: 'Disabled',
              value: data.filter((a) => a.status === 'disabled').length,
              hint: 'Access has been revoked',
            },
          ]}
        />
      )}

      <div className="access-callout">
        <ShieldCheck size={22} />
        <div>
          <strong>Least privilege is active</strong>
          <p>
            Role changes and account disabling invalidate that administrator's current sessions
            immediately.
          </p>
        </div>
      </div>
      <Notice message={notice} onDismiss={() => setNotice('')} />
      <div className="toolbar">
        <select
          aria-label="Team role"
          value={table.get('role')}
          onChange={(e) => table.set({ role: e.target.value })}
        >
          <option value="">All roles</option>
          {['support', 'compliance', 'finance', 'operations', 'super_admin'].map((role) => (
            <option value={role} key={role}>
              {titleCase(role)}
            </option>
          ))}
        </select>
        <select
          aria-label="Team status"
          value={table.get('status')}
          onChange={(e) => table.set({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <button className="button secondary" onClick={table.reset}>
          Reset filters
        </button>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : !visible.length ? (
        <EmptyState title="No team members match these filters" />
      ) : (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortHeader label="Administrator" column="fullName" state={table} />
                  <SortHeader label="Role" column="role" state={table} />
                  <SortHeader label="Status" column="status" state={table} />
                  <SortHeader label="Last sign in" column="lastLoginAt" state={table} />
                  <SortHeader label="Created" column="createdAt" state={table} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div className="person-cell">
                        <span>{(admin.fullName || admin.email).slice(0, 2).toUpperCase()}</span>
                        <div>
                          <strong>{admin.fullName}</strong>
                          <small>{admin.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="role-pill">{titleCase(admin.role)}</span>
                    </td>
                    <td>
                      <StatusPill value={admin.status} />
                    </td>
                    <td>{shortDate(admin.lastLoginAt)}</td>
                    <td>{shortDate(admin.createdAt)}</td>
                    <td>
                      <button
                        className="row-action"
                        onClick={() => {
                          mutation.clearError()
                          setSelected(admin)
                        }}
                      >
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
      {!error && <Pagination state={table} total={filtered.length} loading={loading} />}
      {createOpen && (
        <Modal
          busy={mutation.busy}
          title="Add an administrator"
          description="Create a staff identity with tightly scoped access."
          onClose={() => setCreateOpen(false)}
        >
          <form className="modal-form" onSubmit={create}>
            <label>
              Full name
              <input name="fullName" minLength={2} maxLength={150} required />
            </label>
            <ActionError message={mutation.error} />
            <label>
              Work email
              <input name="email" type="email" required />
            </label>
            <label>
              Temporary password
              <input name="password" type="password" minLength={12} maxLength={128} required />
            </label>
            <label>
              Role
              <RoleSelect />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={mutation.busy} onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={mutation.busy}>
                {mutation.busy ? 'Creating...' : 'Create administrator'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          busy={mutation.busy}
          title="Manage administrator"
          description={`${selected.fullName} - ${selected.email}`}
          onClose={() => setSelected(null)}
        >
          <form className="modal-form" onSubmit={update}>
            <label>
              Role
              <RoleSelect value={selected.role} />
            </label>
            <label>
              Account status
              <select name="status" defaultValue={selected.status}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <div className="modal-warning">
              <AlertTriangle size={18} />
              <span>Any change will sign this administrator out of all current sessions.</span>
            </div>
            <ActionError message={mutation.error} />
            <div className="modal-actions">
              <button type="button" disabled={mutation.busy} className="button secondary" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button className="button primary" disabled={mutation.busy}>
                {mutation.busy ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

