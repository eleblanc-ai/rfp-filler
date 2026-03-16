import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../shared/config/supabase'
import { AuthContext } from './auth-context'

const ALLOWED_DOMAIN = 'thinkcerca.com'
const PROVIDER_TOKEN_KEY = 'google_provider_token'

function isAllowedDomain(email: string | undefined): boolean {
  if (!email) return false
  return email.endsWith(`@${ALLOWED_DOMAIN}`)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [providerToken, setProviderToken] = useState<string | null>(
    () => sessionStorage.getItem(PROVIDER_TOKEN_KEY),
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession && !isAllowedDomain(newSession.user.email)) {
          await supabase.auth.signOut()
          setSession(null)
        } else {
          setSession(newSession)
          if (newSession?.provider_token) {
            setProviderToken(newSession.provider_token)
            sessionStorage.setItem(PROVIDER_TOKEN_KEY, newSession.provider_token)
          }
        }
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { hd: ALLOWED_DOMAIN },
        scopes: 'https://www.googleapis.com/auth/drive.readonly',
      },
    })
    if (error) {
      console.error('OAuth sign-in error:', error.message)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProviderToken(null)
    sessionStorage.removeItem(PROVIDER_TOKEN_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        providerToken,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
