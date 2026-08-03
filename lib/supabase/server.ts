import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

const FALLBACK_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const FALLBACK_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
const FALLBACK_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    FALLBACK_URL,
    FALLBACK_ANON,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}

/** Service-role client for API routes that need elevated privileges */
export async function createServiceClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    FALLBACK_URL,
    FALLBACK_SERVICE,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
