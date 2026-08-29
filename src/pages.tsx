import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, Ban, Building2,
  Check, ChevronRight, CircleDollarSign, Clock3, FileCheck2, Landmark, RefreshCw,
  ShieldAlert, ShieldCheck, UserCheck, Users, WalletCards, X,
} from 'lucide-react'
import { api, money, shortDate, titleCase } from './api'
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader, SearchField, StatusPill, useRemote } from './components'
import { useAuth } from './App'
import type { AdminRole, AdminUser, AuditLog, FraudFlag, KycSubmission, Transaction, User } from './types'

type PlatformOverview = {
  total_transactions: number
  total_volume_zmw: number
  total_revenue_zmw: number
  completed_count: number
  failed_count: number
  last_24h_count: number
}

const roleCan = (role: AdminRole, roles: AdminRole[]) => role === 'super_admin' || roles.includes(role)

function MetricCard({ label, value, detail, icon: Icon, tone = 'blue' }: { label: string; value: string | number; detail: string; icon: typeof Activity; tone?: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={21} /></div><div className="metric-main"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>
}

export function DashboardPage() {
  const { admin } = useAuth()
  const [overview, setOverview] = useState<PlatformOverview | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [kyc, setKyc] = useState<KycSubmission[]>([])
  const [fraud, setFraud] = useState<FraudFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const requests: Promise<void>[] = []
    if (roleCan(admin.role, ['finance', 'operations'])) requests.push(api<PlatformOverview>('/analytics/platform/overview').then(setOverview))
    if (roleCan(admin.role, ['support', 'compliance', 'operations'])) requests.push(api<User[]>('/admin/users?limit=6').then(setUsers))
    if (roleCan(admin.role, ['compliance'])) requests.push(api<KycSubmission[]>('/kyc/pending').then(setKyc))
    if (roleCan(admin.role, ['compliance', 'operations'])) requests.push(api<FraudFlag[]>('/admin/fraud-flags?status=open&limit=6').then(setFraud))
    Promise.allSettled(requests).finally(() => setLoading(false))
  }, [admin.role])

  if (loading) return <LoadingState />
  const completedRate = overview?.total_transactions ? Math.round((overview.completed_count / overview.total_transactions) * 100) : 0
  return <>
    <PageHeader eyebrow="Platform command centre" title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${(admin.fullName || 'admin').split(' ')[0]}.`} description="Here’s what needs attention across FastPay right now." action={<button className="button secondary" onClick={() => window.location.reload()}><RefreshCw size={17} /> Refresh data</button>} />
    <section className="metrics-grid">
      {overview && <><MetricCard label="Payment volume" value={money(overview.total_volume_zmw)} detail="Lifetime completed volume" icon={CircleDollarSign} /><MetricCard label="Platform revenue" value={money(overview.total_revenue_zmw)} detail="Fees from completed payments" icon={WalletCards} tone="teal" /><MetricCard label="Success rate" value={`${completedRate}%`} detail={`${overview.completed_count} completed payments`} icon={BadgeCheck} tone="green" /><MetricCard label="Last 24 hours" value={overview.last_24h_count} detail={`${overview.failed_count} failures overall`} icon={Activity} tone="orange" /></>}
      {!overview && <><MetricCard label="Pending KYC" value={kyc.length} detail="Identity reviews waiting" icon={FileCheck2} /><MetricCard label="Open risk flags" value={fraud.length} detail="Cases needing attention" icon={ShieldAlert} tone="orange" /><MetricCard label="Recent accounts" value={users.length} detail="Latest visible registrations" icon={Users} tone="teal" /></>}
    </section>
    <section className="dashboard-grid">
      <article className="panel attention-panel"><div className="panel-heading"><div><p className="eyebrow">Priority queue</p><h2>Requires attention</h2></div><span className="live-indicator"><i /> Live</span></div>
        <div className="attention-list">
          {roleCan(admin.role, ['compliance']) && <div className="attention-row"><span className="attention-icon blue"><FileCheck2 /></span><div><strong>KYC submissions</strong><p>{kyc.length ? `${kyc.length} customers are waiting for a decision.` : 'The identity review queue is clear.'}</p></div><b>{kyc.length}</b></div>}
          {roleCan(admin.role, ['compliance', 'operations']) && <div className="attention-row"><span className="attention-icon orange"><ShieldAlert /></span><div><strong>Risk investigations</strong><p>{fraud.length ? 'Open flags require evidence review.' : 'No open risk flags in the current queue.'}</p></div><b>{fraud.length}</b></div>}
          {overview && <div className="attention-row"><span className="attention-icon red"><AlertTriangle /></span><div><strong>Failed payments</strong><p>Monitor provider failures and customer impact.</p></div><b>{overview.failed_count}</b></div>}
          {!kyc.length && !fraud.length && !overview && <EmptyState />}
        </div>
      </article>
      <article className="panel health-panel"><div className="panel-heading"><div><p className="eyebrow">Service pulse</p><h2>Network health</h2></div></div><div className="health-score"><div className="score-ring"><strong>99.9%</strong><span>availability</span></div></div><div className="provider-list"><div><span className="provider-dot mtn" /><b>MTN Money</b><StatusPill value="active" /></div><div><span className="provider-dot airtel" /><b>Airtel Money</b><StatusPill value="active" /></div><div><span className="provider-dot zamtel" /><b>Zamtel Kwacha</b><StatusPill value="active" /></div></div><p className="data-note">Provider status is representative until live MNO health endpoints are connected.</p></article>
    </section>
    {users.length > 0 && <section className="panel table-panel"><div className="panel-heading"><div><p className="eyebrow">Latest registrations</p><h2>New platform accounts</h2></div></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Account</th><th>KYC</th><th>Status</th><th>Joined</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="person-cell"><span>{user.fullName.slice(0, 2).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>@{user.username}</small></div></div></td><td>{titleCase(user.accountType)}</td><td><StatusPill value={user.kycStatus} /></td><td><StatusPill value={user.status} /></td><td>{shortDate(user.createdAt)}</td></tr>)}</tbody></table></div></section>}
  </>
}

export function UsersPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [notice, setNotice] = useState('')
  const path = `/admin/users?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}${status ? `&status=${status}` : ''}`
  const { data, setData, loading, error, reload } = useRemote(() => api<User[]>(path), [query, status])

  const updateStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    const nextStatus = String(form.get('status'))
    await api<User>(`/admin/users/${selected.id}/status`, { method: 'PUT', body: JSON.stringify({ status: nextStatus, reason: form.get('reason') }) })
    setData((data || []).map((user) => user.id === selected.id ? { ...user, status: nextStatus } : user))
    setNotice(`${selected.fullName}'s account is now ${nextStatus}.`)
    setSelected(null)
  }

  return <><PageHeader eyebrow="Customer operations" title="Users & merchants" description="Find accounts, verify their standing and apply controlled access changes." />
    {notice && <div className="success-banner"><Check size={18} />{notice}<button onClick={() => setNotice('')}><X size={16} /></button></div>}
    <div className="toolbar"><SearchField value={query} onChange={setQuery} placeholder="Search username, email or phone" /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option><option value="pending_kyc">Pending KYC</option></select></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState title="No users found" message="Try a different search or status filter." /> : <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>User</th><th>Contact</th><th>Account</th><th>KYC</th><th>Status</th><th /></tr></thead><tbody>{data.map((user) => <tr key={user.id}><td><div className="person-cell"><span>{user.fullName.slice(0, 2).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>@{user.username}</small></div></div></td><td><div className="stack-cell"><span>{user.phoneNumber}</span><small>{user.email}</small></div></td><td>{titleCase(user.accountType)}</td><td><StatusPill value={user.kycStatus} /></td><td><StatusPill value={user.status} /></td><td><button className="row-action" onClick={() => setSelected(user)}>Manage <ChevronRight size={16} /></button></td></tr>)}</tbody></table></div></section>}
    {selected && <Modal title="Change account status" description={`This action affects ${selected.fullName} (@${selected.username}) immediately.`} onClose={() => setSelected(null)}><form className="modal-form" onSubmit={updateStatus}><label>New status<select name="status" defaultValue={selected.status}><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select></label><label>Reason<textarea name="reason" minLength={3} maxLength={500} placeholder="Explain why this status is appropriate" required /></label><div className="modal-warning"><AlertTriangle size={18} /><span>Suspended and banned users will immediately lose access to FastPay.</span></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setSelected(null)}>Cancel</button><button className="button primary">Confirm change</button></div></form></Modal>}
  </>
}

