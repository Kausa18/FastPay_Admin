import { useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { AuthContext } from '../auth-context'
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
  { path: '/users', label: 'Users & merchants', icon: Users },
  { path: '/kyc', label: 'KYC reviews', icon: BadgeCheck },
  { path: '/transactions', label: 'Transactions', icon: Activity },
  { path: '/fraud', label: 'Fraud & risk', icon: ShieldAlert },
  { path: '/finance', label: 'Finance & ledger', icon: CircleDollarSign },
  { path: '/access', label: 'Admin access', icon: ShieldCheck },
  { path: '/audit', label: 'Audit trail', icon: FileClock },
]

export function AppShell({ admin, onLogout }: { admin: AdminUser; onLogout: () => Promise<void> }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const allowedNav = navigation.filter((item) => access[item.path].includes(admin.role))
  const searchResults = quickSearch
    ? allowedNav.filter((item) => item.label.toLowerCase().includes(quickSearch.toLowerCase()))
    : []
  const current = navigation.find((item) => item.path === location.pathname)?.label || 'Overview'

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
            <img src="/fastpay-logo.png" alt="" />
            <span>FastPay</span>
            <small>ADMIN</small>
            <button className="mobile-close" onClick={() => setMobileOpen(false)}>
              <X />
            </button>
          </div>
          <nav>
            {allowedNav.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                className={location.pathname === path ? 'active' : ''}
                onClick={() => {
                  navigate(path)
                  setMobileOpen(false)
                }}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <div className="environment">
              <span />
              <div>
                <strong>Admin API</strong>
                <small>Authenticated session</small>
              </div>
            </div>
            <button onClick={onLogout}>
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button className="menu-button" onClick={() => setMobileOpen(true)}>
              <Menu />
            </button>
            <div>
              <span>Workspace</span>
              <strong>{current}</strong>
            </div>
            <form
              className="top-search"
              onSubmit={(event) => {
                event.preventDefault()
                if (searchResults[0]) {
                  navigate(searchResults[0].path)
                  setQuickSearch('')
                }
              }}
            >
              <Search size={18} />
              <input
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
                placeholder="Find a workspace page"
              />
              {searchResults.length > 0 && (
                <div className="quick-results">
                  {searchResults.map(({ path, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={path}
                      onClick={() => {
                        navigate(path)
                        setQuickSearch('')
                      }}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </form>
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen(!profileOpen)}>
                <span>
                  {(admin.fullName || admin.email)
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                <div>
                  <strong>{admin.fullName || admin.email}</strong>
                  <small>{admin.role.replaceAll('_', ' ')}</small>
                </div>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <p>{admin.email}</p>
                  <button onClick={onLogout}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </header>
          <main className="page-content">
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
