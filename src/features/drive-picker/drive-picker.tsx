import { useEffect, useState } from 'react'
import { useDriveFiles, type DriveFile } from './use-drive-files'

interface DrivePickerProps {
  providerToken: string | null
  onSelect: (file: DriveFile) => void
  onReconnect: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function DrivePicker({ providerToken, onSelect, onReconnect }: DrivePickerProps) {
  const { files, loading, error, fetchFiles } = useDriveFiles(providerToken)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen && providerToken) {
      fetchFiles()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(file: DriveFile) {
    onSelect(file)
    setIsOpen(false)
  }

  if (!providerToken) {
    return (
      <div className="text-center">
        <p className="text-text-secondary">
          Google Drive access has expired.
        </p>
        <button
          type="button"
          onClick={onReconnect}
          className="mt-3 text-sm font-medium text-primary-dark hover:underline"
        >
          Reconnect Google Drive
        </button>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-surface-secondary"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15.09 3.18L22.36 15.55L19.36 20.82H12.18L15.09 15.55L11.55 9.36L15.09 3.18Z" fill="#0066DA" />
          <path d="M8.91 3.18L15.09 3.18L8.45 15.55H2.27L5.27 10.27L8.91 3.18Z" fill="#00AC47" />
          <path d="M2.27 15.55L5.27 10.27L11.55 10.27L8.45 15.55L5.36 20.82L2.27 15.55Z" fill="#FFBA00" />
        </svg>
        Select RFP Template from Drive
      </button>
    )
  }

  return (
    <div className="w-full max-w-lg rounded-lg border border-border bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Select a Google Doc
        </h2>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading && (
          <p className="px-4 py-8 text-center text-sm text-text-secondary">
            Loading files...
          </p>
        )}

        {error && (
          <p className="px-4 py-8 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && files.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-secondary">
            No Google Docs found in your Drive.
          </p>
        )}

        {!loading && !error && files.length > 0 && (
          <ul>
            {files.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(file)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-secondary"
                >
                  <span className="truncate text-sm text-text-primary">
                    {file.name}
                  </span>
                  <span className="ml-4 shrink-0 text-xs text-text-secondary">
                    {formatDate(file.modifiedTime)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
