'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import styles from './communities.module.css'

export default function CommunitiesPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [communities, setCommunities] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('communities')
        .select('*, creator:profiles!communities_creator_id_fkey(id,username,display_name,avatar_url)')
        .order('created_at', { ascending: false })
        .limit(30)
      setCommunities(data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Communities</h1>
            <p className={styles.sub}>Find your people</p>
          </div>
          {user && (
            <Link href="/communities/new">
              <Button variant="primary" icon={<Plus size={16} />}>Create</Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className={styles.grid}>
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className={styles.empty}>
            <Users size={48} style={{ opacity: 0.3 }} />
            <p>No communities yet. Be the first to create one!</p>
            {user && <Link href="/communities/new"><Button variant="primary">Create a Community</Button></Link>}
          </div>
        ) : (
          <div className={styles.grid}>
            {communities.map((c) => (
              <Link key={c.id} href={`/communities/${c.id}`} className={styles.card}>
                {c.banner_url ? (
                  <img src={c.banner_url} alt={c.name} className={styles.cardBanner} />
                ) : (
                  <div className={styles.cardBannerPlaceholder} />
                )}
                <div className={styles.cardBody}>
                  <h2 className={styles.cardName}>{c.name}</h2>
                  {c.description && <p className={styles.cardDesc}>{c.description.slice(0,90)}{c.description.length > 90 ? '…' : ''}</p>}
                  <div className={styles.cardFooter}>
                    <Avatar src={c.creator?.avatar_url} displayName={c.creator?.display_name} username={c.creator?.username} size="xs" />
                    <span className={styles.cardCreator}>by {c.creator?.display_name ?? c.creator?.username}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
