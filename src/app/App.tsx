import { useState } from 'react'
import { AuthProvider } from '../features/auth/auth-provider'
import { useAuth } from '../features/auth/auth-context'
import { LoginPage } from '../features/auth/login-page'
import { DrivePicker } from '../features/drive-picker/drive-picker'
import type { DriveFile } from '../features/drive-picker/use-drive-files'

function AppContent() {
  const { user, loading, providerToken, signInWithGoogle, signOut } = useAuth()
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)

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
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        {selectedFile ? (
          <div className="text-center">
            <p className="text-sm text-text-secondary">Selected template:</p>
            <p className="mt-1 text-lg font-medium text-text-primary">
              {selectedFile.name}
            </p>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="mt-4 text-sm font-medium text-primary-dark hover:underline"
            >
              Choose a different template
            </button>
          </div>
        ) : (
          <DrivePicker
            providerToken={providerToken}
            onSelect={setSelectedFile}
            onReconnect={signInWithGoogle}
          />
        )}
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
