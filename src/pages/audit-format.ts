import type { AuditLog } from '../types'

export const auditActions: Record<string, { title: string; summary: string }> = {
  'user_details.read': {title: 'Account details viewed', summary: 'Viewed an account profile, linked accounts and recent payments.'},
  'platform_trends.read': {title: 'Payment trends viewed', summary: 'Viewed daily payment activity for the selected period.'},
  'account.profile_updated': { title: 'Profile updated', summary: 'Changed the account profile.' },
  'account.linked_account_added': {
    title: 'Payment account linked',
    summary: 'Added a payment account.',
  },
  'account.linked_account_updated': {
    title: 'Payment account updated',
    summary: 'Changed a linked payment account.',
  },
  'account.payout_method_changed': {
    title: 'Payout account changed',
    summary: 'Selected a different account for receiving payouts.',
  },
  'account.pin_changed': {
    title: 'PIN changed',
    summary: 'Updated the security PIN. PIN values are never recorded.',
  },
  'account.kyc_submitted': {
    title: 'Identity submitted',
    summary: 'Submitted identity information for review.',
  },
  'user.status_changed': {
    title: 'Account status changed',
    summary: 'Changed a user’s access to BrinkPay.',
  },
  'fraud_flag.status_changed': {
    title: 'Risk case updated',
    summary: 'Updated the investigation status of a risk case.',
  },
  'kyc.decision': {
    title: 'Identity review completed',
    summary: 'Recorded an identity verification decision.',
  },
  'admin.created': {
    title: 'Administrator added',
    summary: 'Created a team member’s administrator account.',
  },
  'admin.updated': {
    title: 'Team access changed',
    summary: 'Updated an administrator’s permissions or access.',
  },
  'admin.login': { title: 'Administrator signed in', summary: 'Signed in to the admin workspace.' },
  'admin.logout': {
    title: 'Administrator signed out',
    summary: 'Signed out of the admin workspace.',
  },
  'admin.password_changed': {
    title: 'Password changed',
    summary: 'Updated the administrator password. Password values are never recorded.',
  },
  'admin.page_viewed': { title: 'Page opened', summary: 'Opened a page in the admin workspace.' },
  'admin_identity.read': {
    title: 'Admin session checked',
    summary: 'The system checked the signed-in administrator’s identity.',
  },
  'users.read': { title: 'Accounts viewed', summary: 'Viewed the accounts list.' },
  'transactions.read': { title: 'Transactions viewed', summary: 'Viewed payment records.' },
  'fraud_flags.read': {
    title: 'Risk cases viewed',
    summary: 'Viewed the risk investigation queue.',
  },
  'admins.read': { title: 'Team members viewed', summary: 'Viewed administrator accounts.' },
  'audit_logs.read': {
    title: 'Activity log viewed',
    summary: 'Viewed recorded platform activity.',
  },
  'kyc_pending.read': {
    title: 'Identity queue viewed',
    summary: 'Viewed submissions awaiting identity review.',
  },
  'dashboard_counts.read': {
    title: 'Dashboard totals refreshed',
    summary: 'The system loaded the latest dashboard totals.',
  },
  'dashboard_stream.opened': {
    title: 'Dashboard updates connected',
    summary: 'Started receiving automatic dashboard updates.',
  },
  'platform_overview.read': {
    title: 'Platform performance viewed',
    summary: 'Viewed platform payment totals and earnings.',
  },
  'platform_networks.read': {
    title: 'Provider performance viewed',
    summary: 'Viewed payment provider performance.',
  },
  'trial_balance.read': {
    title: 'Trial balance viewed',
    summary: 'Viewed the ledger’s debit and credit balances.',
  },
}

