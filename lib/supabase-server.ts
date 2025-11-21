import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

/**
 * Create a Supabase client on the server with a user's access token
 * This allows RLS policies to work correctly by authenticating the request
 */
export function createServerSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // Create client with custom fetch that adds the Authorization header
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url, options = {}) => {
        const headers = new Headers(options.headers || {})
        headers.set('Authorization', `Bearer ${accessToken}`)
        return fetch(url, {
          ...options,
          headers,
        })
      },
    },
  })

  return client
}
