import type { AdminRole } from './types'

// Which roles may open each workspace page. The backend enforces the same
// rules on every endpoint; this only keeps the UI from offering pages an
// administrator cannot use.
export const pageAccess: Record<string, AdminRole[]> = {
  '/': ['support', 'compliance', 'finance', 'operations', 'super_admin'],
  '/users': ['support', 'compliance', 'operations', 'super_admin'],
  '/kyc': ['compliance', 'super_admin'],
  '/transactions': ['support', 'compliance', 'finance', 'operations', 'super_admin'],
  '/fraud': ['compliance', 'operations', 'super_admin'],
  '/finance': ['finance', 'operations', 'super_admin'],
  '/access': ['super_admin'],
  '/audit': ['super_admin'],
}

export const canOpenPage = (role: AdminRole, path: string) =>
  pageAccess[path]?.includes(role) ?? false
