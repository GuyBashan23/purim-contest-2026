import { createBrowserClient } from '@supabase/ssr'

export function createClientSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase environment variables!')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    throw new Error(
      'Missing Supabase configuration. Please check your environment variables in Vercel Dashboard → Settings → Environment Variables'
    )
  }

  return createBrowserClient(url, key)
}

// For use in client components - singleton instance
export const supabase = createClientSupabase()
