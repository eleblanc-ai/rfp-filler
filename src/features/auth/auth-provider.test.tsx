import { render, screen, act } from '@testing-library/react'
import { AuthProvider } from './auth-provider'
import { useAuth } from './auth-context'
import type { Session, User } from '@supabase/supabase-js'

type AuthCallback = (event: string, session: Session | null) => void

const mockSignInWithOAuth = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const mockSignOut = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const mockOnAuthStateChange = vi.hoisted(() => vi.fn())

vi.mock('../../shared/config/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  },
}))

function makeSession(email: string): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    user: {
      id: '123',
      email,
      aud: 'authenticated',
      created_at: '',
      app_metadata: {},
      user_metadata: {},
    } as User,
  }
}

function TestConsumer() {
  const { user, loading, providerToken } = useAuth()
  if (loading) return <div>loading</div>
  if (!user) return <div>signed-out</div>
  return <div>signed-in:{user.email}{providerToken && <span data-testid="provider-token">{providerToken}</span>}</div>
}

let capturedCallback: AuthCallback

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  mockOnAuthStateChange.mockImplementation((cb: AuthCallback) => {
    capturedCallback = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
})

describe('AuthProvider', () => {
  test('shows loading state initially', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  test('shows signed-out when no session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await act(async () => {
      capturedCallback('INITIAL_SESSION', null)
    })

    expect(screen.getByText('signed-out')).toBeInTheDocument()
  })

  test('shows signed-in for allowed domain', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await act(async () => {
      capturedCallback('SIGNED_IN', makeSession('user@thinkcerca.com'))
    })

    expect(screen.getByText('signed-in:user@thinkcerca.com')).toBeInTheDocument()
  })

  test('rejects non-thinkcerca.com emails and signs out', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await act(async () => {
      capturedCallback('SIGNED_IN', makeSession('user@gmail.com'))
    })

    expect(mockSignOut).toHaveBeenCalled()
    expect(screen.getByText('signed-out')).toBeInTheDocument()
  })

  test('useAuth throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider',
    )
    spy.mockRestore()
  })

  test('captures provider_token from SIGNED_IN session and persists to sessionStorage', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    const session = {
      ...makeSession('user@thinkcerca.com'),
      provider_token: 'google-access-token',
    }

    await act(async () => {
      capturedCallback('SIGNED_IN', session)
    })

    expect(screen.getByTestId('provider-token')).toHaveTextContent('google-access-token')
    expect(sessionStorage.getItem('google_provider_token')).toBe('google-access-token')
  })
})