export function KycPage() {
  const [selected, setSelected] = useState<KycSubmission | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [busy, setBusy] = useState(false)
  const { data, setData, loading, error, reload } = useRemote(() => api<KycSubmission[]>('/kyc/pending'))
  useEffect(() => { if (!selected && data?.length) setSelected(data[0]) }, [data, selected])

  const decide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !action) return
    const note = String(new FormData(event.currentTarget).get('note') || '')
    setBusy(true)
    try {
      await api(`/kyc/${selected.id}/decision`, { method: 'PUT', body: JSON.stringify({ approved: action === 'approve', note: note || undefined }) })
      const remaining = (data || []).filter((item) => item.id !== selected.id)
      setData(remaining); setSelected(remaining[0] || null); setAction(null)
    } finally { setBusy(false) }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} retry={reload} />
  return <><PageHeader eyebrow="Compliance review" title="KYC verification" description="Review identity evidence carefully and record a clear decision." action={<span className="queue-count"><Clock3 size={17} /> {data?.length || 0} awaiting review</span>} />
    {!data?.length ? <EmptyState title="KYC queue is clear" message="New identity submissions will appear here for review." /> : <section className="review-layout"><aside className="review-queue"><h3>Review queue</h3>{data.map((item) => <button key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => setSelected(item)}><span>{item.fullLegalName.slice(0, 2).toUpperCase()}</span><div><strong>{item.fullLegalName}</strong><small>@{item.username || 'unknown'} · {shortDate(item.submittedAt)}</small></div><ChevronRight size={17} /></button>)}</aside>{selected && <article className="review-detail"><div className="review-title"><div><p className="eyebrow">Identity submission</p><h2>{selected.fullLegalName}</h2><span>@{selected.username || 'unknown'}</span></div><StatusPill value="pending" /></div><div className="identity-grid"><div><span>Date of birth</span><strong>{selected.dateOfBirth}</strong></div><div><span>Document type</span><strong>{titleCase(selected.idType)}</strong></div><div><span>Document number</span><strong>{selected.idNumber}</strong></div><div><span>Submitted</span><strong>{shortDate(selected.submittedAt)}</strong></div></div><div className="document-grid"><DocumentImage label="Identity document" value={selected.idDocumentPhoto} /><DocumentImage label="Live selfie" value={selected.selfiePhoto} /></div><div className="review-actions"><button className="button danger-outline" onClick={() => setAction('reject')}><X size={18} /> Reject submission</button><button className="button success" onClick={() => setAction('approve')}><Check size={18} /> Approve identity</button></div></article>}</section>}
    {action && selected && <Modal title={action === 'approve' ? 'Approve this identity?' : 'Reject this submission?'} description={action === 'approve' ? 'The customer’s account will receive verified KYC limits.' : 'The customer will be asked to correct and resubmit their documents.'} onClose={() => setAction(null)}><form className="modal-form" onSubmit={decide}><label>{action === 'approve' ? 'Reviewer note (optional)' : 'Rejection reason'}<textarea name="note" required={action === 'reject'} minLength={action === 'reject' ? 3 : undefined} maxLength={500} placeholder={action === 'approve' ? 'Add any useful compliance note' : 'Tell the customer exactly what must be corrected'} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setAction(null)}>Cancel</button><button disabled={busy} className={`button ${action === 'approve' ? 'success' : 'danger'}`}>{busy ? 'Saving decision…' : action === 'approve' ? 'Approve KYC' : 'Reject KYC'}</button></div></form></Modal>}
  </>
}

