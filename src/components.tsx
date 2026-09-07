import type { ReactNode } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Search, X } from 'lucide-react'

export function PageHeader({
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
    <div className="loading-skeleton" role="status" aria-label="Loading data" aria-busy="true">
      <span className="sr-only">Loading the latest records...</span>
      <div className="skeleton-heading" aria-hidden="true" />
      <div className="skeleton-cards" aria-hidden="true">
        {[0, 1, 2].map((n) => (
          <div key={n} />
        ))}
      </div>
      <div className="skeleton-table" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((n) => (
          <div key={n} />
        ))}
      </div>
    </div>
  )
}

export function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return message ? (
    <div className="success-banner" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
      <button aria-label="Dismiss message" onClick={onDismiss}>
        <X size={16} />
      </button>
    </div>
  ) : null
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

let openDialogCount = 0
let originalBodyOverflow = ''

export function Modal({
  title,
  description,
  children,
  onClose,
  variant = 'modal',
  busy = false,
}: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  variant?: 'modal' | 'drawer'
  busy?: boolean
}) {
  const titleId = useId()
  const panel = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)
  closeRef.current = onClose
  busyRef.current = busy
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    if (openDialogCount++ === 0) originalBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[aria-modal="true"]')
      if (dialogs[dialogs.length - 1] !== panel.current) return
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault()
        closeRef.current()
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]',
          ) || [],
        ).filter((el) => el.getClientRects().length > 0)
        const first = focusable[0],
          last = focusable[focusable.length - 1]
        if (!first) {
          event.preventDefault()
          panel.current?.focus()
          return
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panel.current)
        ) {
          event.preventDefault()
          last.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === panel.current)
        ) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', keydown)
    return () => {
      window.removeEventListener('keydown', keydown)
      if (--openDialogCount === 0) document.body.style.overflow = originalBodyOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <div
      className={`modal-backdrop ${variant === 'drawer' ? 'drawer-backdrop' : ''}`}
      onMouseDown={() => {
        if (!busy) onClose()
      }}
    >
      <section
        ref={panel}
        tabIndex={-1}
        className={`modal ${variant === 'drawer' ? 'detail-drawer' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          disabled={busy}
          onClick={onClose}
          aria-label="Close"
        >
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

  const load = useCallback(async (silent = false) => {
    const requestId = ++requestIdRef.current
    if (!silent) setLoading(true)
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

  const reload = useCallback(() => load(), [load])
  const refresh = useCallback(() => load(true), [load])
  return { data, setData, loading, error, reload, refresh }
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
