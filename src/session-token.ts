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
