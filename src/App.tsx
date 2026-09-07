import { useEffect, useState } from 'react'
import { api, clearToken, getToken } from './api'
import { AppShell } from './layout/app-shell'
import { LoginPage } from './pages/login-page'
import type { AdminUser } from './types'

export default function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(Boolean(getToken()))

  useEffect(() => {
    if (getToken()) {
      api<AdminUser>('/admin/auth/me')
        .then(setAdmin)
        .catch(clearToken)
        .finally(() => setChecking(false))
    }

    const handleExpiredSession = () => setAdmin(null)
    window.addEventListener('admin-session-expired', handleExpiredSession)
    return () => window.removeEventListener('admin-session-expired', handleExpiredSession)
  }, [])

  const logout = async () => {
    try {
      await api('/admin/auth/logout', { method: 'POST' })
    } catch {
      // A local logout still succeeds when the API session has already expired.
    } finally {
      clearToken()
      setAdmin(null)
    }
  }

  if (checking) {
    return (
      <div className="boot-screen">
        <img src="/brinkpay-logo.png" alt="BrinkPay" />
        <span className="spinner" />
      </div>
    )
  }

  return admin ? <AppShell admin={admin} onLogout={logout} /> : <LoginPage onLogin={setAdmin} />
}
