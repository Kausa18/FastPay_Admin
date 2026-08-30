import { createContext, useContext } from 'react'
import type { AdminUser } from './types'

export type AuthContextValue = {
  admin: AdminUser
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside the authenticated admin shell')
  return context
}
