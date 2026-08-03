import React from 'react'
import styles from './Input.module.css'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
  icon?:    React.ReactNode
  iconRight?: React.ReactNode
}

export function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <div className={styles.inputWrap}>
        {icon && <span className={styles.iconLeft} aria-hidden>{icon}</span>}
        <input
          id={inputId}
          className={[
            styles.input,
            icon      ? styles.hasIconLeft  : '',
            iconRight ? styles.hasIconRight : '',
            error     ? styles.hasError     : '',
            className,
          ].join(' ')}
          {...props}
        />
        {iconRight && <span className={styles.iconRight} aria-hidden>{iconRight}</span>}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!error && hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?:  string
}

export function Textarea({ label, error, hint, className = '', id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <textarea
        id={inputId}
        className={[styles.textarea, error ? styles.hasError : '', className].join(' ')}
        {...props}
      />
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!error && hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