function DocumentImage({ label, value }: { label: string; value: string }) {
  const source = value.startsWith('data:') ? value : `data:image/jpeg;base64,${value}`
  return <figure><figcaption>{label}</figcaption><div><img src={source} alt={label} onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling?.classList.remove('hidden') }} /><span className="document-placeholder hidden"><FileCheck2 size={30} /> Preview unavailable</span></div></figure>
}

export function TransactionsPage() {
  const [status, setStatus] = useState('')
  const [userId, setUserId] = useState('')
  const [selected, setSelected] = useState<Transaction | null>(null)
  const path = `/admin/transactions?limit=100${status ? `&status=${status}` : ''}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`
  const { data, loading, error, reload } = useRemote(() => api<Transaction[]>(path), [status, userId])
  return <><PageHeader eyebrow="Payment operations" title="Transactions" description="Trace payment activity, provider references and failure context." />
    <div className="toolbar"><SearchField value={userId} onChange={setUserId} placeholder="Filter by exact user ID" /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="failed">Failed</option><option value="reversed">Reversed</option></select></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState title="No transactions found" /> : <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Direction</th><th>Network</th><th>Amount</th><th>Status</th><th>Initiated</th><th /></tr></thead><tbody>{data.map((txn) => <tr key={txn.id}><td><div className="stack-cell mono"><strong>{txn.id.slice(0, 8)}…</strong><small>{txn.mnoReference || txn.idempotencyKey}</small></div></td><td><div className="transaction-type"><span className={txn.type === 'reversal' ? 'out' : 'in'}>{txn.type === 'reversal' ? <ArrowDownRight /> : <ArrowUpRight />}</span>{titleCase(txn.type)}</div></td><td>{titleCase(txn.network)}</td><td><strong>{money(txn.amountZmw)}</strong><small className="fee-label">Fee {money(txn.feeZmw)}</small></td><td><StatusPill value={txn.status} /></td><td>{shortDate(txn.initiatedAt)}</td><td><button className="row-action" onClick={() => setSelected(txn)}>Inspect <ChevronRight size={16} /></button></td></tr>)}</tbody></table></div></section>}
    {selected && <Modal title="Transaction details" description={`Payment ${selected.id}`} onClose={() => setSelected(null)}><div className="detail-list"><div><span>Status</span><StatusPill value={selected.status} /></div><div><span>Amount</span><strong>{money(selected.amountZmw)}</strong></div><div><span>Fee</span><strong>{money(selected.feeZmw)}</strong></div><div><span>Sender ID</span><code>{selected.senderId}</code></div><div><span>Receiver ID</span><code>{selected.receiverId}</code></div><div><span>Network</span><strong>{titleCase(selected.network)}</strong></div><div><span>MNO reference</span><strong>{selected.mnoReference || 'Not assigned'}</strong></div>{selected.failureReason && <div className="failure-detail"><span>Failure reason</span><strong>{selected.failureReason}</strong></div>}</div></Modal>}
  </>
}

