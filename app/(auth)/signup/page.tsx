'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Mail, Lock, User, AtSign, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from '../login/auth.module.css'

export default function SignupPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username,    setUsername]    = useState('')
  const [usernameOk,  setUsernameOk]  = useState<boolean | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameOk(null); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()
      setUsernameOk(!data)
    }, 500)
    return () => clearTimeout(t)
  }, [username, supabase])

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (usernameOk === false) {
      setError('That username is already taken')
      setLoading(false)
      return
    }

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:   displayName,
          username:    username.toLowerCase(),
          avatar_url:  null,
        },
      },
    })

    if (signUpErr) {
      setError(signUpErr.message)
      setLoading(false)
      return
    }

    // If email confirmation required, the user will be null
    if (!data.session) {
      router.push('/login?message=check_email')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const usernameHint = username.length < 3
    ? 'Minimum 3 characters'
    : usernameOk === null
    ? 'Checking…'
    : usernameOk
    ? '✓ Available'
    : '✗ Already taken'

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
      </div>

      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <BookOpen size={28} className={styles.logoIcon} />
          <span className={styles.logoText}>Scrapbook</span>
        </Link>

        <h1 className={styles.heading}>Create your memory wall</h1>
        <p className={styles.sub}>Join thousands of friends sharing scraps</p>

        <Button
          variant="secondary"
          fullWidth
          onClick={handleGoogle}
          icon={<Globe size={18} />}
          className={styles.googleBtn}
        >
          Sign up with Google
        </Button>

        <div className={styles.divider}><span>or</span></div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            id="signup-name"
            label="Display Name"
            placeholder="Your full name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            icon={<User size={16} />}
            required
          />
          <Input
            id="signup-username"
            label="Username"
            placeholder="your_handle"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
            icon={<AtSign size={16} />}
            hint={usernameHint}
            required
          />
          <Input
            id="signup-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            required
          />
          <Input
            id="signup-password"
            label="Password"
            type="password"
            placeholder="8+ characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            error={error}
            required
            minLength={8}
          />

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            disabled={usernameOk === false}
          >
            Create Account
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" className={styles.footerLink}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
