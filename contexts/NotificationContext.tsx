'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import type { Notification } from '@/types/database'

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount:   number
  markAllRead:   () => Promise<void>
  markRead:      (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount:   0,
  markAllRead:   async () => {},
  markRead:      async () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data as Notification[]) ?? [])
  }, [user, supabase])

  useEffect(() => {
    if (!user) { setNotifications([]); return }

    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, supabase, fetchNotifications])

  const markRead = useCallback(async (id: string) => {
    await (supabase.from('notifications') as any).update({ read: true }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [supabase])

  const markAllRead = useCallback(async () => {
    if (!user) return
    await (supabase.from('notifications') as any)
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [user, supabase])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