export function FraudPage() {
  const [status, setStatus] = useState('open')
  const [selected, setSelected] = useState<FraudFlag | null>(null)
  const { data, setData, loading, error, reload } = useRemote(() => api<FraudFlag[]>(`/admin/fraud-flags?limit=100${status ? `&status=${status}` : ''}`), [status])
  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return
    const form = new FormData(event.currentTarget); const next = String(form.get('status'))
    await api(`/admin/fraud-flags/${selected.id}/status`, { method: 'PUT', body: JSON.stringify({ status: next, note: form.get('note') }) })
    setData((data || []).filter((flag) => !status || next === status ? true : flag.id !== selected.id).map((flag) => flag.id === selected.id ? { ...flag, status: next } : flag)); setSelected(null)
  }
  return <><PageHeader eyebrow="Risk operations" title="Fraud & risk" description="Prioritise suspicious activity by risk score and document every outcome." action={<div className="risk-legend"><span className="high" /> High risk <span className="medium" /> Medium</div>} />
    <div className="toolbar compact"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All flags</option><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState title="No risk flags found" message="The selected investigation queue is clear." /> : <div className="risk-grid">{data.map((flag) => <article className="risk-card" key={flag.id}><div className="risk-card-top"><span className={`risk-score ${flag.riskScore >= 70 ? 'high' : 'medium'}`}><b>{flag.riskScore}</b><small>risk score</small></span><StatusPill value={flag.status} /></div><p className="eyebrow">Triggered rule</p><h3>{titleCase(flag.ruleTriggered)}</h3><div className="risk-meta"><span>User <code>{flag.userId.slice(0, 8)}…</code></span><span>Raised {shortDate(flag.createdAt)}</span></div><button className="button secondary full" onClick={() => setSelected(flag)}>Review case</button></article>)}</div>}
    {selected && <Modal title="Update risk investigation" description={titleCase(selected.ruleTriggered)} onClose={() => setSelected(null)}><div className="selected-risk"><span className={`risk-score ${selected.riskScore >= 70 ? 'high' : 'medium'}`}><b>{selected.riskScore}</b><small>risk</small></span><div><span>User ID</span><code>{selected.userId}</code>{selected.transactionId && <><span>Transaction ID</span><code>{selected.transactionId}</code></>}</div></div><form className="modal-form" onSubmit={update}><label>Investigation status<select name="status" defaultValue={selected.status}><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label><label>Case note<textarea name="note" required minLength={3} maxLength={500} placeholder="Record the evidence and reason for this decision" /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setSelected(null)}>Cancel</button><button className="button primary">Save outcome</button></div></form></Modal>}
  </>
}

