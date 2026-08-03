import React from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.full : '',
        loading   ? styles.loading : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden />}
      {!loading && icon && <span className={styles.icon}>{icon}</span>}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className={styles.icon}>{iconRight}</span>}
    </button>
  )
}
