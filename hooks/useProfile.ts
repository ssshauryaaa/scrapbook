'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProfileWithTheme } from '@/types/app'

export function useProfile(username: string) {
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileWithTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('profiles')
      .select(`*, theme:themes(*)`)
      .eq('username', username)
      .single()

    if (err) {
      setError(err.message)
      setProfile(null)
    } else {
      setProfile(data as ProfileWithTheme)
    }
    setLoading(false)
  }, [username, supabase])

  useEffect(() => { fetch() }, [fetch])

  return { profile, loading, error, refetch: fetch }
}
