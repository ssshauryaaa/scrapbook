'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { Sparkles, Clock, Send, BookOpen, Users, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import type { OnThisDayScrap, Testimonial, Profile } from '@/types/database'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const supabase = createClient()
  const { user, profile } = useAuth()

  const [onThisDay,    setOnThisDay]    = useState<OnThisDayScrap[]>([])
  const [recentScraps, setRecentScraps] = useState<any[]>([])
  const [pendingTests, setPendingTests] = useState<Testimonial[]>([])
  const [pendingFriends, setPendingFriends] = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!user) return

    async function load() {
      // On This Day
      const { data: otd } = await (supabase.rpc as any)('get_on_this_day', { user_id: user!.id })
      setOnThisDay((otd as unknown as OnThisDayScrap[]) ?? [])

      // Recent scraps received
      const { data: scraps } = await supabase
        .from('scraps')
        .select('*, author:profiles!scraps_author_id_fkey(id,username,display_name,avatar_url)')
        .eq('recipient_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setRecentScraps(scraps ?? [])

      // Pending testimonials
      const { data: tests } = await supabase
        .from('testimonials')
        .select('*, author:profiles!testimonials_author_id_fkey(id,username,display_name,avatar_url)')
        .eq('recipient_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setPendingTests((tests as any[]) ?? [])

      // Pending friend requests
      const { data: friends } = await supabase
        .from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(id,username,display_name,avatar_url)')
        .eq('addressee_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setPendingFriends(friends ?? [])

      setLoading(false)
    }

    load()

    // Realtime: new scraps
    const channel = supabase
      .channel(`scraps:dashboard:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'scraps',
        filter: `recipient_id=eq.${user.id}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('scraps')
          .select('*, author:profiles!scraps_author_id_fkey(id,username,display_name,avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) setRecentScraps((prev) => [data, ...prev.slice(0, 9)])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, supabase])

  if (loading) return <DashboardSkeleton />

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Hero greeting */}
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <Avatar
              src={profile?.avatar_url}
              displayName={profile?.display_name}
              username={profile?.username}
              size="2xl"
            />
            <div>
              <h1 className={styles.heroGreeting}>
                Hey, {profile?.display_name?.split(' ')[0] ?? profile?.username} 👋
              </h1>
              <p className={styles.heroSub}>
                {format(new Date(), "EEEE, MMMM d")} · Your memory wall awaits
              </p>
            </div>
          </div>
          <div className={styles.heroActions}>
            <Link href={`/${profile?.username}`}>
              <Button variant="secondary" icon={<BookOpen size={16} />}>My Profile</Button>
            </Link>
            <Link href="/friends">
              <Button variant="primary" icon={<Users size={16} />}>Find Friends</Button>
            </Link>
          </div>
        </section>

        <div className={styles.grid}>
          {/* Left column */}
          <div className={styles.mainCol}>

            {/* On This Day */}
            {onThisDay.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Sparkles size={18} className={styles.sectionIcon} style={{ color: 'var(--color-warning)' }} />
                  <h2 className={styles.sectionTitle}>On This Day</h2>
                </div>
                <div className={styles.onThisDay}>
                  {onThisDay.map((scrap) => (
                    <div key={scrap.id} className={styles.otdCard}>
                      <div className={styles.otdYear}>
                        <Clock size={12} />
                        <span>{scrap.years_ago} year{scrap.years_ago !== 1 ? 's' : ''} ago</span>
                      </div>
                      <p className={styles.otdContent}>{scrap.content}</p>
                      <p className={styles.otdAuthor}>
                        from{' '}
                        <Link href={`/${scrap.author_display_name}`} className={styles.link}>
                          {scrap.author_display_name}
                        </Link>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Scraps */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Send size={18} className={styles.sectionIcon} style={{ color: 'var(--color-secondary)' }} />
                <h2 className={styles.sectionTitle}>Recent Scraps</h2>
              </div>
              {recentScraps.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No scraps yet! Share your profile link with friends to get started.</p>
                  <Link href={`/${profile?.username}`}>
                    <Button variant="outline" size="sm">View my profile</Button>
                  </Link>
                </div>
              ) : (
                <div className={styles.scrapList}>
                  {recentScraps.map((scrap) => (
                    <div key={scrap.id} className={styles.scrapItem}>
                      <Link href={`/${scrap.author?.username}`}>
                        <Avatar
                          src={scrap.author?.avatar_url}
                          displayName={scrap.author?.display_name}
                          username={scrap.author?.username}
                          size="sm"
                        />
                      </Link>
                      <div className={styles.scrapContent}>
                        <div className={styles.scrapMeta}>
                          <Link href={`/${scrap.author?.username}`} className={styles.link}>
                            {scrap.author?.display_name ?? scrap.author?.username}
                          </Link>
                          <span className={styles.dot}>·</span>
                          <span className={styles.time}>
                            {formatDistanceToNow(new Date(scrap.created_at), { addSuffix: true })}
                          </span>
                          <span className={[styles.typeBadge, styles[`type_${scrap.type}`]].join(' ')}>
                            {scrap.type}
                          </span>
                        </div>
                        {scrap.content && <p className={styles.scrapText}>{scrap.content}</p>}
                        {scrap.media_url && scrap.type === 'image' && (
                          <img src={scrap.media_url} alt="scrap" className={styles.scrapImage} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right sidebar */}
          <aside className={styles.sidebar}>

            {/* Pending testimonials */}
            {pendingTests.length > 0 && (
              <div className={styles.sideCard}>
                <div className={styles.sideCardHeader}>
                  <Bell size={16} />
                  <h3>Pending Testimonials</h3>
                  <span className={styles.countBadge}>{pendingTests.length}</span>
                </div>
                {pendingTests.slice(0, 3).map((t: any) => (
                  <div key={t.id} className={styles.pendingItem}>
                    <Avatar
                      src={t.author?.avatar_url}
                      displayName={t.author?.display_name}
                      username={t.author?.username}
                      size="xs"
                    />
                    <div className={styles.pendingContent}>
                      <p className={styles.pendingName}>
                        {t.author?.display_name ?? t.author?.username}
                      </p>
                      <p className={styles.pendingPrev}>{t.content.slice(0, 60)}…</p>
                    </div>
                  </div>
                ))}
                <Link href="/testimonials">
                  <Button variant="ghost" size="sm" fullWidth>Review all →</Button>
                </Link>
              </div>
            )}

            {/* Pending friend requests */}
            {pendingFriends.length > 0 && (
              <div className={styles.sideCard}>
                <div className={styles.sideCardHeader}>
                  <Users size={16} />
                  <h3>Friend Requests</h3>
                  <span className={styles.countBadge}>{pendingFriends.length}</span>
                </div>
                {pendingFriends.slice(0, 3).map((f: any) => (
                  <div key={f.id} className={styles.pendingItem}>
                    <Avatar
                      src={f.requester?.avatar_url}
                      displayName={f.requester?.display_name}
                      username={f.requester?.username}
                      size="xs"
                    />
                    <div className={styles.pendingContent}>
                      <p className={styles.pendingName}>
                        {f.requester?.display_name ?? f.requester?.username}
                      </p>
                      <p className={styles.pendingPrev}>@{f.requester?.username}</p>
                    </div>
                  </div>
                ))}
                <Link href="/friends">
                  <Button variant="ghost" size="sm" fullWidth>Manage requests →</Button>
                </Link>
              </div>
            )}

            {/* Quick links */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}><h3>Quick Links</h3></div>
              <div className={styles.quickLinks}>
                {[
                  { href: `/testimonials`,  label: 'My Testimonials', icon: '✍️' },
                  { href: `/communities`,   label: 'Communities',     icon: '🏡' },
                  { href: `/friends`,       label: 'Friends',         icon: '👫' },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className={styles.quickLink}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.hero} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 112, height: 112, borderRadius: '50%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="skeleton" style={{ width: 200, height: 28 }} />
              <div className="skeleton" style={{ width: 140, height: 16 }} />
            </div>
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: '1rem', borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  )
}
