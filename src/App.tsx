import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, BadgeCheck, BookOpenCheck, ChevronDown, CircleDollarSign, FileClock,
  LayoutDashboard, LogOut, Menu, Search, ShieldAlert, ShieldCheck, Users, X,
} from 'lucide-react'
import { api, clearToken, getToken, setToken } from './api'
import type { AdminRole, AdminUser } from './types'
import {
  AccessPage, AuditPage, DashboardPage, FinancePage, FraudPage, KycPage,
  TransactionsPage, UsersPage,
} from './pages'

type AuthContextValue = { admin: AdminUser; logout: () => Promise<void> }
export const AuthContext = createContext<AuthContextValue | null>(null)
export const useAuth = () => useContext(AuthContext)!

const access: Record<string, AdminRole[]> = {
  '/': ['support', 'compliance', 'finance', 'operations', 'super_admin'],
  '/users': ['support', 'compliance', 'operations', 'super_admin'],
  '/kyc': ['compliance', 'super_admin'],
  '/transactions': ['support', 'compliance', 'finance', 'operations', 'super_admin'],
  '/fraud': ['compliance', 'operations', 'super_admin'],
  '/finance': ['finance', 'operations', 'super_admin'],
  '/access': ['super_admin'],
  '/audit': ['super_admin'],
}

const navigation = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/users', label: 'Users & merchants', icon: Users },
  { path: '/kyc', label: 'KYC reviews', icon: BadgeCheck },
  { path: '/transactions', label: 'Transactions', icon: Activity },
  { path: '/fraud', label: 'Fraud & risk', icon: ShieldAlert },
  { path: '/finance', label: 'Finance & ledger', icon: CircleDollarSign },
  { path: '/access', label: 'Admin access', icon: ShieldCheck },
  { path: '/audit', label: 'Audit trail', icon: FileClock },
]

function LoginPage({ onLogin }: { onLogin: (admin: AdminUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await api<{ admin: AdminUser; accessToken: string }>('/admin/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      })
      setToken(result.accessToken)
      onLogin(result.admin)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed')
    } finally { setLoading(false) }
  }

  return <main className="login-page">
    <section className="login-brand">
      <div className="brand-lockup"><img src="/fastpay-logo.png" alt="" /><span>FastPay</span></div>
      <div className="login-copy"><span className="secure-label"><ShieldCheck size={16} /> Secured operations workspace</span><h1>Keep every payment moving safely.</h1><p>Review identity checks, investigate platform activity and protect customers from one focused workspace.</p></div>
      <div className="login-stats"><div><strong>Role controlled</strong><span>Every action follows least-privilege access.</span></div><div><strong>Fully traceable</strong><span>Sensitive decisions are written to the audit trail.</span></div></div>
    </section>
    <section className="login-panel"><div className="login-form-wrap"><div className="mobile-brand brand-lockup"><img src="/fastpay-logo.png" alt="" /><span>FastPay</span></div><p className="eyebrow">Platform administration</p><h2>Welcome back</h2><p className="form-intro">Use your staff credentials to enter the operations workspace.</p>
      <form onSubmit={submit}>
        <label>Email address<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@fastpay.com" required /></label>
        <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
        {error && <div className="inline-error">{error}</div>}
        <button className="button primary login-button" disabled={loading}>{loading ? <><span className="spinner small" /> Signing in</> : 'Sign in securely'}</button>
      </form><p className="security-note"><BookOpenCheck size={17} /> Access is monitored. Unauthorised use may result in account suspension.</p></div>
    </section>
  </main>
}

function Shell({ admin, onLogout }: { admin: AdminUser; onLogout: () => Promise<void> }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const allowedNav = navigation.filter((item) => access[item.path].includes(admin.role))
  const current = navigation.find((item) => item.path === location.pathname)?.label || 'Overview'

  return <AuthContext.Provider value={{ admin, logout: onLogout }}><div className="app-shell">
    {mobileOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-brand brand-lockup"><img src="/fastpay-logo.png" alt="" /><span>FastPay</span><small>ADMIN</small><button className="mobile-close" onClick={() => setMobileOpen(false)}><X /></button></div>
      <nav>{allowedNav.map(({ path, label, icon: Icon }) => <button key={path} className={location.pathname === path ? 'active' : ''} onClick={() => { navigate(path); setMobileOpen(false) }}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><div className="environment"><span /><div><strong>Production API</strong><small>Secure connection</small></div></div><button onClick={onLogout}><LogOut size={18} />Sign out</button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="menu-button" onClick={() => setMobileOpen(true)}><Menu /></button><div><span>Workspace</span><strong>{current}</strong></div><label className="top-search"><Search size={18} /><input placeholder="Search this workspace" /></label><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen(!profileOpen)}><span>{(admin.fullName || admin.email).split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{admin.fullName || admin.email}</strong><small>{admin.role.replaceAll('_', ' ')}</small></div><ChevronDown size={16} /></button>{profileOpen && <div className="profile-menu"><p>{admin.email}</p><button onClick={onLogout}><LogOut size={16} /> Sign out</button></div>}</div></header>
      <main className="page-content"><Routes><Route path="/" element={<DashboardPage />} /><Route path="/users" element={<UsersPage />} /><Route path="/kyc" element={<KycPage />} /><Route path="/transactions" element={<TransactionsPage />} /><Route path="/fraud" element={<FraudPage />} /><Route path="/finance" element={<FinancePage />} /><Route path="/access" element={<AccessPage />} /><Route path="/audit" element={<AuditPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main>
    </div>
  </div></AuthContext.Provider>
}

export default function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(Boolean(getToken()))

  useEffect(() => {
    if (getToken()) api<AdminUser>('/admin/auth/me').then(setAdmin).catch(() => clearToken()).finally(() => setChecking(false))
    const expired = () => setAdmin(null)
    window.addEventListener('admin-session-expired', expired)
    return () => window.removeEventListener('admin-session-expired', expired)
  }, [])

  const logout = async () => { try { await api('/admin/auth/logout', { method: 'POST' }) } catch { /* local logout still succeeds */ } clearToken(); setAdmin(null) }
  if (checking) return <div className="boot-screen"><img src="/fastpay-logo.png" alt="FastPay" /><span className="spinner" /></div>
  return admin ? <Shell admin={admin} onLogout={logout} /> : <LoginPage onLogin={setAdmin} />
}
