import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const STYLES = {
  success: 'border-l-4 border-status-available bg-white',
  error: 'border-l-4 border-error bg-white',
  warning: 'border-l-4 border-amber-500 bg-white',
  info: 'border-l-4 border-primary bg-white',
}

const ICON_STYLES = {
  success: 'text-status-available',
  error: 'text-error',
  warning: 'text-amber-500',
  info: 'text-primary',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++counter.current
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss]
  )

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast])
  const error = useCallback((msg: string) => toast(msg, 'error'), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-modal animate-slide-up pointer-events-auto ${STYLES[t.type]}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ICON_STYLES[t.type]}`} />
              <p className="flex-1 text-sm text-on-surface">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
