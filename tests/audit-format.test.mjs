import test from 'node:test'
import assert from 'node:assert/strict'
import { presentAudit, readableValue, readableLabel } from '../src/pages/audit-format.ts'

const event = (action, details) => ({ id: 'event-1', adminEmail: 'admin@example.com', actorType: 'administrator', action, details, createdAt: '2026-09-07T10:00:00Z' })

test('account and risk status changes retain reasons and readable before/after values', () => {
  const account = presentAudit(event('user.status_changed', { from: 'active', to: 'suspended', reason: 'Identity does not match' }))
  assert.equal(account.changes[0].label, 'Account status')
  assert.equal(readableValue(account.changes[0].key, account.changes[0].after), 'Suspended')
  assert.equal(account.fields[0].value, 'Identity does not match')
  assert.equal(presentAudit(event('fraud_flag.status_changed', { from: 'open', to: 'resolved' })).changes[0].label, 'Case status')
})

test('legacy team permission changes are presented as before and after', () => {
  const result = presentAudit(event('admin.updated', { role: 'support->super_admin', status: 'active->disabled' }))
  assert.equal(result.changes.length, 2)
  assert.equal(readableValue('role', result.changes[0].after), 'Super administrator')
  assert.equal(result.changes[1].before, 'active')
  assert.equal(result.fields.length, 0)
})

test('rejected identity reviews never appear as approvals', () => {
  const result = presentAudit(event('kyc.decision', { approved: false, note: 'Please upload a clearer document' }))
  assert.equal(result.title, 'Identity rejected')
  assert.equal(readableValue('approved', false), 'Rejected')
  assert.equal(result.fields.find(f => f.key === 'note').value, 'Please upload a clearer document')
})

test('linked accounts remain masked and same-ending changes are explained', () => {
  const result = presentAudit(event('account.linked_account_updated', { network: 'mtn', changes: { accountNumberLast4: { from: '0012', to: '0012', changed: true } } }))
  assert.equal(readableValue(result.changes[0].key, result.changes[0].before), 'Ending in 0012')
  assert.equal(result.changes[0].note, 'Number changed; ending unchanged')
  assert.equal(readableValue('network', 'mtn'), 'MTN MoMo')
})

test('unknown events retain nested details and user-entered text', () => {
  const details = { providerContext: { attemptCount: 0, retryAllowed: false, reasons: ['try_again', 'manual check'] } }
  const result = presentAudit(event('provider.retry_requested', details))
  assert.equal(result.title, 'Provider Retry Requested')
  assert.equal(result.fields[0].label, 'Provider Context')
  assert.deepEqual(result.fields[0].value, details.providerContext)
  assert.equal(readableValue('reason', 'try_again'), 'try_again')
  assert.equal(readableValue('attemptCount', 0), '0')
  assert.equal(readableValue('retryAllowed', false), 'No')
})

test('read filters, absent values, and dates are readable without inventing information', () => {
  assert.equal(readableValue('status', null), 'All statuses')
  assert.equal(readableValue('query', ''), 'No search filter')
  assert.equal(readableValue('note', null), 'Not set')
  assert.equal(readableLabel('pendingKyc'), 'Pending identity reviews')
  assert.equal(readableValue('dateOfBirth', '2000-01-02'), '2 Jan 2000')
  assert.equal(readableValue('action', 'users.read'), 'Accounts viewed')
})
