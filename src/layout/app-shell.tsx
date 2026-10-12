import { Avatar } from '../ui/avatar'
import { ProfileEditor } from '../pages/profile-editor'
import type { ReactNode } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'
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
import { canOpenPage } from '../access'
import { api } from '../api'
import { useIdleLogout } from '../hooks/use-idle-logout'
import { useSessionRefresh } from '../hooks/use-session-refresh'
import { LoadingState } from '../components'
import type { AdminUser } from '../types'

// Lazy-loaded per route so an admin only downloads the pages their role can
// reach, instead of the whole app bundle on every login.
const DashboardPage = lazy(() =>
  import('../pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
)
const UsersPage = lazy(() => import('../pages/users-page').then((m) => ({ default: m.UsersPage })))
const KycPage = lazy(() => import('../pages/kyc-page').then((m) => ({ default: m.KycPage })))
const TransactionsPage = lazy(() =>
  import('../pages/transactions-page').then((m) => ({ default: m.TransactionsPage })),
)
const FraudPage = lazy(() => import('../pages/fraud-page').then((m) => ({ default: m.FraudPage })))
const FinancePage = lazy(() =>
  import('../pages/finance-page').then((m) => ({ default: m.FinancePage })),
)
const AccessPage = lazy(() =>
  import('../pages/access-page').then((m) => ({ default: m.AccessPage })),
)
const AuditPage = lazy(() => import('../pages/audit-page').then((m) => ({ default: m.AuditPage })))

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

export function AppShell({
  admin: initialAdmin,
  onLogout,
}: {
  admin: AdminUser
  onLogout: () => void
}) {
  const [admin, setAdmin] = useState(initialAdmin)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  useEffect(() => setAdmin(initialAdmin), [initialAdmin])
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const allowedNav = navigation.filter((item) => canOpenPage(admin.role, item.path))
  // A typed or bookmarked URL must not render a page the role cannot open.
  const guard = (path: string, page: ReactNode) =>
    canOpenPage(admin.role, path) ? page : <Navigate to="/" replace />
  const current = navigation.find((item) => item.path === location.pathname)?.label || 'Overview'

  useEffect(() => {
    void api('/admin/page-views', {
      method: 'POST',
      body: JSON.stringify({ path: location.pathname, pageName: current }),
    }).catch(() => undefined)
  }, [location.pathname, current])

  const { warning: idleWarning } = useIdleLogout(() => {
    onLogout()
  })
  useSessionRefresh()

  return (
    <AuthContext.Provider value={{ admin, logout: onLogout }}>
      <div className="app-shell min-h-screen bg-brinkpay-canvas min-[901px]:pl-64">
        {mobileOpen && (
          <button
            className="nav-scrim fixed inset-0 z-40 border-0 bg-slate-950/40 min-[901px]:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={`sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-brinkpay-border bg-white transition-transform duration-200 min-[901px]:translate-x-0 ${mobileOpen ? 'open translate-x-0' : '-translate-x-full'}`}
        >
          <div className="sidebar-brand flex h-24 shrink-0 items-center gap-3 border-b border-brinkpay-border px-5">
            <img
              className="brand-wordmark h-auto w-36 object-contain"
              src="/brinkpay-wordmark.png"
              alt="BrinkPay"
            />
            <small className="rounded border border-brinkpay-border px-1.5 py-1 text-[9px] font-semibold tracking-wider text-brinkpay-muted max-[900px]:hidden">
              ADMIN
            </small>
            <button
              className="mobile-close ml-auto flex size-8 items-center justify-center rounded-lg border-0 bg-slate-50 text-brinkpay-muted min-[901px]:hidden"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X />
            </button>
          </div>
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6" aria-label="Main navigation">
            {[
              { title: 'Operations', paths: ['/', '/users', '/transactions', '/finance'] },
              { title: 'Compliance', paths: ['/kyc', '/fraud'] },
              { title: 'Administration', paths: ['/access', '/audit'] },
            ].map((group) => {
              const items = allowedNav.filter((item) => group.paths.includes(item.path))
              return (
                items.length > 0 && (
                  <div className="nav-group" key={group.title}>
                    <p className="mb-2 px-3 text-[10px] font-semibold tracking-widest text-brinkpay-muted uppercase">
                      {group.title}
                    </p>
                    {items.map(({ path, label, icon: Icon }) => (
                      <button
                        key={path}
                        className={`my-1 flex min-h-11 w-full items-center gap-3 rounded-lg border-0 px-3 py-2.5 text-left text-sm transition-colors ${location.pathname === path ? 'active bg-brinkpay-blue/10 font-semibold text-brinkpay-blue shadow-[inset_3px_0_0_var(--color-brinkpay-blue)]' : 'bg-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-brinkpay-navy'}`}
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
          <div className="sidebar-foot shrink-0 border-t border-brinkpay-border p-3">
            <div className="sidebar-identity flex items-center gap-3 px-2 py-3">
              <Avatar name={admin.fullName || admin.email} photo={admin.profilePhoto} />
              <div className="min-w-0">
                <strong className="block text-sm font-semibold break-words text-brinkpay-navy">
                  {admin.fullName || admin.email}
                </strong>
                <small className="mt-1 block text-xs text-brinkpay-muted capitalize">
                  {admin.role.replaceAll('_', ' ')}
                </small>
              </div>
            </div>
            {admin.id && (
              <button
                className="flex min-h-10 w-full items-center rounded-lg border-0 bg-transparent px-3 text-left text-sm font-medium text-brinkpay-muted hover:bg-slate-50"
                onClick={() => {
                  setProfileOpen(true)
                  setMobileOpen(false)
                }}
              >
                Edit profile
              </button>
            )}
            <button
              className="flex min-h-10 w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 text-left text-sm font-medium text-brinkpay-muted hover:bg-red-50 hover:text-red-700"
              onClick={onLogout}
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>
        <div className="workspace min-w-0">
          <div className="mobile-navigation sticky top-0 z-30 flex h-16 items-center justify-between border-b border-brinkpay-border bg-white px-4 min-[901px]:hidden">
            <button
              className="icon-button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </button>
            <img
              className="h-auto w-32 object-contain"
              src="/brinkpay-wordmark.png"
              alt="BrinkPay"
            />
          </div>
          <main className="page-content mx-auto max-w-[1600px] px-4 py-6 sm:px-6 min-[901px]:p-8">
            {profileNotice && (
              <div className="success-banner" role="status">
                {profileNotice}
                <button aria-label="Dismiss profile update" onClick={() => setProfileNotice('')}>
                  <X size={16} />
                </button>
              </div>
            )}
            {profileOpen && (
              <ProfileEditor
                admin={admin}
                onClose={() => setProfileOpen(false)}
                onSaved={(updated) => {
                  setAdmin(updated)
                  setProfileOpen(false)
                  setProfileNotice('Your profile has been updated.')
                }}
              />
            )}
            <Suspense fallback={<LoadingState />}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={guard('/users', <UsersPage />)} />
                <Route path="/kyc" element={guard('/kyc', <KycPage />)} />
                <Route
                  path="/transactions"
                  element={guard('/transactions', <TransactionsPage />)}
                />
                <Route path="/fraud" element={guard('/fraud', <FraudPage />)} />
                <Route path="/finance" element={guard('/finance', <FinancePage />)} />
                <Route path="/access" element={guard('/access', <AccessPage />)} />
                <Route path="/audit" element={guard('/audit', <AuditPage />)} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        {idleWarning && (
          <div
            className="fixed right-4 bottom-4 left-4 z-[60] flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg sm:left-auto sm:max-w-md"
            role="alertdialog"
            aria-live="assertive"
            aria-label="Inactivity sign-out warning"
          >
            <span className="flex-1">
              You will be signed out in under a minute because of inactivity.
            </span>
            {/* Any interaction resets the idle timer; the button gives a clear way to do so. */}
            <button className="button secondary">Stay signed in</button>
          </div>
        )}
      </div>
    </AuthContext.Provider>
  )
}