const labels: Record<string, string> = {
  fullName: 'Name',
  fullLegalName: 'Legal name',
  username: 'Username',
  profilePhoto: 'Profile photo',
  accountName: 'Account name',
  accountNumberLast4: 'Account number',
  idNumberLast4: 'Identity document number',
  isPrimary: 'Primary account',
  isVerified: 'Verified account',
  approved: 'Decision',
  role: 'Role',
  status: 'Status',
  reason: 'Reason',
  note: 'Review note',
  query: 'Search text',
  q: 'Search text',
  action: 'Event type',
  actorType: 'Activity source',
  resultCount: 'Records viewed',
  limit: 'Maximum records requested',
  offset: 'Records skipped',
  pageName: 'Page',
  network: 'Payment network',
  networkCount: 'Providers viewed',
  totalUsers: 'Registered accounts',
  pendingKyc: 'Pending identity reviews',
  openFraudFlags: 'Open risk cases',
  linkedAccountId: 'Payment account reference',
  userId: 'User reference',
  submissionId: 'Submission reference',
  dateOfBirth: 'Date of birth',
  idType: 'Identity document type',
  documentPhotoChanged: 'Identity document photo updated',
  selfiePhotoChanged: 'Selfie updated',
  actorUsername: 'Username',
  changed: 'Updated',
  changes: 'Changes',
}
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
export const readableLabel = (key: string) =>
  labels[key] ||
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const enums: Record<string, string> = {
  mtn: 'MTN MoMo',
  airtel: 'Airtel Money',
  zamtel: 'Zamtel Kwacha',
  bank: 'Bank',
  nrc: 'National registration card',
  passport: 'Passport',
  drivers_license: 'Driver’s licence',
  pending_kyc: 'Awaiting identity verification',
  super_admin: 'Super administrator',
  user: 'App user',
  administrator: 'Administrator',
  present: 'Provided',
  absent: 'Not provided',
}
const enumFields = new Set(['role', 'status', 'network', 'idType', 'actorType', 'profilePhoto'])
export function readableValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    if (key === 'status') return 'All statuses'
    if (key === 'action') return 'All event types'
    if (key === 'actorType') return 'All activity'
    if (key === 'query' || key === 'q') return 'No search filter'
    return 'Not set'
  }
  if (typeof value === 'boolean')
    return key === 'approved' ? (value ? 'Approved' : 'Rejected') : value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString('en-ZM')
  if (typeof value !== 'string') return 'See details below'
  if (value.startsWith('data:image/')) return 'Image provided'
  if (key.endsWith('Last4')) return `Ending in ${value}`
  if (key === 'action') return auditActions[value]?.title || readableLabel(value)
  if (key === 'dateOfBirth' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`)
    if (!Number.isNaN(date.getTime()))
      return new Intl.DateTimeFormat('en-ZM', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
  }
  return enumFields.has(key) ? enums[value] || readableLabel(value) : value
}

export type AuditField = { key: string; label: string; value: unknown }
export type AuditChange = {
  key: string
  label: string
  before: unknown
  after: unknown
  note?: string
}
export function presentAudit(log: AuditLog) {
  const details = log.details || {}
  const changes: AuditChange[] = []
  const fields: AuditField[] = []
  const collect = (values: Record<string, unknown>, prefix = '') => {
    for (const [key, value] of Object.entries(values)) {
      if (key === 'actorUsername') continue
      if (key === 'changed' && log.action === 'account.pin_changed') continue
      if (key === 'changes' && isRecord(value)) {
        collect(value, prefix)
        continue
      }
      if (
        log.action === 'admin.updated' &&
        ['role', 'status'].includes(key) &&
        typeof value === 'string' &&
        /^[a-z_]+->[a-z_]+$/.test(value)
      ) {
        const [before, after] = value.split('->')
        changes.push({ key, label: readableLabel(key), before, after })
      } else if (isRecord(value) && ('from' in value || 'to' in value)) {
        changes.push({
          key,
          label: prefix + readableLabel(key),
          before: value.from,
          after: value.to,
          note:
            key === 'accountNumberLast4' && value.changed === true && value.from === value.to
              ? 'Number changed; ending unchanged'
              : undefined,
        })
      } else {
        fields.push({ key, label: prefix + readableLabel(key), value })
      }
    }
  }
  if ('from' in details || 'to' in details) {
    const key = log.action === 'account.payout_method_changed' ? 'payoutAccount' : 'status'
    changes.push({
      key,
      label:
        key === 'payoutAccount'
          ? 'Payout account'
          : log.action === 'fraud_flag.status_changed'
            ? 'Case status'
            : 'Account status',
      before: details.from,
      after: details.to,
    })
    const rest = Object.fromEntries(
      Object.entries(details).filter(([key]) => key !== 'from' && key !== 'to'),
    )
    collect(rest)
  } else collect(details)
  const action = auditActions[log.action]
  return {
    title:
      log.action === 'kyc.decision' && typeof details.approved === 'boolean'
        ? `Identity ${details.approved ? 'approved' : 'rejected'}`
        : action?.title || readableLabel(log.action),
    summary: action?.summary || 'Recorded the following activity.',
    changes,
    fields,
  }
}