export function FinancePage() {
  const { admin } = useAuth()
  const canLedger = roleCan(admin.role, ['finance'])
  const overview = useRemote(() => api<PlatformOverview>('/analytics/platform/overview'))
  const ledger = useRemote(() => canLedger ? api<{ accounts: Record<string, { debits: number; credits: number; balance: number }>; totalDebits: number; totalCredits: number; balanced: boolean }>('/ledger/trial-balance') : Promise.resolve({ accounts: {}, totalDebits: 0, totalCredits: 0, balanced: true }), [canLedger])
  if (overview.loading || ledger.loading) return <LoadingState />
  if (overview.error) return <ErrorState message={overview.error} retry={overview.reload} />
  const data = overview.data!
  const entries = Object.entries(ledger.data?.accounts || {})
  return <><PageHeader eyebrow="Financial control" title="Finance & ledger" description="Monitor platform earnings, completed volume and double-entry balances." />
    <section className="metrics-grid finance-metrics"><MetricCard label="Gross volume" value={money(data.total_volume_zmw)} detail="Completed transaction value" icon={Landmark} /><MetricCard label="Fee revenue" value={money(data.total_revenue_zmw)} detail="Platform earnings" icon={CircleDollarSign} tone="green" /><MetricCard label="Completed" value={data.completed_count} detail="Successful payments" icon={BadgeCheck} tone="teal" /><MetricCard label="Failed" value={data.failed_count} detail="Payments requiring monitoring" icon={AlertTriangle} tone="orange" /></section>
    <section className="panel ledger-panel"><div className="panel-heading"><div><p className="eyebrow">Double-entry control</p><h2>Trial balance</h2></div><span className={`balance-badge ${ledger.data?.balanced ? 'balanced' : ''}`}><ShieldCheck size={17} /> {entries.length ? ledger.data?.balanced ? 'Ledger balanced' : 'Imbalance detected' : canLedger ? 'No ledger entries' : 'Finance role required'}</span></div>{canLedger ? entries.length ? <><div className="ledger-totals"><span>Total debits <strong>{money(ledger.data?.totalDebits)}</strong></span><span>Total credits <strong>{money(ledger.data?.totalCredits)}</strong></span></div><div className="ledger-list">{entries.map(([account, value]) => <div key={account}><span>{titleCase(account)}</span><strong>{money(value.balance)}</strong></div>)}</div></> : <EmptyState title="No ledger balances yet" /> : <div className="restricted-panel"><ShieldCheck size={28} /><h3>Finance permission required</h3><p>Your operations role can monitor performance but cannot inspect accounting balances.</p></div>}</section>
  </>
}

