import { useEffect, useRef, useState } from 'react'

export const IDLE_LIMIT_MS = 5 * 60 * 1000
export const IDLE_WARNING_MS = 60 * 1000
export const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
] as const

// Signs the admin out after IDLE_LIMIT_MS without activity. For the final
// IDLE_WARNING_MS it reports `warning` so the shell can tell them it is coming;
// any activity, including pressing the warning's button, starts the timer over.
export function useIdleLogout(onIdle: () => void) {
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle
  const [warning, setWarning] = useState(false)

  useEffect(() => {
    let warningTimer: ReturnType<typeof setTimeout>
    let logoutTimer: ReturnType<typeof setTimeout>

    const reset = () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
      setWarning(false)
      warningTimer = setTimeout(() => setWarning(true), IDLE_LIMIT_MS - IDLE_WARNING_MS)
      logoutTimer = setTimeout(() => onIdleRef.current(), IDLE_LIMIT_MS)
    }

    reset()
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset))

    return () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset))
    }
  }, [])

  return { warning }
}
