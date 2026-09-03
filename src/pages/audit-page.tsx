import { useMemo, useState } from 'react'
import { Clock3, FileCheck2 } from 'lucide-react'
import { api, shortDate, titleCase } from '../api'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchField,
  StatusPill,
  useRemote,
} from '../components'
import type { AuditLog } from '../types'

export function AuditPage() {
  const [query, setQuery] = useState('')
  const { data, loading, error, reload } = useRemote(() =>
    api<AuditLog[]>('/admin/audit-logs?limit=250'),
  )
  const filtered = useMemo(
    () =>
      (data || []).filter(
        (log) =>
          !query ||
          `${log.adminEmail} ${log.action} ${log.targetId}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data, query],
  )
  return (
    <>
      <PageHeader
        eyebrow="Governance & control"
        title="Audit trail"
        description="A tamper-resistant view of privileged activity across the platform."
      />
      <div className="toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search actor, action or target"
        />
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : !filtered.length ? (
        <EmptyState title="No audit events found" />
      ) : (
        <section className="audit-timeline">
          {filtered.map((log) => (
            <article key={log.id}>
              <span className="timeline-icon">
                <FileCheck2 size={17} />
              </span>
              <div className="audit-card">
                <div>
                  <strong>{titleCase(log.action.replace('.', ' '))}</strong>
                  <StatusPill value="completed" />
                </div>
                <p>
                  <b>
                    {log.actorType === 'user'
                      ? log.adminEmail.replace(/^user:/, '')
                      : log.adminEmail}
                  </b>{' '}
                  ({log.actorType}) acted on {titleCase(log.targetType)}{' '}
                  {log.targetId && <code>{log.targetId.slice(0, 12)}...</code>}
                </p>
                {log.details && <pre>{JSON.stringify(log.details, null, 2)}</pre>}
                <footer>
                  <Clock3 size={14} /> {shortDate(log.createdAt)}{' '}
                  {log.ipAddress && <>- IP {log.ipAddress}</>}
                </footer>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
