// Reads the expiry the API stamped into an admin token, in epoch milliseconds.
// It only decides when to ask for a fresh token; the API stays authoritative.
export const tokenExpiresAt = (token: string | null) => {
  try {
    const part = token?.split('.')[1]
    if (!part) return null
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export const SESSION_REFRESH_RETRY_MS = 30_000

// Mouse and scroll events can fire dozens of times a second. A failed refresh
// gets a cooldown, and a late response cannot recreate a signed-out session.
export function createSessionRefresher({
  getToken,
  setToken,
  exchange,
  refreshWindowMs,
  now = Date.now,
}: {
  getToken: () => string | null
  setToken: (token: string) => void
  exchange: () => Promise<string>
  refreshWindowMs: number
  now?: () => number
}) {
  let inFlight = false
  let retryAt = 0
  let cancelled = false
  return {
    cancel: () => {
      cancelled = true
    },
    refresh: async () => {
      const token = getToken()
      const expiresAt = tokenExpiresAt(token)
      if (
        cancelled ||
        inFlight ||
        now() < retryAt ||
        !expiresAt ||
        expiresAt - now() > refreshWindowMs
      )
        return
      inFlight = true
      try {
        const refreshed = await exchange()
        if (!cancelled && getToken() === token) setToken(refreshed)
        retryAt = 0
      } catch {
        retryAt = now() + SESSION_REFRESH_RETRY_MS
      } finally {
        inFlight = false
      }
    },
  }
}
