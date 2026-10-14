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
    <div className="page-header mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h1 className="mb-1.5 text-2xl leading-tight font-bold tracking-tight text-brinkpay-navy">
          {title}
        </h1>
        <p className="m-0 max-w-2xl text-sm leading-6 text-brinkpay-muted">{description}</p>
      </div>
      {action && <div className="page-action shrink-0 max-sm:[&_.button]:w-full">{action}</div>}
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
    <span
      className={`status-pill ${kind} inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-5 font-medium whitespace-nowrap capitalize`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  debounceMs = 300,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}) {
  const [draft, setDraft] = useState(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Keep the field in sync when the value changes from outside (e.g. cleared
  // by a filter reset) rather than from this component's own debounce.
  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChangeRef.current(draft), debounceMs)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, debounceMs])

  return (
    <label className="search-field relative block w-full min-w-0 sm:max-w-md">
      <Search
        size={18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-brinkpay-muted"
        aria-hidden="true"
      />
      <input
        className="pl-11"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
      />
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
  const requestKeyRef = useRef(requestKey)
  const inFlightRef = useRef<{ key: string; id: number; promise: Promise<void> } | null>(null)
  loaderRef.current = loader
  requestKeyRef.current = requestKey

  const load = useCallback((silent = false) => {
    const existing = inFlightRef.current
    // Refresh may share a pending read. Reload is also called after mutations,
    // so it must supersede any read that started before that change.
    if (silent && existing?.key === requestKeyRef.current && existing.id === requestIdRef.current) {
      return existing.promise
    }
    const requestId = ++requestIdRef.current
    if (!silent) setLoading(true)
    setError('')
    const pending = (async () => {
      try {
        // Defer invocation so even a synchronous loader failure is settled
        // after the in-flight reference is registered.
        const loader = loaderRef.current
        const result = await Promise.resolve().then(loader)
        if (requestId === requestIdRef.current) setData(result)
      } catch (reason) {
        if (requestId === requestIdRef.current) {
          setError(reason instanceof Error ? reason.message : 'Request failed')
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
        if (inFlightRef.current?.id === requestId) inFlightRef.current = null
      }
    })()
    inFlightRef.current = { key: requestKeyRef.current, id: requestId, promise: pending }
    return pending
  }, [])

  useEffect(() => {
    setData(null)
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
