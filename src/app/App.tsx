import { AuthProvider } from '../features/auth/auth-provider'
import { useAuth } from '../features/auth/auth-context'
import { LoginPage } from '../features/auth/login-page'

function AppContent() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">RFP Filler</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">{user.email}</span>
          <button
            type="button"
            onClick={signOut}
            className="text-sm font-medium text-primary-dark hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <p className="text-text-secondary">
          Welcome! Select an RFP template from Google Drive to get started.
        </p>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
