import { useEffect, useRef } from 'react'

export const AUTO_REFRESH_MS = 60 * 1000

// Background refresh that only spends requests while someone is looking: it is
// paused while the tab is hidden, catches up once on return if the data is
// stale, and never overlaps an in-flight refresh.
export function useAutoRefresh(
  refresh: () => Promise<unknown> | void,
  { intervalMs = AUTO_REFRESH_MS, enabled = true } = {},
) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!enabled) return
    let lastRun = Date.now()
    let running = false
    let timer: ReturnType<typeof setInterval> | undefined

    const run = async () => {
      if (running || document.hidden) return
      running = true
      lastRun = Date.now()
      try {
        await refreshRef.current()
      } catch {
        // The view owns its error state. A failed background load must not
        // become an unhandled promise rejection in the interval callback.
      } finally {
        running = false
      }
    }

    const start = () => {
      clearInterval(timer)
      timer = setInterval(() => void run(), intervalMs)
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(timer)
        timer = undefined
        return
      }
      if (Date.now() - lastRun >= intervalMs) void run()
      start()
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs, enabled])
}
