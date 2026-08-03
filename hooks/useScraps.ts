'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScrapWithAuthor } from '@/types/app'

const PAGE_SIZE = 20

export function useScraps(recipientId: string, realtimeEnabled = false) {
  const supabase  = createClient()
  const [scraps,  setScraps]  = useState<ScrapWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore,  setHasMore]  = useState(true)
  const pageRef = useRef(0)

  const fetchPage = useCallback(async (page: number) => {
    const from = page * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from('scraps')
      .select(`
        *,
        author:profiles!scraps_author_id_fkey(id, username, display_name, avatar_url),
        reactions(*)
      `)
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return

    const rows = (data ?? []) as any[]
    const enriched: ScrapWithAuthor[] = rows.map((s) => ({
      ...s,
      author: Array.isArray(s.author) ? s.author[0] : s.author,
      reactions: groupReactions(s.reactions ?? [], null),
    }))

    if (page === 0) {
      setScraps(enriched)
    } else {
      setScraps((prev) => [...prev, ...enriched])
    }
    setHasMore(enriched.length === PAGE_SIZE)
    setLoading(false)
  }, [recipientId, supabase])

  const loadMore = useCallback(() => {
    pageRef.current += 1
    fetchPage(pageRef.current)
  }, [fetchPage])

  useEffect(() => {
    pageRef.current = 0
    setLoading(true)
    fetchPage(0)
  }, [recipientId, fetchPage])

  // Realtime: prepend new scraps
  useEffect(() => {
    if (!realtimeEnabled) return

    const channel = supabase
      .channel(`scraps:${recipientId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'scraps',
          filter: `recipient_id=eq.${recipientId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('scraps')
            .select(`
              *,
              author:profiles!scraps_author_id_fkey(id, username, display_name, avatar_url),
              reactions(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            const row = data as any
            const enriched: ScrapWithAuthor = {
              ...row,
              author: Array.isArray(row.author) ? row.author[0] : row.author,
              reactions: [],
            }
            setScraps((prev) => [enriched, ...prev])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [recipientId, realtimeEnabled, supabase])

  return { scraps, loading, hasMore, loadMore }
}

function groupReactions(
  reactions: { vibe: string; user_id: string }[],
  currentUserId: string | null
) {
  const vibes = ['funny', 'wholesome', 'unhinged', 'iconic'] as const
  return vibes.map((vibe) => ({
    vibe,
    count: reactions.filter((r) => r.vibe === vibe).length,
    userReacted: reactions.some((r) => r.vibe === vibe && r.user_id === currentUserId),
  }))
}
