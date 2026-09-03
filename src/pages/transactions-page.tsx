import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatusState] = useState(searchParams.get('status') || '')
  const setStatus = (value: string) => {
    setStatusState(value)
    setSearchParams(value ? { status: value } : {})
  }
  const [userId, setUserId] = useState('')
  const [selected, setSelected] = useState<Transaction | null>(null)
  const path = `/admin/transactions?limit=100${status ? `&status=${status}` : ''}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`
  const { data, loading, error, reload } = useRemote(() => api<Transaction[]>(path), path)
  return (
    <>
      <PageHeader
        eyebrow="Payment operations"
        title="Transactions"
        description="Trace payment activity, provider references and failure context."
      />
      <div className="toolbar">
        <SearchField value={userId} onChange={setUserId} placeholder="Filter by exact user ID" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : !data?.length ? (
        <EmptyState title="No transactions found" />
      ) : (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Direction</th>
                  <th>Network</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Initiated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((txn) => (
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
                    <td>
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
      {selected && (
        <Modal
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
              <span>FastPay reference</span>
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
                <code>{JSON.stringify(selected.externalRecipient)}</code>
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
