import { useEffect } from 'react'
import { api, getToken, setToken } from '../api'
import { tokenExpiresAt } from '../session-token'
import { ACTIVITY_EVENTS, IDLE_LIMIT_MS } from './use-idle-logout'

// Refresh once the token is within this window of expiring. It is longer than
// the idle limit, so anyone active enough to avoid the idle logout always gets
// a fresh token before the old one lapses.
const REFRESH_WINDOW_MS = IDLE_LIMIT_MS + 60 * 1000

// Access tokens are short-lived; this keeps an active administrator signed in
// by exchanging the token when they interact near its expiry. Idle sessions are
// left to expire and the API caps the total session length.
export function useSessionRefresh() {
  useEffect(() => {
    let inFlight = false
    const maybeRefresh = async () => {
      const expiresAt = tokenExpiresAt(getToken())
      if (inFlight || !expiresAt || expiresAt - Date.now() > REFRESH_WINDOW_MS) return
      inFlight = true
      try {
        const result = await api<{ accessToken: string }>('/admin/auth/refresh', { method: 'POST' })
        setToken(result.accessToken)
      } catch {
        // A rejected refresh (revoked or time-limited session) already signs
        // the admin out through the API client's 401 handling.
      } finally {
        inFlight = false
      }
    }
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, maybeRefresh))
    return () => ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, maybeRefresh))
  }, [])
}
