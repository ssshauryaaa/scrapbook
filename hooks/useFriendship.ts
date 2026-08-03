'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

type FriendshipStatus = 'none' | 'pending' | 'accepted' | 'blocked'

interface FriendshipState {
  status:       FriendshipStatus
  isRequester:  boolean
  friendshipId: string | null
  acting:       boolean
  sendRequest:  () => Promise<void>
  remove:       () => Promise<void>
  accept:       () => Promise<void>
  decline:      () => Promise<void>
}

export function useFriendship(targetUserId: string): FriendshipState {
  const supabase       = createClient()
  const { user }       = useAuth()
  const [status,       setStatus]       = useState<FriendshipStatus>('none')
  const [isRequester,  setIsRequester]  = useState(false)
  const [friendshipId, setFriendshipId] = useState<string | null>(null)
  const [acting,       setActing]       = useState(false)

  // Load initial friendship state
  useEffect(() => {
    if (!user || !targetUserId || targetUserId === user.id) return

    supabase
      .from('friendships')
      .select('id, status, requester_id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { id: string; status: string; requester_id: string } | null
        if (!row) return
        setFriendshipId(row.id)
        setStatus(row.status as FriendshipStatus)
        setIsRequester(row.requester_id === user.id)
      })
  }, [user, targetUserId, supabase])

  const sendRequest = useCallback(async () => {
    if (!user) return
    setActing(true)
    const { data } = await (supabase.from('friendships') as any).insert({
      requester_id: user.id,
      addressee_id: targetUserId,
      status:       'pending',
    }).select().single()

    if (data) {
      setFriendshipId((data as any).id)
      setStatus('pending')
      setIsRequester(true)
    }
    setActing(false)
  }, [user, targetUserId, supabase])

  const remove = useCallback(async () => {
    if (!friendshipId) return
    setActing(true)
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setStatus('none')
    setFriendshipId(null)
    setActing(false)
  }, [friendshipId, supabase])

  const accept = useCallback(async () => {
    if (!friendshipId) return
    setActing(true)
    await (supabase.from('friendships') as any).update({ status: 'accepted' }).eq('id', friendshipId)
    setStatus('accepted')
    setActing(false)
  }, [friendshipId, supabase])

  const decline = useCallback(async () => {
    if (!friendshipId) return
    setActing(true)
    await (supabase.from('friendships') as any).update({ status: 'declined' }).eq('id', friendshipId)
    setStatus('none')
    setFriendshipId(null)
    setActing(false)
  }, [friendshipId, supabase])

  return { status, isRequester, friendshipId, acting, sendRequest, remove, accept, decline }
}
