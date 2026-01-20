import { createBrowserClient } from '@supabase/ssr'

export function createClientSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// For use in client components - singleton instance
export const supabase = createClientSupabase()
