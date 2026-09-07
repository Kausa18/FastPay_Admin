import { Avatar } from '../ui/avatar'
import { ProfileEditor } from '../pages/profile-editor'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  BadgeCheck,
  CircleDollarSign,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { AuthContext } from '../auth-context'
import { api } from '../api'
import { useIdleLogout } from '../hooks/use-idle-logout'
import type { AdminRole, AdminUser } from '../types'
import {
  AccessPage,
  AuditPage,
  DashboardPage,
  FinancePage,
  FraudPage,
  KycPage,
  TransactionsPage,
  UsersPage,
} from '../pages'

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
  { path: '/users', label: 'Accounts', icon: Users },
  { path: '/kyc', label: 'Identity reviews', icon: BadgeCheck },
  { path: '/transactions', label: 'Transactions', icon: Activity },
  { path: '/fraud', label: 'Risk cases', icon: ShieldAlert },
  { path: '/finance', label: 'Finance', icon: CircleDollarSign },
  { path: '/access', label: 'Team access', icon: ShieldCheck },
  { path: '/audit', label: 'Activity log', icon: FileClock },
]

export function AppShell({ admin: initialAdmin, onLogout }: { admin: AdminUser; onLogout: () => Promise<void> }) {
  const [admin, setAdmin] = useState(initialAdmin)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  useEffect(() => setAdmin(initialAdmin), [initialAdmin])
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const allowedNav = navigation.filter((item) => access[item.path].includes(admin.role))
  const current = navigation.find((item) => item.path === location.pathname)?.label || 'Overview'

  useEffect(() => {
    void api('/admin/page-views', {
      method: 'POST',
      body: JSON.stringify({ path: location.pathname, pageName: current }),
    }).catch(() => undefined)
  }, [location.pathname, current])

  useIdleLogout(() => {
    void onLogout()
  })

  return (
    <AuthContext.Provider value={{ admin, logout: onLogout }}>
      <div className="app-shell">
        {mobileOpen && (
          <button
            className="nav-scrim"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="sidebar-brand brand-lockup">
            <img className="brand-wordmark" src="/brinkpay-wordmark.png" alt="BrinkPay" />
            <small>ADMIN</small>
            <button
              className="mobile-close"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X />
            </button>
          </div>
          <nav aria-label="Main navigation">
            {[
              { title: 'Operations', paths: ['/', '/users', '/transactions', '/finance'] },
              { title: 'Compliance', paths: ['/kyc', '/fraud'] },
              { title: 'Administration', paths: ['/access', '/audit'] },
            ].map((group) => {
              const items = allowedNav.filter((item) => group.paths.includes(item.path))
              return (
                items.length > 0 && (
                  <div className="nav-group" key={group.title}>
                    <p>{group.title}</p>
                    {items.map(({ path, label, icon: Icon }) => (
                      <button
                        key={path}
                        className={location.pathname === path ? 'active' : ''}
                        aria-current={location.pathname === path ? 'page' : undefined}
                        onClick={() => {
                          navigate(path)
                          setMobileOpen(false)
                        }}
                      >
                        <Icon size={18} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )
              )
            })}
          </nav>
          <div className="sidebar-foot">
            <div className="sidebar-identity">
              <Avatar name={admin.fullName || admin.email} photo={admin.profilePhoto} />
              <div>
                <strong>{admin.fullName || admin.email}</strong>
                <small>{admin.role.replaceAll('_', ' ')}</small>
              </div>
            </div>
            {admin.id && <button onClick={() => { setProfileOpen(true); setMobileOpen(false) }}>Edit profile</button>}
            <button onClick={onLogout}>
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>
        <div className="workspace">
          <div className="mobile-navigation">
            <button
              className="icon-button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </button>
            <img src="/brinkpay-wordmark.png" alt="BrinkPay" />
          </div>
          <main className="page-content">
            {profileNotice && <div className="success-banner" role="status">{profileNotice}<button aria-label="Dismiss profile update" onClick={() => setProfileNotice('')}><X size={16} /></button></div>}
            {profileOpen && <ProfileEditor admin={admin} onClose={() => setProfileOpen(false)} onSaved={updated => { setAdmin(updated); setProfileOpen(false); setProfileNotice('Your profile has been updated.') }} />}
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/kyc" element={<KycPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/fraud" element={<FraudPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/access" element={<AccessPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  )
}

