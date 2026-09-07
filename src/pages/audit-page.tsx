import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Clock3, RefreshCw, UserRound, ShieldCheck } from 'lucide-react'
import { api, shortDate } from '../api'
import { auditActions, isRecord, presentAudit, readableLabel, readableValue } from './audit-format'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchField,
  useRemote,
} from '../components'
import type { AuditLog } from '../types'
import { PageStats } from './page-stats'

type AuditPageData = {
  items: AuditLog[]
  total: number
  userEvents: number
  profileChanges: number
  accountChanges: number
}
function AuditValue({ field, value }: { field: string; value: unknown }) {
  if (Array.isArray(value)) {
    return value.length ? (
      <ul className="audit-value-list">
        {value.map((item, index) => (
          <li key={index}>
            <AuditValue field={field} value={item} />
          </li>
        ))}
      </ul>
    ) : (
      <span>None recorded</span>
    )
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
    return entries.length ? (
      <dl className="audit-facts nested">
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt>{readableLabel(key)}</dt>
            <dd>
              <AuditValue field={key} value={item} />
            </dd>
          </div>
        ))}
      </dl>
    ) : (
      <span>No additional details</span>
    )
  }
  return <span>{readableValue(field, value)}</span>
}

function Changes({ log }: { log: AuditLog }) {
  const event = presentAudit(log)
  return (
    <>
      <p className="audit-summary">{event.summary}</p>
      {event.changes.length > 0 && (
        <dl className="audit-changes">
          {event.changes.map((change, index) => (
            <div key={`${change.key}-${index}`}>
              <dt>{change.label}</dt>
              <dd>
                <span className="change-before">
                  <small className="change-caption">Before</small>
                  <AuditValue field={change.key} value={change.before} />
                </span>
                <ArrowRight size={14} aria-hidden="true" />
                <span className="change-after">
                  <small className="change-caption">After</small>
                  <AuditValue field={change.key} value={change.after} />
                </span>
                {change.note && <small>{change.note}</small>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {event.fields.length > 0 && (
        <dl className="audit-facts">
          {event.fields.map((item, index) => (
            <div key={`${item.key}-${index}`}>
              <dt>{item.label}</dt>
              <dd>
                <AuditValue field={item.key} value={item.value} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      <details className="audit-metadata">
        <summary>Reference information</summary>
        <dl className="audit-facts">
          <div>
            <dt>Event reference</dt>
            <dd>{log.id}</dd>
          </div>
          {log.targetType && (
            <div>
              <dt>Related to</dt>
              <dd>{readableLabel(log.targetType)}</dd>
            </div>
          )}
          {log.targetId && (
            <div>
              <dt>Target reference</dt>
              <dd>{log.targetId}</dd>
            </div>
          )}
          {log.ipAddress && (
            <div>
              <dt>IP address</dt>
              <dd>{log.ipAddress}</dd>
            </div>
          )}
        </dl>
      </details>
    </>
  )
}

export function AuditPage() {
  const [params, setParams] = useSearchParams()
  const target = params.get('user') || ''
  const [actor, setActor] = useState('user')
  const [action, setAction] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  useEffect(() => setOffset(0), [target])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query)
      setOffset(0)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])
  const path = `/admin/audit-logs?paginated=true&limit=50&offset=${offset}&q=${encodeURIComponent(search)}${actor ? `&actor_type=${actor}` : ''}${action ? `&action=${action}` : ''}${target ? `&target_id=${encodeURIComponent(target)}` : ''}`
  const { data, loading, error, reload, refresh } = useRemote(() => api<AuditPageData>(path), path)
  useEffect(() => {
    const update = () => {
      if (!document.hidden && offset === 0) void refresh()
    }
    const timer = window.setInterval(update, 15000)
    window.addEventListener('focus', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
    }
  }, [refresh, offset])
  return (
    <>
      <PageHeader
        title="Activity log"
        description="Follow user account changes and administrator actions, with a record of what changed."
        action={
          <button className="button secondary" disabled={loading} onClick={reload}>
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />
      {!loading && !error && data && (
        <PageStats
          scope="All events matching your filters"
          items={[
            { label: 'Events', value: data.total, hint: 'Across the full audit history' },
            {
              label: 'User activity',
              value: data.userEvents,
              hint: 'Actions made in the app',
              tone: 'teal',
            },
            {
              label: 'Profile changes',
              value: data.profileChanges,
              hint: 'Names, usernames and photos',
            },
            {
              label: 'Payment accounts',
              value: data.accountChanges,
              hint: 'Linked accounts and payouts',
            },
          ]}
        />
      )}
      <div className="audit-controls panel">
        <div className="segmented-tabs" role="group" aria-label="Activity source">
          {[
            ['user', 'User activity'],
            ['administrator', 'Administrator activity'],
            ['', 'All activity'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={actor === value}
              className={actor === value ? 'active' : ''}
              onClick={() => {
                setActor(value)
                setAction('')
                setOffset(0)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search name, email, account ID or changed value"
          />
          <select
            aria-label="Event type"
            value={action}
            onChange={(event) => {
              setAction(event.target.value)
              setOffset(0)
            }}
          >
            <option value="">All event types</option>
            {Object.entries(auditActions)
              .filter(([value]) => !actor || (actor === 'user') === value.startsWith('account.'))
              .map(([value, event]) => (
                <option key={value} value={value}>
                  {event.title}
                </option>
              ))}
          </select>
        </div>
        {target && (
          <button className="row-action" onClick={() => setParams({})}>
            Show all accounts
          </button>
        )}
        <p className="stats-scope">
          {target ? `Account: ${target} · ` : ''}
          {offset === 0
            ? 'Refreshes every 15 seconds while this page is visible.'
            : 'Viewing older events. Return to the first page for automatic updates.'}
        </p>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          title="No activity matches these filters"
          message="Try another event type or search. Only changes recorded by the backend appear here."
        />
      ) : (
        <section className="activity-list" aria-label="Recorded activity">
          {data.items.map((log) => (
            <article className="activity-item" key={log.id}>
              <span className={`activity-icon ${log.actorType}`}>
                {log.actorType === 'user' ? <UserRound size={18} /> : <ShieldCheck size={18} />}
              </span>
              <div className="activity-body">
                <div className="activity-heading">
                  <h2>{presentAudit(log).title}</h2>
                  <time dateTime={log.createdAt}>
                    <Clock3 size={13} />
                    {shortDate(log.createdAt)}
                  </time>
                </div>
                <p className="activity-actor">
                  <strong>
                    {log.actorUsername
                      ? `@${log.actorUsername}`
                      : log.adminEmail.replace(/^user:/, '')}
                  </strong>
                  <span>{log.actorType === 'user' ? 'App user' : 'Administrator'}</span>
                </p>
                <Changes log={log} />
              </div>
            </article>
          ))}
        </section>
      )}
      {!loading && !error && data && (
        <div className="pagination">
          <span>
            {data.total
              ? `${offset + 1}–${Math.min(offset + data.items.length, data.total)} of ${data.total} events`
              : '0 events'}
          </span>
          <button
            className="button secondary"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 50))}
          >
            Previous
          </button>
          <button
            className="button secondary"
            disabled={offset + 50 >= data.total}
            onClick={() => setOffset(offset + 50)}
          >
            Next
          </button>
        </div>
      )}
    </>
  )
}
