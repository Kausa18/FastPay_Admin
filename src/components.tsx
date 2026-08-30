import type { ReactNode } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Search, X } from 'lucide-react'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  )
}

const positiveStatuses = new Set(['active', 'approved', 'completed', 'resolved'])
const warningStatuses = new Set(['pending', 'pending_kyc', 'processing', 'reviewing', 'open'])
const negativeStatuses = new Set(['failed', 'rejected', 'suspended', 'banned', 'disabled'])

export function StatusPill({ value }: { value?: string }) {
  const status = value || 'unknown'
  const kind = positiveStatuses.has(status)
    ? 'positive'
    : warningStatuses.has(status)
      ? 'warning'
      : negativeStatuses.has(status)
        ? 'negative'
        : 'neutral'
  return (
    <span className={`status-pill ${kind}`}>
      <span />
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="search-field">
      <Search size={18} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function LoadingState() {
  return (
    <div className="state-panel">
      <span className="spinner" />
      <strong>Loading workspace</strong>
      <p>Fetching the latest platform data.</p>
    </div>
  )
}

export function EmptyState({
  title = 'Nothing to review',
  message = 'There are no records matching this view.',
}: {
  title?: string
  message?: string
}) {
  return (
    <div className="state-panel">
      <CheckCircle2 size={28} />
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-panel error">
      <AlertCircle size={28} />
      <strong>We couldn’t load this view</strong>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function ActionError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="inline-error" role="alert">
      {message}
    </div>
  )
}

export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}) {
  const titleId = useId()
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h2 id={titleId}>{title}</h2>
        {description && <p className="modal-description">{description}</p>}
        {children}
      </section>
    </div>
  )
}

export function useRemote<T>(loader: () => Promise<T>, requestKey = 'default') {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loaderRef = useRef(loader)
  const requestIdRef = useRef(0)
  loaderRef.current = loader

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError('')
    try {
      const result = await loaderRef.current()
      if (requestId === requestIdRef.current) setData(result)
    } catch (reason) {
      if (requestId === requestIdRef.current) {
        setError(reason instanceof Error ? reason.message : 'Request failed')
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    return () => {
      requestIdRef.current += 1
    }
  }, [load, requestKey])

  return { data, setData, loading, error, reload: load }
}

export function useAsyncAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true)
    setError('')
    try {
      return await action()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The action could not be completed')
      return undefined
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, error, run, clearError: () => setError('') }
}
