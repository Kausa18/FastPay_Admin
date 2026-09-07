import { useCallback, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

// URL state survives reload and browser Back; session storage restores each page
// when an operator visits another workspace section and returns.
export function useTableState(defaults: Record<string, string>) {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const key = `brinkpay-view:${pathname}`
  useEffect(() => {
    if (!params.toString()) {
      try {
        const saved = sessionStorage.getItem(key)
        if (saved) setParams(new URLSearchParams(saved), { replace: true })
      } catch {
        /* Storage may be disabled. */
      }
    }
  }, [key])
  useEffect(() => {
    if (params.toString()) {
      try {
        sessionStorage.setItem(key, params.toString())
      } catch {
        /* URL remains authoritative. */
      }
    }
  }, [key, params])
  const get = (name: string) => params.get(name) ?? defaults[name] ?? ''
  const set = useCallback(
    (values: Record<string, string>, resetPage = true) => {
      setParams((current) => {
        const next = new URLSearchParams(current)
        for (const [name, value] of Object.entries(values)) next.set(name, value)
        if (resetPage) next.set('page', '1')
        return next
      })
    },
    [setParams],
  )
  const reset = () => {
    setParams({ ...defaults, page: '1' })
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* No-op. */
    }
  }
  const page = Math.max(1, Number.parseInt(get('page'), 10) || 1)
  const size = [10, 25, 50].includes(Number(get('size'))) ? Number(get('size')) : 25
  const sort = get('sort'),
    direction = get('direction') === 'asc' ? 'asc' : 'desc'
  const sortBy = (column: string) =>
    set({ sort: column, direction: sort === column && direction === 'asc' ? 'desc' : 'asc' })
  return {
    get,
    set,
    reset,
    page,
    size,
    sort,
    direction,
    sortBy,
    paging: `paginated=true&limit=${size}&offset=${(page - 1) * size}&sort=${encodeURIComponent(sort)}&direction=${direction}`,
  }
}
export type TableState = ReturnType<typeof useTableState>
