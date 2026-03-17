import { useRef, useState } from 'react'
import { useKbDocuments, type KbDocument } from './use-kb-documents'

interface KbPageProps {
  userId: string | null
  providerToken: string | null
  onBack: () => void
}

function StatusBadge({ status, chunkCount }: { status: KbDocument['status']; chunkCount: number }) {
  switch (status) {
    case 'indexing':
      return (
        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
          Indexing...
        </span>
      )
    case 'indexed':
      return (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
          Indexed ({chunkCount} chunks)
        </span>
      )
    case 'error':
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
          Error
        </span>
      )
    default:
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          Pending
        </span>
      )
  }
}

export function KbPage({ userId, providerToken, onBack }: KbPageProps) {
  const { documents, loading, error, addDocument, deleteDocument, indexDocument } =
    useKbDocuments(userId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const [driveFiles, setDriveFiles] = useState<
    { id: string; name: string }[]
  >([])
  const [driveLoading, setDriveLoading] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const text = await file.text()
      const doc = await addDocument({
        filename: file.name,
        source: 'upload',
        rawText: text,
        contentType: file.type || 'text/plain',
      })
      if (doc) {
        indexDocument(doc.id)
      }
    } catch {
      // error is set by hook
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleOpenDrivePicker() {
    if (!providerToken) return
    setShowDrivePicker(true)
    setDriveLoading(true)

    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?' +
          new URLSearchParams({
            q: "mimeType='application/vnd.google-apps.document'",
            fields: 'files(id,name)',
            orderBy: 'modifiedTime desc',
            pageSize: '20',
          }),
        { headers: { Authorization: `Bearer ${providerToken}` } },
      )

      if (!response.ok) throw new Error('Failed to list Drive files')

      const data = await response.json()
      setDriveFiles(data.files ?? [])
    } catch {
      setDriveFiles([])
    } finally {
      setDriveLoading(false)
    }
  }

  async function handleDriveImport(fileId: string, fileName: string) {
    if (!providerToken) return
    setImporting(fileId)

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${providerToken}` } },
      )

      if (!response.ok) throw new Error('Failed to export document')

      const text = await response.text()
      const doc = await addDocument({
        filename: fileName,
        source: 'drive',
        rawText: text,
        contentType: 'text/plain',
        googleDocId: fileId,
      })
      setShowDrivePicker(false)
      setDriveFiles([])
      if (doc) {
        indexDocument(doc.id)
      }
    } catch {
      // error is set by hook
    } finally {
      setImporting(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-text-secondary hover:text-text-primary"
          aria-label="Back to documents"
        >
          ←
        </button>
        <span className="flex-1 text-sm font-medium text-text-primary">
          Knowledge Base
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Upload area */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv"
            onChange={handleFileUpload}
            className="hidden"
            data-testid="file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
          <button
            type="button"
            onClick={handleOpenDrivePicker}
            disabled={!providerToken}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary disabled:opacity-50"
          >
            Import from Google Drive
          </button>
        </div>

        {/* Drive picker panel */}
        {showDrivePicker && (
          <div className="mb-6 rounded-md border border-border bg-surface-secondary p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                Select a Google Doc
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowDrivePicker(false)
                  setDriveFiles([])
                }}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Close
              </button>
            </div>
            {driveLoading ? (
              <p className="text-sm text-text-secondary">Loading files...</p>
            ) : driveFiles.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No Google Docs found
              </p>
            ) : (
              <ul className="space-y-1">
                {driveFiles.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={() => handleDriveImport(file.id, file.name)}
                      disabled={importing === file.id}
                      className="w-full rounded px-3 py-2 text-left text-sm text-text-primary hover:bg-primary-light disabled:opacity-50"
                    >
                      {importing === file.id ? 'Importing...' : file.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        {/* Document list */}
        {loading ? (
          <p className="text-sm text-text-secondary">Loading...</p>
        ) : documents.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-text-secondary">
              No documents in your knowledge base yet.
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Upload files or import from Google Drive to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {documents.map((doc: KbDocument) => (
              <li
                key={doc.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {doc.source === 'drive' ? 'Google Drive' : 'Uploaded'} ·{' '}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} chunkCount={doc.chunk_count} />
                </div>
                <div className="flex items-center gap-2">
                  {(doc.status === 'pending' || doc.status === 'error') && (
                    <button
                      type="button"
                      onClick={() => indexDocument(doc.id)}
                      className="text-sm text-primary-dark hover:underline"
                    >
                      {doc.status === 'error' ? 'Retry' : 'Index'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteDocument(doc.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
