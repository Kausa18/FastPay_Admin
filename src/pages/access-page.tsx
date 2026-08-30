import type { FormEvent } from 'react'
import { useState } from 'react'
import { AlertTriangle, ChevronRight, ShieldCheck, UserCheck } from 'lucide-react'
import { api, shortDate, titleCase } from '../api'
import {
  ActionError,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  StatusPill,
  useAsyncAction,
  useRemote,
} from '../components'
import type { AdminUser } from '../types'
import { RoleSelect } from './shared'

export function AccessPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const mutation = useAsyncAction()
  const { data, setData, loading, error, reload } = useRemote(() =>
    api<AdminUser[]>('/admin/admins'),
  )
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
    setSelected(null)
  }
  return (
    <>
      <PageHeader
        eyebrow="Privileged access"
        title="Administrator access"
        description="Provision staff with the minimum permissions required for their work."
        action={
          <button className="button primary" onClick={() => setCreateOpen(true)}>
            <UserCheck size={18} /> Add administrator
          </button>
        }
      />
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
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last sign in</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div className="person-cell admin-avatar">
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
                      <button className="row-action" onClick={() => setSelected(admin)}>
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
      {createOpen && (
        <Modal
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
                onClick={() => setCreateOpen(false)}
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
              <button type="button" className="button secondary" onClick={() => setSelected(null)}>
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
