import { useRef, useState } from 'react'
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
    recentDocuments,
    selectDocument,
    uploadFromComputer,
    removeRecentDocument,
    clearDocument,
    pendingSections,
    filling,
    fillStatus,
    identifySections,
    setPendingSections,
    cancelSections,
  } = useActiveDocument(providerToken, user?.id ?? null)
  const [page, setPage] = useState<Page>('main')
  const uploadRef = useRef<HTMLInputElement>(null)

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
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">RFP Buddy</h1>
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
          googleDocId={doc.googleDocId}
          loading={docLoading}
          error={docError}
          filling={filling}
          fillStatus={fillStatus}
          pendingSections={pendingSections}
          onBack={clearDocument}
          onAutoFill={identifySections}
          onCancelSections={cancelSections}
          onToggleItem={(sectionId, itemId) =>
            setPendingSections((prev) =>
              prev.map((s) =>
                s.id === sectionId
                  ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, selected: !i.selected } : i)) }
                  : s,
              ),
            )
          }
          onToggleSection={(sectionId) =>
            setPendingSections((prev) =>
              prev.map((s) => {
                if (s.id !== sectionId) return s
                const allSelected = s.items.every((i) => i.selected)
                return { ...s, items: s.items.map((i) => ({ ...i, selected: !allSelected })) }
              }),
            )
          }
          onToggleExpand={(sectionId) =>
            setPendingSections((prev) =>
              prev.map((s) =>
                s.id === sectionId ? { ...s, expanded: !s.expanded } : s,
              ),
            )
          }
          onEditItemPrompt={(sectionId, itemId, prompt) =>
            setPendingSections((prev) =>
              prev.map((s) =>
                s.id === sectionId
                  ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, prompt } : i)) }
                  : s,
              ),
            )
          }
        />
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
          <div className="flex items-center gap-3">
            <DrivePicker
              providerToken={providerToken}
              onSelect={(file) => selectDocument(file.id, file.name)}
              onReconnect={signInWithGoogle}
            />
            <span className="text-sm text-text-secondary">or</span>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm ring-1 ring-border hover:bg-surface-secondary"
            >
              Upload from Computer
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept=".txt,.html,.htm,.md,.docx"
              className="hidden"
              data-testid="upload-input"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  uploadFromComputer(file)
                  e.target.value = ''
                }
              }}
            />
          </div>
          {recentDocuments.length > 0 && (
            <div className="w-full max-w-xl">
              <h2 className="mb-3 text-sm font-medium text-text-secondary">
                Recent documents
              </h2>
              <ul className="divide-y divide-border rounded-lg border border-border bg-white">
                {recentDocuments.map((rd) => (
                  <li key={rd.google_doc_id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => selectDocument(rd.google_doc_id, rd.title)}
                      className="flex min-w-0 flex-1 items-center justify-between px-4 py-3 text-left text-sm text-text-primary hover:bg-surface-secondary"
                    >
                      <span className="truncate">{rd.title}</span>
                      <span className="ml-3 shrink-0 text-xs text-text-secondary">
                        {new Date(rd.updated_at).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecentDocument(rd.google_doc_id)}
                      className="px-3 py-3 text-sm text-text-secondary hover:text-red-600"
                      aria-label={`Remove ${rd.title}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
