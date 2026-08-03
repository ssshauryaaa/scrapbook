'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, UserCheck, UserPlus, UserX, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import styles from './friends.module.css'

export default function FriendsPage() {
  const supabase = createClient()
  const { user, profile } = useAuth()

  const [tab,       setTab]       = useState<'friends' | 'requests' | 'find'>('friends')
  const [search,    setSearch]    = useState('')
  const [friends,   setFriends]   = useState<any[]>([])
  const [requests,  setRequests]  = useState<any[]>([])
  const [results,   setResults]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(false)
  const [acting,    setActing]    = useState<string | null>(null)

  const loadFriends = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('friendships')
      .select(`
        id, status, requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id,username,display_name,avatar_url),
        addressee:profiles!friendships_addressee_id_fkey(id,username,display_name,avatar_url)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    const enriched = (data ?? []).map((f: any) => ({
      ...f,
      other: f.requester_id === user.id ? f.addressee : f.requester,
    }))
    setFriends(enriched)
  }, [user, supabase])

  const loadRequests = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('friendships')
      .select(`
        id, status, created_at,
        requester:profiles!friendships_requester_id_fkey(id,username,display_name,avatar_url)
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(data ?? [])
  }, [user, supabase])

  useEffect(() => {
    loadFriends()
    loadRequests()
  }, [loadFriends, loadRequests])

  const searchUsers = useCallback(async () => {
    if (!search.trim() || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,bio')
      .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
      .neq('id', user.id)
      .limit(20)
    setResults(data ?? [])
    setLoading(false)
  }, [search, user, supabase])

  useEffect(() => {
    const t = setTimeout(searchUsers, 400)
    return () => clearTimeout(t)
  }, [searchUsers])

  const accept = async (friendshipId: string) => {
    setActing(friendshipId)
    await (supabase.from('friendships') as any).update({ status: 'accepted' }).eq('id', friendshipId)
    toast.success('Friend accepted!')
    await Promise.all([loadFriends(), loadRequests()])
    setActing(null)
  }

  const decline = async (friendshipId: string) => {
    setActing(friendshipId)
    await (supabase.from('friendships') as any).update({ status: 'declined' }).eq('id', friendshipId)
    setRequests((r) => r.filter((x) => x.id !== friendshipId))
    setActing(null)
  }

  const sendRequest = async (targetId: string) => {
    if (!user) return
    setActing(targetId)
    await (supabase.from('friendships') as any).insert({ requester_id: user.id, addressee_id: targetId, status: 'pending' })
    toast.success('Friend request sent!')
    setResults((r) => r.map((u) => u.id === targetId ? { ...u, requestSent: true } : u))
    setActing(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Friends</h1>

        <div className={styles.tabs} role="tablist">
          {[
            { key: 'friends',  label: `Friends (${friends.length})` },
            { key: 'requests', label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}` },
            { key: 'find',     label: 'Find People' },
          ].map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={[styles.tab, tab === t.key ? styles.tabActive : ''].join(' ')}
              onClick={() => setTab(t.key as typeof tab)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Friends list */}
        {tab === 'friends' && (
          <div className={styles.grid}>
            {friends.length === 0 ? (
              <div className={styles.empty}>
                <p>No friends yet — find people to connect with!</p>
                <Button variant="primary" size="sm" onClick={() => setTab('find')}>Find people</Button>
              </div>
            ) : friends.map((f) => (
              <UserCard key={f.id} user={f.other} action={
                <Button variant="secondary" size="sm" icon={<UserCheck size={15} />}>Friends</Button>
              } />
            ))}
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className={styles.list}>
            {requests.length === 0 ? (
              <div className={styles.empty}><p>No pending requests</p></div>
            ) : requests.map((r) => (
              <div key={r.id} className={styles.requestItem}>
                <Link href={`/${r.requester?.username}`} className={styles.requestUser}>
                  <Avatar src={r.requester?.avatar_url} displayName={r.requester?.display_name} username={r.requester?.username} size="md" />
                  <div>
                    <p className={styles.requestName}>{r.requester?.display_name ?? r.requester?.username}</p>
                    <p className={styles.requestHandle}>@{r.requester?.username}</p>
                  </div>
                </Link>
                <div className={styles.requestActions}>
                  <Button variant="primary"  size="sm" loading={acting === r.id} onClick={() => accept(r.id)}>Accept</Button>
                  <Button variant="danger"   size="sm" loading={acting === r.id} onClick={() => decline(r.id)}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Find */}
        {tab === 'find' && (
          <div className={styles.findSection}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search by name or username…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search users"
              />
            </div>
            {loading && <div className={styles.empty}><p>Searching…</p></div>}
            <div className={styles.grid}>
              {results.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  action={
                    u.requestSent ? (
                      <Button variant="secondary" size="sm" icon={<Clock size={15} />} disabled>Sent</Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<UserPlus size={15} />}
                        loading={acting === u.id}
                        onClick={() => sendRequest(u.id)}
                      >
                        Add
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UserCard({ user: u, action }: { user: any; action: React.ReactNode }) {
  return (
    <div className={styles.userCard}>
      <Link href={`/${u.username}`} className={styles.userCardLink}>
        <Avatar src={u.avatar_url} displayName={u.display_name} username={u.username} size="lg" />
        <div>
          <p className={styles.userName}>{u.display_name ?? u.username}</p>
          <p className={styles.userHandle}>@{u.username}</p>
          {u.bio && <p className={styles.userBio}>{u.bio.slice(0, 60)}{u.bio.length > 60 ? '…' : ''}</p>}
        </div>
      </Link>
      <div className={styles.userAction}>{action}</div>
    </div>
  )
}
