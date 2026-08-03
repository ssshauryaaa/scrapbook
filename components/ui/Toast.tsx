'use client'

import { useEffect, useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import styles from './Toast.module.css'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id:      string
  type:    ToastType
  message: string
  description?: string
}

// Simple singleton event bus
const listeners: ((t: Toast) => void)[] = []

export function toast(message: string, opts?: { type?: ToastType; description?: string }) {
  const t: Toast = {
    id:          Math.random().toString(36).slice(2),
    type:        opts?.type ?? 'info',
    message,
    description: opts?.description,
  }
  listeners.forEach((fn) => fn(t))
}
toast.success = (msg: string, desc?: string) => toast(msg, { type: 'success', description: desc })
toast.error   = (msg: string, desc?: string) => toast(msg, { type: 'error',   description: desc })
toast.warning = (msg: string, desc?: string) => toast(msg, { type: 'warning', description: desc })
toast.info    = (msg: string, desc?: string) => toast(msg, { type: 'info',    description: desc })

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={18} />,
  error:   <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info:    <Info size={18} />,
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev.slice(-4), t])
      setTimeout(() => remove(t.id), 4500)
    }
    listeners.push(handler)
    return () => { const i = listeners.indexOf(handler); if (i > -1) listeners.splice(i, 1) }
  }, [remove])

  if (toasts.length === 0) return null

  return createPortal(
    <div className={styles.container} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={[styles.toast, styles[t.type]].join(' ')}>
          <span className={styles.icon}>{icons[t.type]}</span>
          <div className={styles.content}>
            <p className={styles.message}>{t.message}</p>
            {t.description && <p className={styles.desc}>{t.description}</p>}
          </div>
          <button className={styles.dismiss} onClick={() => remove(t.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
