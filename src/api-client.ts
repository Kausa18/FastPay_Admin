export const REQUEST_TIMEOUT_MS = 30_000
export const STARTUP_TIMEOUT_MS = 90_000

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type ApiRequestInit = RequestInit & { timeoutMs?: number }

function errorMessage(payload: Record<string, unknown>, status: number) {
  if (typeof payload.detail === 'string') return payload.detail
  const error = payload.error as { message?: unknown } | undefined
  if (typeof error?.message === 'string') return error.message
  if (Array.isArray(payload.detail)) {
    const messages = payload.detail
      .map((item: { msg?: unknown }) => item?.msg)
      .filter((message): message is string => typeof message === 'string')
    if (messages.length) return messages.join('. ')
  }
  if (status >= 500) return 'The server is temporarily unavailable. Please try again shortly.'
  return 'The request could not be completed.'
}

// One deadline covers both connection setup and reading the response body.
// Writes are never replayed: a lost response does not prove the action failed.
export function createApiClient({
  baseUrl,
  getToken,
  onUnauthorized,
  fetchRequest = fetch,
}: {
  baseUrl: string
  getToken: () => string | null
  onUnauthorized: () => void
  fetchRequest?: typeof fetch
}) {
  return async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const { timeoutMs = REQUEST_TIMEOUT_MS, signal, ...requestInit } = init
    const controller = new AbortController()
    let timedOut = false
    const abort = () => controller.abort(signal?.reason)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    const token = getToken()
    const headers = new Headers(init.headers)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    const method = (init.method || 'GET').toUpperCase()
    const isRead = method === 'GET' || method === 'HEAD'
    try {
      const response = await fetchRequest(`${baseUrl}${path}`, {
        ...requestInit,
        headers,
        signal: controller.signal,
      })
      const raw = await response.text()
      let payload: Record<string, unknown> = {}
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : {}
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
        payload = parsed as Record<string, unknown>
      } catch {
        if (response.ok) {
          throw new ApiError(
            'The server returned an unreadable response. Please try again.',
            response.status,
          )
        }
      }
      if (!response.ok) {
        // An old request must not invalidate a newer login or refreshed token.
        if (response.status === 401 && token && getToken() === token) onUnauthorized()
        throw new ApiError(errorMessage(payload, response.status), response.status)
      }
      return payload.data as T
    } catch (reason) {
      if (signal?.aborted) throw reason
      if (timedOut) {
        throw new ApiError(
          isRead
            ? 'The server is taking too long to respond. Please try again shortly.'
            : 'The server is taking too long to respond. Check whether the action completed before trying again.',
          0,
        )
      }
      if (reason instanceof ApiError) throw reason
      throw new ApiError(
        isRead
          ? 'Unable to reach the server. Check your connection and try again.'
          : 'The connection was interrupted. Check whether the action completed before trying again.',
        0,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }
}
