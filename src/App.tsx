import { useEffect, useState } from 'react'
import { api, ApiError, clearToken, getToken, STARTUP_TIMEOUT_MS } from './api'
import { AppShell } from './layout/app-shell'
import { LoginPage } from './pages/login-page'
import type { AdminUser } from './types'

export default function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(Boolean(getToken()))
  const [startupError, setStartupError] = useState('')
  const [checkAttempt, setCheckAttempt] = useState(0)

  useEffect(() => {
    if (!getToken()) return
    let active = true
    const controller = new AbortController()
    setChecking(true)
    setStartupError('')
    api<AdminUser>('/admin/auth/me', {
      timeoutMs: STARTUP_TIMEOUT_MS,
      signal: controller.signal,
    })
      .then((result) => {
        if (active) setAdmin(result)
      })
      .catch((reason) => {
        if (!active || (reason instanceof ApiError && reason.status === 401)) return
        setStartupError(reason instanceof Error ? reason.message : 'Unable to reach the server.')
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [checkAttempt])

  useEffect(() => {
    const handleExpiredSession = () => setAdmin(null)
    window.addEventListener('admin-session-expired', handleExpiredSession)
    return () => window.removeEventListener('admin-session-expired', handleExpiredSession)
  }, [])

  const logout = () => {
    // Best-effort server-side revocation; clearing local session state must
    // not wait on it, or a slow/unreachable API stalls the logout button.
    api('/admin/auth/logout', { method: 'POST' }).catch(() => {})
    clearToken()
    setAdmin(null)
  }

  if (checking) {
    return (
      <div className="boot-screen">
        <img src="/brinkpay-logo.png" alt="BrinkPay" />
        <span className="spinner" />
        <p>Connecting to the server. This may take a minute after inactivity.</p>
      </div>
    )
  }

  if (startupError) {
    return (
      <div className="boot-screen">
        <img src="/brinkpay-logo.png" alt="BrinkPay" />
        <p role="alert">{startupError}</p>
        <button
          className="button secondary"
          onClick={() => setCheckAttempt((attempt) => attempt + 1)}
        >
          Try again
        </button>
        <button
          className="button secondary"
          onClick={() => {
            setStartupError('')
            logout()
          }}
        >
          Sign out
        </button>
      </div>
    )
  }

  return admin ? <AppShell admin={admin} onLogout={logout} /> : <LoginPage onLogin={setAdmin} />
}
