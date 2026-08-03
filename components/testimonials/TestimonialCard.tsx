'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Sparkles } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useReactions } from '@/hooks/useReactions'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Toast'
import type { VibeType } from '@/types/database'
import styles from './TestimonialCard.module.css'

const vibeEmoji: Record<VibeType, string> = {
  funny: '😂', wholesome: '🥰', unhinged: '💀', iconic: '🔥',
}

interface Props {
  testimonial:   any
  currentUserId?: string | null
  showActions?:  boolean      // true = recipient inbox view
  onApproved?:  () => void
  onDeclined?:  () => void
}

export function TestimonialCard({
  testimonial,
  currentUserId,
  showActions = false,
  onApproved,
  onDeclined,
}: Props) {
  const supabase = createClient()
  const { reactions, toggle } = useReactions('testimonial', testimonial.id, testimonial.reactions ?? [])

  const approve = async () => {
    const { error } = await (supabase.rpc as any)('approve_testimonial', { testimonial_id: testimonial.id })
    if (error) { toast.error('Could not approve'); return }
    toast.success('Testimonial approved! ✨')
    onApproved?.()
  }

  const decline = async () => {
    const { error } = await (supabase.rpc as any)('decline_testimonial', { testimonial_id: testimonial.id })
    if (error) { toast.error('Could not decline'); return }
    onDeclined?.()
  }

  return (
    <article className={[styles.card, showActions ? styles.pendingCard : ''].join(' ')}>
      <div className={styles.header}>
        <Link href={`/${testimonial.author?.username}`} className={styles.authorLink}>
          <Avatar
            src={testimonial.author?.avatar_url}
            displayName={testimonial.author?.display_name}
            username={testimonial.author?.username}
            size="sm"
          />
          <div>
            <p className={styles.authorName}>{testimonial.author?.display_name ?? testimonial.author?.username}</p>
            <p className={styles.time}>{formatDistanceToNow(new Date(testimonial.created_at), { addSuffix: true })}</p>
          </div>
        </Link>
        {testimonial.ai_assisted && (
          <span className={styles.aiBadge} title="AI-assisted">
            <Sparkles size={12} /> AI
          </span>
        )}
      </div>

      <blockquote className={styles.content}>
        &ldquo;{testimonial.content}&rdquo;
      </blockquote>

      {/* Approve / Decline (inbox mode) */}
      {showActions && (
        <div className={styles.actions}>
          <Button variant="primary" size="sm" onClick={approve}>Approve</Button>
          <Button variant="danger"  size="sm" onClick={decline}>Decline</Button>
        </div>
      )}

      {/* Vibes (approved testimonials only) */}
      {!showActions && (
        <div className={styles.vibes}>
          {reactions.map((r) => (
            <button
              key={r.vibe}
              className={[styles.vibeBtn, r.userReacted ? styles.active : ''].join(' ')}
              onClick={() => currentUserId && toggle(r.vibe as VibeType)}
              disabled={!currentUserId}
              aria-pressed={r.userReacted}
            >
              {vibeEmoji[r.vibe as VibeType]}
              {r.count > 0 && <span className={styles.vibeCount}>{r.count}</span>}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}
