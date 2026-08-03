'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { TestimonialCard } from '@/components/testimonials/TestimonialCard'
import styles from './testimonials.module.css'

export default function TestimonialsPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [pending,  setPending]  = useState<any[]>([])
  const [approved, setApproved] = useState<any[]>([])
  const [sent,     setSent]     = useState<any[]>([])
  const [tab,      setTab]      = useState<'inbox' | 'approved' | 'sent'>('inbox')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const select = '*, author:profiles!testimonials_author_id_fkey(id,username,display_name,avatar_url), reactions(*)'

      const [p, a, s] = await Promise.all([
        supabase.from('testimonials').select(select).eq('recipient_id', user!.id).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('testimonials').select(select).eq('recipient_id', user!.id).eq('status', 'approved').order('approved_at', { ascending: false }),
        supabase.from('testimonials').select('*, recipient:profiles!testimonials_recipient_id_fkey(id,username,display_name,avatar_url)').eq('author_id', user!.id).order('created_at', { ascending: false }),
      ])

      setPending(p.data ?? [])
      setApproved(a.data ?? [])
      setSent(s.data ?? [])
      setLoading(false)
    }
    load()
  }, [user, supabase])

  const removeFromPending = (id: string) => setPending((p) => p.filter((t) => t.id !== id))
  const moveToApproved    = (id: string) => {
    const t = pending.find((p) => p.id === id)
    if (t) setApproved((a) => [{ ...t, status: 'approved' }, ...a])
    removeFromPending(id)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Testimonials</h1>

        {/* Tab bar */}
        <div className={styles.tabs} role="tablist">
          {([
            { key: 'inbox',    label: `Inbox${pending.length > 0 ? ` (${pending.length})` : ''}` },
            { key: 'approved', label: `Approved (${approved.length})` },
            { key: 'sent',     label: `Sent (${sent.length})` },
          ] as { key: typeof tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={[styles.tab, tab === t.key ? styles.tabActive : ''].join(' ')}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.skeleton}>
            {[1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
          </div>
        ) : (
          <div className={styles.list}>
            {tab === 'inbox' && (
              pending.length === 0 ? (
                <div className={styles.empty}>No pending testimonials</div>
              ) : pending.map((t) => (
                <TestimonialCard
                  key={t.id}
                  testimonial={t}
                  showActions
                  onApproved={() => moveToApproved(t.id)}
                  onDeclined={() => removeFromPending(t.id)}
                />
              ))
            )}
            {tab === 'approved' && (
              approved.length === 0 ? (
                <div className={styles.empty}>No approved testimonials yet</div>
              ) : approved.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} currentUserId={user?.id} />
              ))
            )}
            {tab === 'sent' && (
              sent.length === 0 ? (
                <div className={styles.empty}>You haven't written any testimonials yet</div>
              ) : sent.map((t: any) => (
                <div key={t.id} className={styles.sentItem}>
                  <span className={[styles.statusBadge, styles[`status_${t.status}`]].join(' ')}>
                    {t.status}
                  </span>
                  <p className={styles.sentContent}>&ldquo;{t.content}&rdquo;</p>
                  <p className={styles.sentTo}>
                    For {t.recipient?.display_name ?? t.recipient?.username}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
