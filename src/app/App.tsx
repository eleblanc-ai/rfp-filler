import { useState } from 'react'
import { AuthProvider } from '../features/auth/auth-provider'
import { useAuth } from '../features/auth/auth-context'
import { LoginPage } from '../features/auth/login-page'
import { DrivePicker } from '../features/drive-picker/drive-picker'
import { DocumentViewer } from '../features/document/document-viewer'
import { useActiveDocument } from '../features/document/use-active-document'
import { KbPage } from '../features/knowledge-base/kb-page'

type Page = 'main' | 'kb'

function AppContent() {
  const { user, loading, providerToken, signInWithGoogle, signOut } = useAuth()
  const {
    doc,
    content,
    loading: docLoading,
    error: docError,
    initialLoading,
    selectDocument,
    clearDocument,
  } = useActiveDocument(providerToken, user?.id ?? null)
  const [page, setPage] = useState<Page>('main')

  if (loading || initialLoading) {
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
          <button
            type="button"
            onClick={() => setPage(page === 'kb' ? 'main' : 'kb')}
            className="text-sm font-medium text-primary-dark hover:underline"
          >
            Knowledge Base
          </button>
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

      {page === 'kb' ? (
        <KbPage
          userId={user.id}
          providerToken={providerToken}
          onBack={() => setPage('main')}
        />
      ) : doc ? (
        <DocumentViewer
          content={content}
          title={doc.title}
          loading={docLoading}
          error={docError}
          onBack={clearDocument}
        />
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
          <DrivePicker
            providerToken={providerToken}
            onSelect={(file) => selectDocument(file.id, file.name)}
            onReconnect={signInWithGoogle}
          />
        </main>
      )}
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
