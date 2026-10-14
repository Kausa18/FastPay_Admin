import { createApiClient } from './api-client'

export { ApiError, STARTUP_TIMEOUT_MS } from './api-client'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace(
  /\/$/,
  '',
)
const TOKEN_KEY = 'fastpay_admin_token'

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => sessionStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY)

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getToken,
  onUnauthorized: () => {
    clearToken()
    window.dispatchEvent(new Event('admin-session-expired'))
  },
})

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
