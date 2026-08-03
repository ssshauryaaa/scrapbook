'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Volume2, Video, Image as ImageIcon, FileImage } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useReactions } from '@/hooks/useReactions'
import type { ScrapWithAuthor } from '@/types/app'
import type { VibeType } from '@/types/database'
import styles from './ScrapCard.module.css'

interface Props {
  scrap: ScrapWithAuthor
  currentUserId?: string | null
}

const vibeEmoji: Record<VibeType, string> = {
  funny:     '😂',
  wholesome: '🥰',
  unhinged:  '💀',
  iconic:    '🔥',
}

const vibeLabel: Record<VibeType, string> = {
  funny:     'Funny',
  wholesome: 'Wholesome',
  unhinged:  'Unhinged',
  iconic:    'Iconic',
}

export function ScrapCard({ scrap, currentUserId }: Props) {
  const { reactions, toggle } = useReactions('scrap', scrap.id, scrap.reactions ?? [])

  return (
    <article className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <Link href={`/${scrap.author?.username}`} className={styles.authorLink}>
          <Avatar
            src={scrap.author?.avatar_url}
            displayName={scrap.author?.display_name}
            username={scrap.author?.username}
            size="sm"
          />
          <div>
            <p className={styles.authorName}>
              {scrap.author?.display_name ?? scrap.author?.username}
            </p>
            <p className={styles.time}>
              {formatDistanceToNow(new Date(scrap.created_at), { addSuffix: true })}
            </p>
          </div>
        </Link>
        <span className={[styles.typePill, styles[`type_${scrap.type}`]].join(' ')}>
          {scrap.type === 'image' && <ImageIcon size={12} />}
          {scrap.type === 'voice' && <Volume2 size={12} />}
          {scrap.type === 'video' && <Video size={12} />}
          {scrap.type === 'gif'   && <FileImage size={12} />}
          {scrap.type}
        </span>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Text */}
        {scrap.content && <p className={styles.text}>{scrap.content}</p>}

        {/* Image */}
        {scrap.type === 'image' && scrap.media_url && (
          <img src={scrap.media_url} alt="scrap image" className={styles.media} loading="lazy" />
        )}

        {/* GIF */}
        {scrap.type === 'gif' && scrap.media_url && (
          <img src={scrap.media_url} alt="GIF scrap" className={styles.media} loading="lazy" />
        )}

        {/* Voice */}
        {scrap.type === 'voice' && scrap.media_url && (
          <div className={styles.voiceWrap}>
            <Volume2 size={20} className={styles.voiceIcon} />
            <audio controls src={scrap.media_url} className={styles.audio} />
          </div>
        )}

        {/* Video */}
        {scrap.type === 'video' && scrap.media_url && (
          <video
            src={scrap.media_url}
            controls
            className={styles.video}
            preload="metadata"
          />
        )}

        {/* Transcript */}
        {scrap.transcript && (
          <details className={styles.transcript}>
            <summary className={styles.transcriptToggle}>Show transcript</summary>
            <p className={styles.transcriptText}>{scrap.transcript}</p>
          </details>
        )}
      </div>

      {/* Vibes / Reactions */}
      <div className={styles.vibes}>
        {reactions.map((r) => (
          <button
            key={r.vibe}
            className={[styles.vibeBtn, r.userReacted ? styles.vibeBtnActive : ''].join(' ')}
            onClick={() => currentUserId && toggle(r.vibe as VibeType)}
            disabled={!currentUserId}
            aria-label={`${vibeLabel[r.vibe as VibeType]} reaction${r.count > 0 ? ` (${r.count})` : ''}`}
            aria-pressed={r.userReacted}
            title={vibeLabel[r.vibe as VibeType]}
          >
            <span>{vibeEmoji[r.vibe as VibeType]}</span>
            {r.count > 0 && <span className={styles.vibeCount}>{r.count}</span>}
          </button>
        ))}
      </div>
    </article>
  )
}
