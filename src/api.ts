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

export const money = (value: number | string | undefined) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(Number(value || 0))

export const shortDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-ZM', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'

export const titleCase = (value?: string) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—'
