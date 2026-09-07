import { Link } from 'react-router-dom'
import { api, money, shortDate, titleCase } from '../api'
import { ErrorState, LoadingState, Modal, StatusPill, useRemote } from '../components'
import type { AuditLog, Transaction, User } from '../types'
import { presentAudit } from './audit-format'

type Detail = {
  user: User & { businessCategory?: string; businessDescription?: string }
  linkedAccounts: {
    id: string
    network: string
    accountName: string
    ending: string
    isPrimary: boolean
    isVerified: boolean
  }[]
  transactions: Transaction[]
  kyc: { status: string; submittedAt?: string; reviewedAt?: string }
  activity: AuditLog[] | null
}
export function AccountDrawer({
  id,
  version,
  onClose,
  onChangeStatus,
}: {
  id: string
  version: number
  onClose: () => void
  onChangeStatus?: (user: User) => void
}) {
  const { data, loading, error, reload } = useRemote(
    () => api<Detail>(`/admin/users/${id}`),
    `${id}:${version}`,
  )
  return (
    <Modal
      variant="drawer"
      title="Account details"
      description="Profile, linked accounts and recent activity."
      onClose={onClose}
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        data && (
          <>
            <div className="drawer-profile">
              <span className="admin-avatar">{data.user.fullName.slice(0, 1)}</span>
              <div>
                <h3>{data.user.fullName}</h3>
                <p>@{data.user.username}</p>
              </div>
              <StatusPill value={data.user.status} />
            </div>
            <dl className="audit-facts">
              <div>
                <dt>Email</dt>
                <dd>{data.user.email || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{data.user.phoneNumber || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Account type</dt>
                <dd>{titleCase(data.user.accountType)}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{shortDate(data.user.createdAt)}</dd>
              </div>
              {data.user.businessCategory && (
                <div>
                  <dt>Business category</dt>
                  <dd>{data.user.businessCategory}</dd>
                </div>
              )}
            </dl>
            {data.user.businessDescription && <p>{data.user.businessDescription}</p>}
            {onChangeStatus && (
              <button className="button secondary" onClick={() => onChangeStatus(data.user)}>
                Change account status
              </button>
            )}
            <section className="drawer-section">
              <h3>Identity verification</h3>
              <StatusPill value={data.kyc.status} />
              <dl className="audit-facts">
                <div>
                  <dt>Submitted</dt>
                  <dd>{shortDate(data.kyc.submittedAt)}</dd>
                </div>
                <div>
                  <dt>Reviewed</dt>
                  <dd>{shortDate(data.kyc.reviewedAt)}</dd>
                </div>
              </dl>
            </section>
            <section className="drawer-section">
              <h3>Linked payment accounts</h3>
              {data.linkedAccounts.length ? (
                data.linkedAccounts.map((account) => (
                  <div className="drawer-record" key={account.id}>
                    <div>
                      <strong>
                        {titleCase(account.network)} · ending {account.ending}
                      </strong>
                      <p>
                        {account.accountName}
                        {account.isPrimary ? ' · Primary account' : ''}
                      </p>
                    </div>
                    <StatusPill value={account.isVerified ? 'verified' : 'unverified'} />
                  </div>
                ))
              ) : (
                <p className="data-note">No payment accounts linked.</p>
              )}
            </section>
            <section className="drawer-section">
              <div className="section-heading">
                <h3>Recent payments</h3>
                <Link to={`/transactions?user_id=${data.user.id}`}>View all</Link>
              </div>
              {data.transactions.length ? (
                data.transactions.map((txn) => (
                  <div className="drawer-record" key={txn.id}>
                    <div>
                      <strong>{money(txn.amountZmw)}</strong>
                      <p>
                        {shortDate(txn.initiatedAt)} · {titleCase(txn.network)}
                      </p>
                    </div>
                    <StatusPill value={txn.status} />
                  </div>
                ))
              ) : (
                <p className="data-note">No payments recorded.</p>
              )}
              <p className="data-note">Up to 10 latest payments involving this account.</p>
            </section>
            {data.activity !== null && (
              <section className="drawer-section">
                <div className="section-heading">
                  <h3>Recent account activity</h3>
                  <Link to={`/audit?user=${data.user.id}`}>Full history</Link>
                </div>
                {data.activity.length ? (
                  data.activity.map((log) => (
                    <div className="drawer-record" key={log.id}>
                      <div>
                        <strong>{presentAudit(log).title}</strong>
                        <p>
                          {log.adminEmail.replace(/^user:/, '')} · {shortDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="data-note">No account activity recorded.</p>
                )}
              </section>
            )}
          </>
        )
      )}
    </Modal>
  )
}
