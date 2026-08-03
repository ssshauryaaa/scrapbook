'use client'

import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Bell, MessageSquare, Heart, UserPlus, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { Button } from '@/components/ui/Button'
import type { Notification, NotificationType } from '@/types/database'
import styles from './NotificationFeed.module.css'

interface Props {
  onClose?: () => void
}

function getIcon(type: NotificationType) {
  switch (type) {
    case 'new_scrap':              return <MessageSquare size={16} />
    case 'testimonial_request':
    case 'testimonial_submitted':  return <Heart size={16} />
    case 'testimonial_approved':   return <CheckCheck size={16} />
    case 'friend_request':         return <UserPlus size={16} />
    default:                       return <Bell size={16} />
  }
}

function getLabel(type: NotificationType) {
  switch (type) {
    case 'new_scrap':              return 'New scrap'
    case 'testimonial_request':    return 'Testimonial request'
    case 'testimonial_submitted':  return 'New testimonial'
    case 'testimonial_approved':   return 'Testimonial approved'
    case 'friend_request':         return 'Friend request'
    default:                       return 'Notification'
  }
}

function getLink(n: Notification): string {
  const p = n.payload as Record<string, string>
  switch (n.type) {
    case 'new_scrap':             return `/dashboard`
    case 'testimonial_request':
    case 'testimonial_submitted': return `/testimonials`
    case 'testimonial_approved':  return `/testimonials`
    case 'friend_request':        return `/friends`
    default:                      return `/dashboard`
  }
}

export function NotificationFeed({ onClose }: Props) {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Notifications</h3>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      <div className={styles.list}>
        {notifications.length === 0 && (
          <div className={styles.empty}>
            <Bell size={32} className={styles.emptyIcon} />
            <p>You&apos;re all caught up!</p>
          </div>
        )}
        {notifications.map((n) => (
          <Link
            key={n.id}
            href={getLink(n)}
            className={[styles.item, !n.read ? styles.unread : ''].join(' ')}
            onClick={() => { markRead(n.id); onClose?.() }}
          >
            <span className={[styles.iconWrap, styles[n.type]].join(' ')}>
              {getIcon(n.type as NotificationType)}
            </span>
            <div className={styles.content}>
              <p className={styles.label}>{getLabel(n.type as NotificationType)}</p>
              <p className={styles.time}>
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
            {!n.read && <span className={styles.dot} aria-label="Unread" />}
          </Link>
        ))}
      </div>
    </div>
  )
}
