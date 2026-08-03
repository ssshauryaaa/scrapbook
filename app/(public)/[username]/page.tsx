'use client'

import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { UserPlus, UserCheck, Clock, Send, BookOpen, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useScraps } from '@/hooks/useScraps'
import { useFriendship } from '@/hooks/useFriendship'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ScrapCard } from '@/components/scraps/ScrapCard'
import { ScrapComposer } from '@/components/scraps/ScrapComposer'
import { TestimonialCard } from '@/components/testimonials/TestimonialCard'
import { TestimonialComposer } from '@/components/testimonials/TestimonialComposer'
import type { MutualVisitor, Testimonial } from '@/types/database'
import styles from './profile.module.css'

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const [username, setUsername] = useState('')
  const supabase = createClient()
  const { user, profile: myProfile } = useAuth()

  const { profile, loading: profileLoading } = useProfile(username)
  const { scraps, loading: scrapsLoading, loadMore, hasMore } = useScraps(
    profile?.id ?? '',
    true
  )
  const friendship = useFriendship(profile?.id ?? '')

  const [testimonials,  setTestimonials]  = useState<any[]>([])
  const [visitors,      setVisitors]      = useState<MutualVisitor[]>([])
  const [friends,       setFriends]       = useState<any[]>([])
  const [showScrap,     setShowScrap]     = useState(false)
  const [showTestimonial,setShowTestimonial]=useState(false)

  // Resolve params
  useEffect(() => {
    params.then(({ username }) => setUsername(username))
  }, [params])

  // Load profile visit, testimonials, visitors, friends
  useEffect(() => {
    if (!profile) return

    // Log visit (server-side, no-op if own profile)
    if (user && user.id !== profile.id) {
      (supabase.rpc as any)('log_profile_visit', { visited_id: profile.id })
    }

    // Approved testimonials
    supabase
      .from('testimonials')
      .select('*, author:profiles!testimonials_author_id_fkey(id,username,display_name,avatar_url), reactions(*)')
      .eq('recipient_id', profile.id)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setTestimonials(data ?? []))

    // Friends
    supabase
      .from('friendships')
      .select(`
        status,
        friend:profiles!friendships_addressee_id_fkey(id,username,display_name,avatar_url)
      `)
      .eq('requester_id', profile.id)
      .eq('status', 'accepted')
      .limit(6)
      .then(({ data }) => setFriends((data ?? []).map((f: any) => f.friend)))

    // Mutual visitors (only if user is viewing own profile and opted in)
    if (user?.id === profile.id && profile.visitor_log_opt_in) {
      (supabase.rpc as any)('get_mutual_visitors', { user_id: profile.id })
        .then(({ data }: any) => setVisitors((data as MutualVisitor[]) ?? []))
    }
  }, [profile, user, supabase])

  if (!username) return null
  if (profileLoading) return <ProfileSkeleton />
  if (!profile) return notFound()

  const isOwner     = user?.id === profile.id
  const palette     = profile.theme?.palette
  const bannerUrl   = profile.theme?.banner_url

  return (
    <div
      className={styles.page}
      style={palette ? {
        '--profile-bg':        palette.background,
        '--profile-primary':   palette.primary,
        '--profile-secondary': palette.secondary,
        '--profile-accent':    palette.accent,
        '--profile-text':      palette.text,
      } as React.CSSProperties : {}}
    >
      {/* Banner */}
      <div className={styles.banner}>
        {bannerUrl ? (
          <Image src={bannerUrl} alt="Profile banner" fill style={{ objectFit: 'cover' }} priority />
        ) : (
          <div className={styles.bannerGradient} />
        )}
      </div>

      <div className={styles.container}>
        {/* Profile header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarWrap}>
            <Avatar
              src={profile.avatar_url}
              displayName={profile.display_name}
              username={profile.username}
              size="2xl"
            />
          </div>
          <div className={styles.profileInfo}>
            <h1 className={styles.displayName}>{profile.display_name ?? profile.username}</h1>
            <p className={styles.handle}>@{profile.username}</p>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          </div>
          <div className={styles.profileActions}>
            {isOwner ? (
              <Link href={`/${profile.username}/edit`}>
                <Button variant="secondary">Edit Profile</Button>
              </Link>
            ) : user ? (
              <>
                {/* Friend button */}
                {friendship.status === 'accepted' ? (
                  <Button variant="secondary" icon={<UserCheck size={16} />} onClick={friendship.remove}>
                    Friends
                  </Button>
                ) : friendship.status === 'pending' ? (
                  <Button variant="secondary" icon={<Clock size={16} />} disabled>
                    {friendship.isRequester ? 'Request sent' : 'Respond'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    icon={<UserPlus size={16} />}
                    onClick={friendship.sendRequest}
                    loading={friendship.acting}
                  >
                    Add Friend
                  </Button>
                )}
                {/* Send scrap */}
                <Button
                  variant="secondary"
                  icon={<Send size={16} />}
                  onClick={() => setShowScrap(true)}
                >
                  Send Scrap
                </Button>
                {/* Write testimonial */}
                <Button
                  variant="ghost"
                  icon={<BookOpen size={16} />}
                  onClick={() => setShowTestimonial(true)}
                >
                  Write Testimonial
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="primary">Sign in to interact</Button>
              </Link>
            )}
          </div>
        </div>

        <div className={styles.grid}>
          {/* Left: Scrap wall */}
          <div className={styles.mainCol}>
            <h2 className={styles.wallTitle}>Scrap Wall</h2>
            {scrapsLoading ? (
              <div className={styles.skeletonList}>
                {[1,2,3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
                ))}
              </div>
            ) : scraps.length === 0 ? (
              <div className={styles.empty}>
                <p>No scraps yet. Be the first!</p>
                {user && user.id !== profile.id && (
                  <Button variant="primary" size="sm" onClick={() => setShowScrap(true)}>
                    Send a scrap
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className={styles.scrapGrid}>
                  {scraps.map((s) => (
                    <ScrapCard key={s.id} scrap={s} currentUserId={user?.id} />
                  ))}
                </div>
                {hasMore && (
                  <Button variant="ghost" fullWidth onClick={loadMore} className={styles.loadMore}>
                    Load more scraps
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Right sidebar */}
          <aside className={styles.sidebar}>
            {/* Testimonials */}
            {testimonials.length > 0 && (
              <div className={styles.sideSection}>
                <h3 className={styles.sideTitle}>Testimonials</h3>
                <div className={styles.testimonialList}>
                  {testimonials.slice(0, 3).map((t: any) => (
                    <TestimonialCard key={t.id} testimonial={t} currentUserId={user?.id} />
                  ))}
                </div>
              </div>
            )}

            {/* Friends */}
            {friends.length > 0 && (
              <div className={styles.sideSection}>
                <h3 className={styles.sideTitle}>Friends</h3>
                <div className={styles.friendsGrid}>
                  {friends.map((f: any) => (
                    <Link key={f.id} href={`/${f.username}`} className={styles.friendChip}>
                      <Avatar src={f.avatar_url} displayName={f.display_name} username={f.username} size="sm" />
                      <span className={styles.friendName}>{f.display_name ?? f.username}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Mutual visitors (own profile, opted in) */}
            {isOwner && profile.visitor_log_opt_in && visitors.length > 0 && (
              <div className={styles.sideSection}>
                <h3 className={styles.sideTitle}>
                  <Eye size={14} /> Recent Visitors
                </h3>
                <div className={styles.visitorList}>
                  {visitors.slice(0, 5).map((v) => (
                    <Link key={v.visitor_id} href={`/${v.visitor_id}`} className={styles.visitorItem}>
                      <Avatar src={v.visitor_avatar_url} displayName={v.visitor_display_name} size="xs" />
                      <span>{v.visitor_display_name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Scrap Composer Modal */}
      <Modal open={showScrap} onClose={() => setShowScrap(false)} title="Send a Scrap" size="md">
        <ScrapComposer recipientId={profile.id} onScrapSent={() => setShowScrap(false)} />
      </Modal>

      {/* Testimonial Composer Modal */}
      <Modal open={showTestimonial} onClose={() => setShowTestimonial(false)} title="Write a Testimonial" size="lg">
        <TestimonialComposer
          recipientId={profile.id}
          recipientName={profile.display_name ?? profile.username}
          onDone={() => setShowTestimonial(false)}
        />
      </Modal>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div style={{ padding: '2rem' }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 0, marginBottom: '1rem' }} />
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', padding: '0 2rem' }}>
        <div className="skeleton" style={{ width: 112, height: 112, borderRadius: '50%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: 200, height: 28 }} />
          <div className="skeleton" style={{ width: 120, height: 16 }} />
        </div>
      </div>
    </div>
  )
}
