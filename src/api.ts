const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace(
  /\/$/,
  '',
)
const TOKEN_KEY = 'fastpay_admin_token'

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => sessionStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && token) {
      clearToken()
      window.dispatchEvent(new Event('admin-session-expired'))
    }
    throw new ApiError(
      payload.detail || payload.error?.message || 'Something went wrong',
      response.status,
    )
  }
  return payload.data as T
}

export function subscribeToAdminEvents(
  onRefresh: () => void,
  onConnectionChange: (connected: boolean) => void,
) {
  const controller = new AbortController()

  const connect = async () => {
    while (!controller.signal.aborted) {
      try {
        const token = getToken()
        const response = await fetch(`${API_BASE_URL}/admin/events`, {
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        })
        if (!response.ok || !response.body) {
          if (response.status === 401) {
            clearToken()
            window.dispatchEvent(new Event('admin-session-expired'))
          }
          throw new ApiError('Live updates are unavailable', response.status)
        }

        onConnectionChange(true)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const messages = buffer.split('\n\n')
          buffer = messages.pop() || ''
          for (const message of messages) {
            const event = message
              .split('\n')
              .find((line) => line.startsWith('event:'))
              ?.slice(6)
              .trim()
            if (event === 'refresh') onRefresh()
          }
        }
      } catch (error) {
        if (controller.signal.aborted) break
      } finally {
        if (!controller.signal.aborted) onConnectionChange(false)
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2_000))
    }
  }

  void connect()
  return () => controller.abort()
}

export const money = (value: number | string | undefined) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(Number(value || 0))

export const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const timestamp = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value) ? `${value}Z` : value

export const shortDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(timestamp(value))
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  return new Intl.DateTimeFormat('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: browserTimeZone,
    timeZoneName: 'short',
  }).format(date)
}

export const titleCase = (value?: string) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—'
