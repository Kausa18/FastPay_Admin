import { PageStats } from './page-stats'
import { useState } from 'react'
import { useTableState } from '../hooks/use-table-state'
import { Pagination, SortHeader, type PageResult } from '../ui/table'
import { readableLabel, readableValue } from './audit-format'
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import { api, money, shortDate, titleCase } from '../api'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  SearchField,
  StatusPill,
  useRemote,
} from '../components'
import type { Transaction } from '../types'

export function TransactionsPage() {
  const table = useTableState({
    sort: 'date',
    direction: 'desc',
    status: '',
    user_id: '',
    network: '',
    period: '',
  })
  const status = table.get('status'),
    userId = table.get('user_id')
  const setStatus = (status: string) => table.set({ status })
  const setUserId = (user_id: string) => table.set({ user_id })
  const [selected, setSelected] = useState<Transaction | null>(null)
  const path = `/admin/transactions?${table.paging}${table.get('period') ? `&period=${table.get('period')}` : ''}${table.get('network') ? `&network=${table.get('network')}` : ''}${status ? `&status=${status}` : ''}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`
  const { data, loading, error, reload } = useRemote(() => api<PageResult<Transaction>>(path), path)
  return (
    <>
      <PageHeader
        eyebrow="Payment operations"
        title="Transactions"
        description="Trace payment activity, provider references and failure context."
      />
      {!loading && !error && data && (
        <PageStats
          scope="All transactions matching the current filters"
          items={[
            { label: 'Payments', value: data.total, hint: 'Matching the selected filters' },
            {
              label: 'Completed value',
              value: money(data.stats.completedValue),
              hint: 'Successful payments in this view',
              tone: 'teal',
            },
            {
              label: 'In progress',
              value: data.stats.inProgress,
              hint: 'Pending or processing',
              tone: 'orange',
            },
            {
              label: 'Failed',
              value: data.stats.failed,
              hint: 'Payments needing investigation',
              tone: 'red',
            },
          ]}
        />
      )}

      <div className="toolbar">
        <SearchField value={userId} onChange={setUserId} placeholder="Filter by exact user ID" />
        <select
          aria-label="Transaction status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="reversed">Reversed</option>
        </select>
        <select
          aria-label="Payment network"
          value={table.get('network')}
          onChange={(e) => table.set({ network: e.target.value })}
        >
          <option value="">All networks</option>
          {['mtn', 'airtel', 'zamtel', 'bank', 'wallet'].map((n) => (
            <option key={n} value={n}>
              {titleCase(n)}
            </option>
          ))}
        </select>
        <select
          aria-label="Payment period"
          value={table.get('period')}
          onChange={(e) => table.set({ period: e.target.value })}
        >
          <option value="">All time</option>
          <option value="day">Last 24 UTC hours</option>
          <option value="week">Last 7 UTC days</option>
          <option value="month">Last 30 UTC days</option>
          <option value="year">Last 12 UTC months</option>
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
        <EmptyState title="No transactions found" />
      ) : (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Direction</th>
                  <SortHeader label="Network" column="network" state={table} />
                  <SortHeader label="Amount" column="amount" state={table} numeric />
                  <SortHeader label="Status" column="status" state={table} />
                  <SortHeader label="Initiated" column="date" state={table} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((txn) => (
                  <tr key={txn.id}>
                    <td>
                      <div className="stack-cell mono">
                        <strong>{txn.id.slice(0, 8)}...</strong>
                        <small>{txn.reference || txn.mnoReference || txn.idempotencyKey}</small>
                      </div>
                    </td>
                    <td>
                      <div className="transaction-type">
                        <span className={txn.type === 'reversal' ? 'out' : 'in'}>
                          {txn.type === 'reversal' ? <ArrowDownRight /> : <ArrowUpRight />}
                        </span>
                        {titleCase(txn.type)}
                      </div>
                    </td>
                    <td>{titleCase(txn.network)}</td>
                    <td className="numeric">
                      <strong>{money(txn.amountZmw)}</strong>
                      <small className="fee-label">Fee {money(txn.feeZmw)}</small>
                    </td>
                    <td>
                      <StatusPill value={txn.status} />
                    </td>
                    <td>{shortDate(txn.initiatedAt)}</td>
                    <td>
                      <button className="row-action" onClick={() => setSelected(txn)}>
                        Inspect <ChevronRight size={16} />
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
      {selected && (
        <Modal
          variant="drawer"
          title="Transaction details"
          description={`Payment ${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <div className="detail-list">
            <div>
              <span>Status</span>
              <StatusPill value={selected.status} />
            </div>
            <div>
              <span>Amount</span>
              <strong>{money(selected.amountZmw)}</strong>
            </div>
            <div>
              <span>Fee</span>
              <strong>{money(selected.feeZmw)}</strong>
            </div>
            <div>
              <span>Net amount</span>
              <strong>{money(selected.netAmountZmw)}</strong>
            </div>
            <div>
              <span>Sender ID</span>
              <code>{selected.senderId}</code>
            </div>
            <div>
              <span>Receiver ID</span>
              <code>{selected.receiverId}</code>
            </div>
            <div>
              <span>Sender account ID</span>
              <code>{selected.senderAccountId || 'Not assigned'}</code>
            </div>
            <div>
              <span>Receiver account ID</span>
              <code>{selected.receiverAccountId || 'Not assigned'}</code>
            </div>
            <div>
              <span>Network</span>
              <strong>{titleCase(selected.network)}</strong>
            </div>
            <div>
              <span>BrinkPay reference</span>
              <strong>{selected.reference || 'Not assigned'}</strong>
            </div>
            <div>
              <span>MNO reference</span>
              <strong>{selected.mnoReference || 'Not assigned'}</strong>
            </div>
            <div>
              <span>Idempotency key</span>
              <code>{selected.idempotencyKey}</code>
            </div>
            <div>
              <span>Provider status</span>
              <strong>{selected.providerStatus || 'Not reported'}</strong>
            </div>
            <div>
              <span>Initiated</span>
              <strong>{shortDate(selected.initiatedAt)}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{shortDate(selected.completedAt)}</strong>
            </div>
            <div>
              <span>Provider callback</span>
              <strong>{shortDate(selected.callbackReceivedAt)}</strong>
            </div>
            <div>
              <span>Last updated</span>
              <strong>{shortDate(selected.updatedAt)}</strong>
            </div>
            {selected.externalRecipient && (
              <div>
                <span>External recipient</span>
                <dl className="audit-facts">
                  {Object.entries(selected.externalRecipient).map(([key, value]) => (
                    <div key={key}>
                      <dt>{readableLabel(key)}</dt>
                      <dd>{readableValue(key, value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {selected.failureReason && (
              <div className="failure-detail">
                <span>Failure reason</span>
                <strong>{selected.failureReason}</strong>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
