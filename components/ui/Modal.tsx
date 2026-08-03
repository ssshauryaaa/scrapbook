'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'
import styles from './Modal.module.css'

interface ModalProps {
  open:      boolean
  onClose:   () => void
  title?:    string
  children:  ReactNode
  size?:     'sm' | 'md' | 'lg' | 'xl'
  hideClose?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  hideClose = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const content = (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={[styles.panel, styles[size]].join(' ')}>
        {(title || !hideClose) && (
          <div className={styles.header}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {!hideClose && (
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
