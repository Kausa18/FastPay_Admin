import type { FormEvent } from 'react'
import { useState } from 'react'
import { BookOpenCheck, ShieldCheck } from 'lucide-react'
import { api, setToken } from '../api'
import type { AdminUser } from '../types'

export function LoginPage({ onLogin }: { onLogin: (admin: AdminUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await api<{ admin: AdminUser; accessToken: string }>('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(result.accessToken)
      onLogin(result.admin)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-lockup">
          <img className="brand-wordmark" src="/brinkpay-wordmark.png" alt="BrinkPay" />
        </div>
        <div className="login-copy">
          <span className="secure-label">
            <ShieldCheck size={16} /> Secured operations workspace
          </span>
          <h1>Keep every payment moving safely.</h1>
          <p>
            Review identity checks, investigate platform activity and protect customers from one
            focused workspace.
          </p>
        </div>
        <div className="login-stats">
          <div>
            <strong>Role controlled</strong>
            <span>Every action follows least-privilege access.</span>
          </div>
          <div>
            <strong>Fully traceable</strong>
            <span>Sensitive decisions are written to the audit trail.</span>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-brand brand-lockup">
            <img className="brand-wordmark" src="/brinkpay-wordmark.png" alt="BrinkPay" />
          </div>
          <p className="eyebrow">Platform administration</p>
          <h2>Welcome back</h2>
          <p className="form-intro">
            Use your staff credentials to enter the operations workspace.
          </p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {error && <div className="inline-error">{error}</div>}
            <button className="button primary login-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner small" /> Signing in
                </>
              ) : (
                'Sign in securely'
              )}
            </button>
          </form>
          <p className="security-note">
            <BookOpenCheck size={17} /> Access is monitored. Unauthorised use may result in account
            suspension.
          </p>
        </div>
      </section>
    </main>
  )
}
