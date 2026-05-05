import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ToastStack from '../components/Toast.jsx'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (toast) => {
      const id = ++idRef.current
      const duration = toast.duration ?? 2000
      setToasts((prev) => [...prev.slice(-4), { id, ...toast }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      push,
      dismiss,
      point: (msg) => push({ variant: 'point', message: msg }),
      streak: (msg) => push({ variant: 'streak', message: msg }),
      copy: (msg = 'Copied!') => push({ variant: 'copy', message: msg, duration: 1500 }),
      error: (msg) => push({ variant: 'error', message: msg, duration: 3000 }),
      info: (msg) => push({ variant: 'info', message: msg }),
    }),
    [push, dismiss],
  )

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