export function AccessPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const { data, setData, loading, error, reload } = useRemote(() => api<AdminUser[]>('/admin/admins'))
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const created = await api<AdminUser>('/admin/admins', { method: 'POST', body: JSON.stringify({ email: form.get('email'), fullName: form.get('fullName'), password: form.get('password'), role: form.get('role') }) })
    setData([...(data || []), created]); setCreateOpen(false)
  }
  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected?.id) return; const form = new FormData(event.currentTarget)
    const updated = await api<AdminUser>(`/admin/admins/${selected.id}`, { method: 'PUT', body: JSON.stringify({ role: form.get('role'), status: form.get('status') }) })
    setData((data || []).map((admin) => admin.id === updated.id ? updated : admin)); setSelected(null)
  }
  return <><PageHeader eyebrow="Privileged access" title="Administrator access" description="Provision staff with the minimum permissions required for their work." action={<button className="button primary" onClick={() => setCreateOpen(true)}><UserCheck size={18} /> Add administrator</button>} />
    <div className="access-callout"><ShieldCheck size={22} /><div><strong>Least privilege is active</strong><p>Role changes and account disabling invalidate that administrator’s current sessions immediately.</p></div></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={reload} /> : <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Administrator</th><th>Role</th><th>Status</th><th>Last sign in</th><th>Created</th><th /></tr></thead><tbody>{data?.map((admin) => <tr key={admin.id}><td><div className="person-cell admin-avatar"><span>{(admin.fullName || admin.email).slice(0, 2).toUpperCase()}</span><div><strong>{admin.fullName}</strong><small>{admin.email}</small></div></div></td><td><span className="role-pill">{titleCase(admin.role)}</span></td><td><StatusPill value={admin.status} /></td><td>{shortDate(admin.lastLoginAt)}</td><td>{shortDate(admin.createdAt)}</td><td><button className="row-action" onClick={() => setSelected(admin)}>Manage <ChevronRight size={16} /></button></td></tr>)}</tbody></table></div></section>}
    {createOpen && <Modal title="Add an administrator" description="Create a staff identity with tightly scoped access." onClose={() => setCreateOpen(false)}><form className="modal-form" onSubmit={create}><label>Full name<input name="fullName" minLength={2} maxLength={150} required /></label><label>Work email<input name="email" type="email" required /></label><label>Temporary password<input name="password" type="password" minLength={12} maxLength={128} required /></label><label>Role<RoleSelect /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setCreateOpen(false)}>Cancel</button><button className="button primary">Create administrator</button></div></form></Modal>}
    {selected && <Modal title="Manage administrator" description={`${selected.fullName} · ${selected.email}`} onClose={() => setSelected(null)}><form className="modal-form" onSubmit={update}><label>Role<RoleSelect value={selected.role} /></label><label>Account status<select name="status" defaultValue={selected.status}><option value="active">Active</option><option value="disabled">Disabled</option></select></label><div className="modal-warning"><AlertTriangle size={18} /><span>Any change will sign this administrator out of all current sessions.</span></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setSelected(null)}>Cancel</button><button className="button primary">Save changes</button></div></form></Modal>}
  </>
}

function RoleSelect({ value = 'support' }: { value?: AdminRole }) {
  return <select name="role" defaultValue={value}><option value="support">Support</option><option value="compliance">Compliance</option><option value="finance">Finance</option><option value="operations">Operations</option><option value="super_admin">Super admin</option></select>
}

export function AuditPage() {
  const [query, setQuery] = useState('')
  const { data, loading, error, reload } = useRemote(() => api<AuditLog[]>('/admin/audit-logs?limit=250'))
  const filtered = useMemo(() => (data || []).filter((log) => !query || `${log.adminEmail} ${log.action} ${log.targetId}`.toLowerCase().includes(query.toLowerCase())), [data, query])
  return <><PageHeader eyebrow="Governance & control" title="Audit trail" description="A tamper-resistant view of privileged activity across the platform." />
    <div className="toolbar"><SearchField value={query} onChange={setQuery} placeholder="Search actor, action or target" /></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={reload} /> : !filtered.length ? <EmptyState title="No audit events found" /> : <section className="audit-timeline">{filtered.map((log) => <article key={log.id}><span className="timeline-icon"><FileCheck2 size={17} /></span><div className="audit-card"><div><strong>{titleCase(log.action.replace('.', ' '))}</strong><StatusPill value="completed" /></div><p><b>{log.adminEmail}</b> acted on {titleCase(log.targetType)} {log.targetId && <code>{log.targetId.slice(0, 12)}…</code>}</p>{log.details && <pre>{JSON.stringify(log.details, null, 2)}</pre>}<footer><Clock3 size={14} /> {shortDate(log.createdAt)} {log.ipAddress && <>· IP {log.ipAddress}</>}</footer></div></article>)}</section>}
  </>
}
