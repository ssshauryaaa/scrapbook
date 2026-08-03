'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Mail, Lock, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import styles from './auth.module.css'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className={styles.page}>
      {/* Decorative background */}
      <div className={styles.bg}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
      </div>

      <div className={styles.card}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <BookOpen size={28} className={styles.logoIcon} />
          <span className={styles.logoText}>Scrapbook</span>
        </Link>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your memory wall</p>

        {/* Google OAuth */}
        <Button
          variant="secondary"
          fullWidth
          onClick={handleGoogle}
          icon={<Globe size={18} />}
          className={styles.googleBtn}
        >
          Continue with Google
        </Button>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            id="login-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            required
            autoComplete="email"
          />
          <Input
            id="login-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            error={error}
            required
            autoComplete="current-password"
          />

          <Button type="submit" fullWidth loading={loading} size="lg">
            Sign In
          </Button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className={styles.footerLink}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
