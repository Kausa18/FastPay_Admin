import { useEffect } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { TableState } from '../hooks/use-table-state'
export type PageResult<T> = { items: T[]; total: number; stats: Record<string, number> }
export function SortHeader({
  label,
  column,
  state,
  numeric = false,
}: {
  label: string
  column: string
  state: TableState
  numeric?: boolean
}) {
  const active = state.sort === column
  return (
    <th
      className={numeric ? 'numeric' : ''}
      aria-sort={active ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button className="sort-button" onClick={() => state.sortBy(column)}>
        {label}
        {active ? (
          state.direction === 'asc' ? (
            <ArrowUp size={13} />
          ) : (
            <ArrowDown size={13} />
          )
        ) : (
          <ChevronsUpDown size={13} />
        )}
      </button>
    </th>
  )
}
export function Pagination({
  state,
  total,
  loading = false,
}: {
  state: TableState
  total: number
  loading?: boolean
}) {
  const pages = Math.max(1, Math.ceil(total / state.size))
  useEffect(() => {
    if (!loading && state.page > pages) state.set({ page: String(pages) }, false)
  }, [loading, state.page, pages, state.set])
  return (
    <nav className="pagination" aria-label="Table pages">
      <span>
        {total
          ? `${Math.min((state.page - 1) * state.size + 1, total)}–${Math.min(state.page * state.size, total)} of ${total.toLocaleString()} records`
          : 'No records'}
      </span>
      <label>
        Rows{' '}
        <select
          aria-label="Rows per page"
          value={state.size}
          onChange={(e) => state.set({ size: e.target.value })}
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        className="button secondary"
        disabled={loading || state.page <= 1}
        onClick={() => state.set({ page: String(Math.max(1, state.page - 1)) }, false)}
      >
        Previous
      </button>
      <span>
        Page {state.page} of {pages}
      </span>
      <button
        className="button secondary"
        disabled={loading || state.page >= pages}
        onClick={() => state.set({ page: String(state.page + 1) }, false)}
      >
        Next
      </button>
    </nav>
  )
}
