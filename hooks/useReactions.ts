'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { VibeType } from '@/types/database'

interface ReactionSummary {
  vibe:        string
  count:       number
  userReacted: boolean
}

export function useReactions(
  targetType: 'scrap' | 'testimonial',
  targetId:   string,
  initialReactions: ReactionSummary[]
) {
  const supabase  = createClient()
  const { user }  = useAuth()
  const [reactions, setReactions] = useState<ReactionSummary[]>(
    initialReactions.length > 0
      ? initialReactions
      : (['funny', 'wholesome', 'unhinged', 'iconic'] as VibeType[]).map((v) => ({
          vibe: v, count: 0, userReacted: false,
        }))
  )

  const toggle = useCallback(async (vibe: VibeType) => {
    if (!user) return

    const current = reactions.find((r) => r.vibe === vibe)
    const isActive = current?.userReacted ?? false

    // Optimistic update
    setReactions((prev) =>
      prev.map((r) =>
        r.vibe === vibe
          ? { ...r, count: isActive ? r.count - 1 : r.count + 1, userReacted: !isActive }
          : r
      )
    )

    try {
      if (isActive) {
        // Remove reaction
        const query = supabase.from('reactions').delete().eq('user_id', user.id).eq('vibe', vibe)
        if (targetType === 'scrap') {
          await query.eq('scrap_id', targetId)
        } else {
          await query.eq('testimonial_id', targetId)
        }
      } else {
        // Insert reaction
        const payload: Record<string, string> = {
          user_id: user.id,
          vibe,
          [targetType === 'scrap' ? 'scrap_id' : 'testimonial_id']: targetId,
        }
        await (supabase.from('reactions') as any).insert(payload)
      }
    } catch {
      // Rollback on error
      setReactions((prev) =>
        prev.map((r) =>
          r.vibe === vibe
            ? { ...r, count: isActive ? r.count + 1 : r.count - 1, userReacted: isActive }
            : r
        )
      )
    }
  }, [reactions, user, targetId, targetType, supabase])

  return { reactions, toggle }
}
