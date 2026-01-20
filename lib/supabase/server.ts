import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing required Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

// Service role client for admin operations (bypasses RLS)
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    const missing = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}. Please check your environment variables.`)
  }

  // Verify that we're using service role key (should start with eyJ and be very long)
  if (key.length < 200) {
    console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY seems too short. Make sure you are using the service_role key, not the anon key.')
  }

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Log that service role client is being used (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Service Role Client] Created with service role key (RLS bypassed)')
  }

  return client
}
