import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Capture provider_token from the URL hash before Supabase consumes it.
// With implicit flow, Google's access token arrives in the hash fragment
// but Supabase strips it during createClient initialization and does not
// persist it in its internal session storage.
const PROVIDER_TOKEN_KEY = 'google_provider_token'
const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
if (hash) {
  const params = new URLSearchParams(hash)
  const pt = params.get('provider_token')
  if (pt) {
    sessionStorage.setItem(PROVIDER_TOKEN_KEY, pt)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
})
