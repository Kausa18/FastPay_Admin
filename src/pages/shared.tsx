import { useState } from 'react'
import { Modal } from '../components'
import { FileCheck2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AdminRole } from '../types'

export type PlatformOverview = {
  total_transactions: number
  total_volume_zmw: number
  total_revenue_zmw: number
  completed_count: number
  failed_count: number
  last_24h_count: number
}

export type NetworkStat = {
  network: string
  transaction_count: number
  completed_count: number
  failed_count: number
  total_volume_zmw: number
  success_rate: number | null
}

export const roleCan = (role: AdminRole, roles: AdminRole[]) =>
  role === 'super_admin' || roles.includes(role)

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
}: {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone?: string
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <div className="metric-main">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

export function DocumentImage({ label, value }: { label: string; value: string }) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [failed, setFailed] = useState(false)
  const source = value.startsWith('data:') ? value : `data:image/jpeg;base64,${value}`
  return (
    <figure>
      <figcaption>{label}</figcaption>
      <div>
        {failed ? (
          <span className="document-placeholder">
            <FileCheck2 size={30} />
            Preview unavailable
          </span>
        ) : (
          <img src={source} alt={label} onError={() => setFailed(true)} />
        )}
      </div>
      <button
        className="button secondary document-open"
        disabled={failed}
        onClick={() => {
          setZoom(1)
          setRotation(0)
          setOpen(true)
        }}
      >
        Enlarge {label.toLowerCase()}
      </button>
      {open && (
        <Modal title={label} onClose={() => setOpen(false)} variant="drawer">
          <div className="document-controls">
            <label>
              Zoom{' '}
              <input
                aria-label="Document zoom"
                type="range"
                min="1"
                max="3"
                step="0.25"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <button className="button secondary" onClick={() => setRotation((rotation + 90) % 360)}>
              Rotate
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setZoom(1)
                setRotation(0)
              }}
            >
              Reset
            </button>
          </div>
          <div className="document-zoom">
            <div style={{ width: `${zoom * 100}%`, height: `${zoom * 65}vh` }}>
              <img src={source} alt={label} style={{ transform: `rotate(${rotation}deg)` }} />
            </div>
          </div>
        </Modal>
      )}
    </figure>
  )
}

export function RoleSelect({ value = 'support' }: { value?: AdminRole }) {
  return (
    <select name="role" defaultValue={value}>
      <option value="support">Support</option>
      <option value="compliance">Compliance</option>
      <option value="finance">Finance</option>
      <option value="operations">Operations</option>
      <option value="super_admin">Super admin</option>
    </select>
  )
}
