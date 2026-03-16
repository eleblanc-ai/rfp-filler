import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../shared/config/supabase'
import { AuthContext } from './auth-context'

const ALLOWED_DOMAIN = 'thinkcerca.com'

function isAllowedDomain(email: string | undefined): boolean {
  if (!email) return false
  return email.endsWith(`@${ALLOWED_DOMAIN}`)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession && !isAllowedDomain(newSession.user.email)) {
          await supabase.auth.signOut()
          setSession(null)
        } else {
          setSession(newSession)
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
      },
    })
    if (error) {
      console.error('OAuth sign-in error:', error.message)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
