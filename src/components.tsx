import { ReactNode, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Search, X } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
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

export function StatusPill({ value }: { value?: string }) {
  const status = value || 'unknown'
  const positive = ['active', 'approved', 'completed', 'resolved']
  const warning = ['pending', 'pending_kyc', 'processing', 'reviewing', 'open']
  const negative = ['failed', 'rejected', 'suspended', 'banned', 'disabled']
  const kind = positive.includes(status) ? 'positive' : warning.includes(status) ? 'warning' : negative.includes(status) ? 'negative' : 'neutral'
  return <span className={`status-pill ${kind}`}><span />{status.replaceAll('_', ' ')}</span>
}

export function SearchField({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search-field"><Search size={18} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>
}

export function LoadingState() {
  return <div className="state-panel"><span className="spinner" /><strong>Loading workspace</strong><p>Fetching the latest platform data.</p></div>
}

export function EmptyState({ title = 'Nothing to review', message = 'There are no records matching this view.' }: { title?: string; message?: string }) {
  return <div className="state-panel"><CheckCircle2 size={28} /><strong>{title}</strong><p>{message}</p></div>
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-panel error"><AlertCircle size={28} /><strong>We couldn’t load this view</strong><p>{message}</p>{retry && <button className="button secondary" onClick={retry}>Try again</button>}</div>
}

export function Modal({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><h2>{title}</h2>{description && <p className="modal-description">{description}</p>}{children}</section></div>
}

export function useRemote<T>(loader: () => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => {
    setLoading(true)
    setError('')
    loader().then(setData).catch((reason) => setError(reason.message || 'Request failed')).finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, dependencies)
  return { data, setData, loading, error, reload: load }
}
